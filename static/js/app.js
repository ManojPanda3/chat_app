// app.js - Main chat application
let ws = null;
let token = localStorage.getItem('token');
let currentUser = JSON.parse(localStorage.getItem('user') || 'null');
let currentView = 'global'; // 'global' or user_id for DM

// Check auth on load
document.addEventListener('DOMContentLoaded', () => {
    if (!token || !currentUser) {
        window.location.href = '/static/login.html';
        return;
    }
    
    document.getElementById('currentUsername').textContent = currentUser.username;
    loadMessages();
    loadOnlineUsers();
    loadConversations();
    connectWebSocket();
    
    // Message form
    document.getElementById('messageForm').addEventListener('submit', sendMessage);
    
    // Auto-scroll on new messages
    const observer = new MutationObserver(autoScroll);
    observer.observe(document.getElementById('chatMessages'), { childList: true });
});

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/static/login.html';
}

function autoScroll() {
    const container = document.getElementById('chatMessages');
    container.scrollTop = container.scrollHeight;
}

// WebSocket
function connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(`${protocol}//${window.location.host}/ws?token=${token}`);
    
    ws.onopen = () => {
        console.log('[WS] Connected');
    };
    
    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleWSMessage(data);
    };
    
    ws.onclose = () => {
        console.log('[WS] Disconnected. Reconnecting...');
        setTimeout(connectWebSocket, 3000);
    };
    
    ws.onerror = (err) => {
        console.error('[WS] Error:', err);
    };
}

function handleWSMessage(data) {
    switch (data.type) {
        case 'message':
            appendMessage(data.data);
            if (data.data.receiver_id && data.data.receiver_id !== 'null') {
                loadConversations();
            }
            break;
        case 'system':
            appendSystemMessage(data.data);
            break;
        case 'error':
            console.error('[WS] Server error:', data.data);
            break;
    }
}

function sendMessage(e) {
    e.preventDefault();
    const input = document.getElementById('messageInput');
    const content = input.value.trim();
    if (!content || !ws || ws.readyState !== WebSocket.OPEN) return;
    
    const msg = {
        type: 'message',
        content: content,
        receiver_id: currentView === 'global' ? null : currentView,
    };
    
    ws.send(JSON.stringify(msg));
    input.value = '';
    setTimeout(loadConversations, 500);
}

// UI
function appendMessage(msg) {
    const container = document.getElementById('chatMessages');
    
    // Only show in current view
    if (currentView === 'global' && msg.receiver_id !== null && msg.receiver_id) {
        return;
    }
    if (currentView !== 'global') {
        if (msg.receiver_id !== currentView && msg.sender_id !== currentView) {
            return;
        }
    }
    
    const isOwn = msg.sender_id === currentUser.id;
    const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const initial = (msg.sender || '?').charAt(0).toUpperCase();
    
    const div = document.createElement('div');
    div.className = `message ${isOwn ? 'own' : ''}`;
    div.innerHTML = `
        <div class="message-avatar">${initial}</div>
        <div class="message-content">
            <div class="message-sender">${msg.sender || 'Unknown'}</div>
            <div class="message-text">${escapeHtml(msg.content)}</div>
            <div class="message-time">${time}</div>
        </div>
    `;
    container.appendChild(div);
    autoScroll();
}

