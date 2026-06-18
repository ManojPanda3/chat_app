import { useState, useEffect, useRef, useCallback } from 'react'
import Sidebar from '@/components/Sidebar'
import ChatArea from '@/components/ChatArea'
import { useAuth } from '@/context/AuthContext'
import { useWebSocket, useMessages, useOnlineUsers, useConversations } from '@/hooks/useChat'

export default function Chat() {
  const { user } = useAuth()
  const { ws, status } = useWebSocket()
  const { messages, loadMessages, appendMessage } = useMessages()
  const { users: onlineUsers } = useOnlineUsers()
  const { conversations, refresh: refreshConversations } = useConversations()

  const [currentView, setCurrentView] = useState('global')
  const [typingUsers, setTypingUsers] = useState(new Set())
  const [typingDisplay, setTypingDisplay] = useState('')
  const typingTimeoutRef = useRef(null)

  // Load messages when view changes
  useEffect(() => {
    loadMessages(currentView)
  }, [currentView])

  // WebSocket message handler
  useEffect(() => {
    if (!ws) return

    const handler = (event) => {
      const data = JSON.parse(event.data)
      switch (data.type) {
        case 'message': {
          const msg = data.data
          if (currentView === 'global') {
            if (!msg.receiver_id) appendMessage(msg)
          } else {
            if (msg.receiver_id === currentView || msg.sender_id === currentView)
              appendMessage(msg)
          }
          refreshConversations()
          break
        }
        case 'typing':
          setTypingUsers(prev => {
            const next = new Set(prev)
            next.add(data.data.username)
            return next
          })
          break
        case 'typing_clear':
          setTypingUsers(prev => {
            const next = new Set(prev)
            next.delete(data.data.username)
            return next
          })
          break
        case 'read_receipt':
          break
        default:
          break
      }
    }

    ws.onmessage = handler
    return () => { ws.onmessage = null }
  }, [ws, currentView])

  // Update typing display
  useEffect(() => {
    const count = typingUsers.size
    if (count === 0) setTypingDisplay('')
    else if (count === 1) setTypingDisplay(`${Array.from(typingUsers)[0]} is typing...`)
    else if (count === 2) {
      const arr = Array.from(typingUsers)
      setTypingDisplay(`${arr[0]} and ${arr[1]} are typing...`)
    } else setTypingDisplay('Several people are typing...')
  }, [typingUsers])

  const sendMessage = (content) => {
    if (!ws || ws.readyState !== WebSocket.OPEN || !content.trim()) return
    ws.send(JSON.stringify({
      type: 'message',
      content: content,
      receiver_id: currentView === 'global' ? null : currentView,
    }))
  }

  const sendTyping = useCallback(() => {
    if (!ws || ws.readyState !== WebSocket.OPEN) return
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)

    ws.send(JSON.stringify({
      type: 'typing',
      receiver_id: currentView === 'global' ? null : currentView,
    }))

    typingTimeoutRef.current = setTimeout(() => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'typing', receiver_id: null }))
      }
    }, 2000)
  }, [ws, currentView])

  // Find DM partner name
  const dmPartnerName = currentView !== 'global'
    ? (onlineUsers.find(u => u.id === currentView)?.username
      || conversations.find(c =>
          c.user1_id === currentView || c.user2_id === currentView
        )?.other_user?.username)
    : ''

  const openDM = (userId) => setCurrentView(userId)
  const backToGlobal = () => setCurrentView('global')

  return (
    <div className="h-screen flex overflow-hidden bg-background">
      <Sidebar
        user={user}
        currentView={currentView}
        onOpenDM={openDM}
      />
      <ChatArea
        view={currentView}
        messages={messages}
        currentUsername={user}
        dmPartnerName={dmPartnerName}
        typingDisplay={typingDisplay}
        wsStatus={status}
        onSendMessage={sendMessage}
        onTyping={sendTyping}
        onRefresh={() => loadMessages(currentView)}
      />
    </div>
  )
}
