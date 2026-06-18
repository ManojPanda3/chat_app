import { useState, useEffect, useRef, useCallback } from 'react'
import Sidebar from '@/components/Sidebar'
import ChatArea from '@/components/ChatArea'
import { useAuth } from '@/context/AuthContext'
import { useWebSocket, useMessages, useOnlineUsers, useConversations } from '@/hooks/useChat'
import { cn } from '@/lib/utils'
import { MessageSquare, ShieldCheck } from 'lucide-react'

export default function Chat() {
  const { user } = useAuth()
  const { ws, status } = useWebSocket()
  const { messages, loadMessages, appendMessage } = useMessages()
  const { users: onlineUsers } = useOnlineUsers()
  const { conversations, refresh: refreshConversations } = useConversations()

  const [currentView, setCurrentView] = useState(null)
  const [typingUsers, setTypingUsers] = useState(new Set())
  const [typingDisplay, setTypingDisplay] = useState('')
  const typingTimeoutRef = useRef(null)

  // Load messages when view changes
  useEffect(() => {
    if (currentView) {
      loadMessages(currentView)
    }
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
  const dmPartnerName = (currentView && currentView !== 'global')
    ? (onlineUsers.find(u => u.id === currentView)?.username
      || conversations.find(c =>
          c.user1_id === currentView || c.user2_id === currentView
        )?.other_user?.username)
    : ''

  const openDM = (userId) => setCurrentView(userId)
  const handleBack = () => setCurrentView(null)

  return (
    <div className="h-screen flex overflow-hidden bg-[#09090b]">
      {/* Sidebar Container */}
      <div className={cn(
        "h-full shrink-0 border-r border-zinc-800 transition-all duration-300",
        currentView ? "hidden md:block md:w-[350px] lg:w-[400px]" : "w-full"
      )}>
        <Sidebar
          user={user}
          currentView={currentView}
          onOpenDM={openDM}
        />
      </div>

      {/* Chat Area Container */}
      <div className={cn(
        "flex-1 h-full min-w-0 bg-[#09090b]",
        !currentView ? "hidden md:flex" : "flex"
      )}>
        {currentView ? (
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
            onBack={handleBack}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-1000">
            <div className="w-24 h-24 rounded-[2.5rem] bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-6 shadow-2xl">
              <MessageSquare className="w-10 h-10 text-violet-500" />
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">Select a conversation</h2>
            <p className="text-zinc-500 mt-2 max-w-[280px] leading-relaxed">
              Choose from your existing chats or find online users to start a new private message.
            </p>
            <div className="mt-8 flex items-center gap-2 text-[10px] font-black text-zinc-700 uppercase tracking-widest px-4 py-2 border border-zinc-900 rounded-full bg-zinc-950/50">
              <ShieldCheck className="w-3.5 h-3.5" />
              End-to-End Encrypted
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