function appendSystemMessage(data) {
    const container = document.getElementById('chatMessages');
    const div = document.createElement('div');
    div.className = 'system-message';
    
    if (data.event === 'user_joined') {
        div.innerHTML = `<span class="badge bg-success bg-opacity-10 text-success">${escapeHtml(data.username)} joined</span>`;
    } else if (data.event === 'user_left') {
        div.innerHTML = `<span class="badge bg-danger bg-opacity-10 text-danger">${escapeHtml(data.username)} left</span>`;
    }
    
    container.appendChild(div);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// REST API
async function loadMessages() {
    const container = document.getElementById('chatMessages');
    container.innerHTML = '<div class="text-center text-muted py-5"><i class="bi bi-hourglass-split display-4"></i><p class="mt-2">Loading...</p></div>';
    
    try {
        let url;
        if (currentView === 'global') {
            url = '/api/messages/global?limit=50';
            document.getElementById('chatTitle').innerHTML = '<i class="bi bi-globe"></i> Global Chat';
        } else {
            url = `/api/messages/dm/${currentView}?limit=50`;
        }
        
        const res = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` },
        });
        
        const messages = await res.json();
        container.innerHTML = '';
        
        messages.forEach(msg => {
            // Don't re-add if already in DOM
            appendMessage(msg);
        });
        
        if (messages.length === 0) {
            container.innerHTML = '<div class="text-center text-muted py-5"><i class="bi bi-chat-text display-1"></i><p class="mt-3">No messages yet. Start the conversation!</p></div>';
        }
    } catch (err) {
        container.innerHTML = '<div class="text-center text-danger py-5"><i class="bi bi-exclamation-triangle display-4"></i><p class="mt-2">Failed to load messages</p></div>';
    }
}

async function loadOnlineUsers() {
    try {
        const res = await fetch('/api/messages/online', {
            headers: { 'Authorization': `Bearer ${token}` },
        });
        const users = await res.json();
        
        const list = document.getElementById('onlineUsersList');
        list.innerHTML = users.map(u => `
            <div class="list-group-item d-flex align-items-center justify-content-between" 
                 onclick="openDM('${u.id}', '${escapeHtml(u.username)}')">
                <span><span class="online-dot"></span>${escapeHtml(u.username)}</span>
                <i class="bi bi-chat text-muted"></i>
            </div>
        `).join('');
    } catch (err) {
        console.error('Failed to load online users:', err);
    }
}

async function loadConversations() {
    try {
        const res = await fetch('/api/conversations', {
            headers: { 'Authorization': `Bearer ${token}` },
        });
        const convos = await res.json();

        const list = document.getElementById('dmList');
        if (convos.length === 0) {
            list.innerHTML = '<div class="text-muted small px-3 py-2">No DMs yet. Click a user to start!</div>';
            return;
        }

        list.innerHTML = convos.map(c => `
            <div class="list-group-item d-flex align-items-center justify-content-between"
                 onclick="openDM('${c.user2_id === '${currentUser.id}' ? c.user1_id : c.user2_id}', '${escapeHtml(c.other_user ? c.other_user.username : '')}')">
                <span>${c.other_user ? escapeHtml(c.other_user.username) : 'Unknown'}</span>
                <small class="text-muted"><i class="bi bi-chat"></i></small>
            </div>
        `).join('');
    } catch (err) {
        console.error('Failed to load conversations:', err);
    }
}

function openDM(userId, username) {
    if (userId === currentUser.id) return;
    currentView = userId;
    document.getElementById('chatTitle').innerHTML = `<i class="bi bi-envelope"></i> ${escapeHtml(username)}`;
    document.getElementById('messageInput').placeholder = `Message ${escapeHtml(username)}...`;

    // Add back button
    const header = document.querySelector('.chat-header');
    if (!header.querySelector('.btn-back')) {
        const refreshBtn = header.querySelector('button');
        const backBtn = document.createElement('button');
        backBtn.className = 'btn btn-sm btn-outline-primary btn-back me-2';
        backBtn.innerHTML = '<i class="bi bi-arrow-left"></i> Global';
        backBtn.onclick = backToGlobal;
        refreshBtn.parentNode.insertBefore(backBtn, refreshBtn);
    }

    loadMessages();
    loadConversations();

    // Highlight
    document.querySelectorAll('#onlineUsersList .list-group-item, #dmList .list-group-item').forEach(el => el.classList.remove('active'));
    if (event && event.currentTarget) event.currentTarget.classList.add('active');
}

function backToGlobal() {
    currentView = 'global';
    document.getElementById('chatTitle').innerHTML = '<i class="bi bi-globe"></i> Global Chat';
    document.getElementById('messageInput').placeholder = 'Type a message...';

    // Remove back button
    const backBtn = document.querySelector('.btn-back');
    if (backBtn) backBtn.remove();

    loadMessages();
    document.querySelectorAll('.list-group-item').forEach(el => el.classList.remove('active'));
}

// Toggle sidebar on mobile
function toggleSidebar() {
    document.querySelector('.sidebar').classList.toggle('show');
}

// Periodically refresh online users
setInterval(loadOnlineUsers, 10000);
