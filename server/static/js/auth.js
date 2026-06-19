// auth.js - Login and Register functionality
const API_BASE = '/api/auth';

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('loginUsername').value;
            const password = document.getElementById('loginPassword').value;
            const errorEl = document.getElementById('loginError');
            
            try {
                const res = await fetch(`${API_BASE}/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password }),
                });
                
                const data = await res.json();
                
                if (res.ok) {
                    localStorage.setItem('token', data.access_token);
                    localStorage.setItem('user', JSON.stringify(data.user));
                    window.location.href = '/';
                } else {
                    errorEl.textContent = data.detail || 'Login failed';
                    errorEl.classList.remove('d-none');
                }
            } catch (err) {
                errorEl.textContent = 'Network error. Try again.';
                errorEl.classList.remove('d-none');
            }
        });
    }
    
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('regUsername').value;
            const password = document.getElementById('regPassword').value;
            const errorEl = document.getElementById('regError');
            
            try {
                const res = await fetch(`${API_BASE}/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password }),
                });
                
                const data = await res.json();
                
                if (res.ok) {
                    localStorage.setItem('token', data.access_token);
                    localStorage.setItem('user', JSON.stringify(data.user));
                    window.location.href = '/';
                } else {
                    errorEl.textContent = data.detail || 'Registration failed';
                    errorEl.classList.remove('d-none');
                }
            } catch (err) {
                errorEl.textContent = 'Network error. Try again.';
                errorEl.classList.remove('d-none');
            }
        });
    }
});
