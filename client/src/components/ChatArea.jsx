import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Send,
  MoreVertical,
  Paperclip,
  Smile,
  Globe,
  MessageCircle,
  Users,
  Search,
  ArrowLeft,
} from 'lucide-react'
import { cn } from '@/lib/utils'

function escapeHtml(text) {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

function formatTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function ChatArea({
  view, messages, currentUsername, dmPartnerName,
  typingDisplay, wsStatus, onSendMessage, onTyping,
  onRefresh, onBack
}) {
  const messagesEndRef = useRef(null)
  const [inputValue, setInputValue] = useState('')

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' })
  }, [messages])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!inputValue.trim()) return
    onSendMessage(inputValue)
    setInputValue('')
  }

  const isOwn = (msg) => msg.sender_id === currentUsername?.id
  const isDM = view !== 'global'

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#09090b] relative">
      {/* Header */}
      <div className="h-16 px-4 sm:px-6 flex items-center justify-between bg-zinc-950/50 backdrop-blur-xl border-b border-zinc-800 shrink-0 z-10">
        <div className="flex items-center gap-3 sm:gap-4">
          <Button variant="ghost" size="icon" className="md:hidden rounded-full w-10 h-10 -ml-2 text-zinc-400 hover:text-white" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          
          {isDM ? (
            <div className="relative">
              <Avatar className="w-10 h-10 border border-zinc-800">
                <AvatarFallback className="bg-violet-950/30 text-violet-400 font-bold uppercase">
                  {dmPartnerName?.charAt(0) || '?'}
                </AvatarFallback>
              </Avatar>
              {wsStatus === 'connected' && (
                <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#09090b]"></span>
              )}
            </div>
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-violet-600 to-fuchsia-600 flex items-center justify-center shrink-0 shadow-lg shadow-violet-600/20">
              <Globe className="w-5 h-5 text-white" />
            </div>
          )}
          <div className="flex flex-col">
            <h2 className="text-[15px] font-bold text-white tracking-tight leading-tight">{isDM ? dmPartnerName : 'Global Chat'}</h2>
            <p className="text-[11px] text-zinc-500 font-medium">
              {isDM ? (wsStatus === 'connected' ? 'Active now' : 'Offline') : 'Community channel'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="rounded-full w-10 h-10 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors">
            <Search className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="rounded-full w-10 h-10 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors">
            <MoreVertical className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-4 sm:px-8 py-6 z-10">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-zinc-600 space-y-4 pt-20 animate-in fade-in duration-700">
            <div className="p-8 rounded-3xl bg-zinc-900/50 border border-zinc-800">
              <MessageCircle className="w-12 h-12" />
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-zinc-400">Secure conversation started</p>
              <p className="text-[12px] mt-1">Messages are private and protected.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2 mx-auto">
            {messages.map((msg, index) => {
              const own = isOwn(msg)
              const prevMsg = messages[index - 1]
              const isFirstInSequence = !prevMsg || prevMsg.sender_id !== msg.sender_id

              return (
                <div
                  key={msg.id || index}
                  className={cn(
                    "flex w-full mb-1 animate-in fade-in slide-in-from-bottom-1 duration-300",
                    own ? "justify-end" : "justify-start",
                    isFirstInSequence ? "mt-6" : "mt-0.5"
                  )}
                >
                  <div className={cn(
                    "relative max-w-[85%] sm:max-w-[70%] px-4 py-2.5 shadow-2xl text-[14.5px] leading-relaxed transition-all",
                    own
                      ? "bg-violet-600 text-white rounded-2xl rounded-tr-sm hover:bg-violet-500"
                      : "bg-zinc-900 border border-zinc-800 text-zinc-100 rounded-2xl rounded-tl-sm hover:bg-zinc-800/80",
                  )}>
                    {!own && isFirstInSequence && !isDM && (
                      <div className="text-[12px] font-black text-violet-400 mb-1 tracking-wide uppercase">
                        {msg.sender?.username || 'User'}
                      </div>
                    )}

                    <div className="inline font-medium" dangerouslySetInnerHTML={{ __html: escapeHtml(msg.content) }} />

                    <div className={cn(
                      "inline-block ml-3 translate-y-1 text-[10px] select-none opacity-50 font-bold",
                      own ? "text-white" : "text-zinc-500"
                    )}>
                      {formatTime(msg.timestamp)}
                    </div>
                  </div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>
      {/* Typing Indicator */}
      {typingDisplay && (
        <div className="absolute bottom-24 left-8 z-20 px-4 py-2 bg-zinc-900/90 backdrop-blur-2xl border border-zinc-800 rounded-2xl text-[11px] text-violet-400 font-bold italic shadow-2xl animate-in fade-in slide-in-from-left-2 duration-300">
          <span className="flex items-center gap-2">
            <span className="flex gap-1">
              <span className="w-1 h-1 bg-violet-400 rounded-full animate-bounce"></span>
              <span className="w-1 h-1 bg-violet-400 rounded-full animate-bounce delay-100"></span>
              <span className="w-1 h-1 bg-violet-400 rounded-full animate-bounce delay-200"></span>
            </span>
            {typingDisplay}
          </span>
        </div>
      )}


      {/* Input Area */}
      <div className="px-6 py-6 bg-[#09090b] border-t border-zinc-800 shrink-0 z-10">
        <form onSubmit={handleSubmit} className="flex items-center gap-4 mx-auto">
          <div className="flex items-center gap-1">
            <Button type="button" variant="ghost" size="icon" className="rounded-full w-10 h-10 text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all">
              <Smile className="w-6 h-6" />
            </Button>
            <Button type="button" variant="ghost" size="icon" className="rounded-full w-10 h-10 text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all">
              <Paperclip className="w-6 h-6 -rotate-45" />
            </Button>
          </div>

          <Input
            placeholder="Write a message..."
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onInput={onTyping}
            className="flex-1 h-12 bg-zinc-900 border-zinc-800 rounded-2xl px-6 text-[15px] text-white placeholder:text-zinc-600 focus-visible:ring-violet-600 focus-visible:border-violet-600 transition-all shadow-inner"
          />

          <Button
            type="submit"
            size="icon"
            disabled={!inputValue.trim()}
            className={cn(
              "w-12 h-12 rounded-2xl shrink-0 shadow-xl transition-all active:scale-90",
              inputValue.trim()
                ? "bg-gradient-to-tr from-violet-600 to-fuchsia-600 text-white shadow-violet-600/20"
                : "bg-zinc-900 text-zinc-700 border border-zinc-800 cursor-not-allowed"
            )}
          >
            <Send className="w-5 h-5" />
          </Button>
        </form>
      </div>
    </div>
  )
}
