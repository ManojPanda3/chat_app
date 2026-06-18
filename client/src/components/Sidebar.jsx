import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useOnlineUsers, useConversations } from '@/hooks/useChat'
import { cn } from '@/lib/utils'
import {
  MessageSquare,
  LogOut,
  Globe,
  MoreVertical,
  Search,
  UserPlus,
  Settings
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { useState } from 'react'

export default function Sidebar({ user, currentView, onOpenDM }) {
  const { logout } = useAuth()
  const { users: onlineUsers } = useOnlineUsers()
  const { conversations } = useConversations()
  const [searchQuery, setSearchQuery] = useState('')

  // Filter conversations and online users based on search
  const filteredConversations = conversations.filter(c =>
    c.other_user?.username?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredOnline = onlineUsers.filter(u =>
    u.id !== user?.id &&
    u.username?.toLowerCase().includes(searchQuery.toLowerCase()) &&
    !conversations.some(c => c.user1_id === u.id || c.user2_id === u.id)
  )

  return (
    <div className="w-[380px] flex flex-col bg-[#09090b] border-r border-zinc-800 h-full shrink-0">
      {/* Sidebar Header */}
      <div className="h-20 px-6 flex items-center justify-between bg-zinc-950/30 shrink-0 border-b border-zinc-900">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Avatar className="w-11 h-11 border-2 border-zinc-800">
              <AvatarFallback className="bg-gradient-to-tr from-violet-600 to-fuchsia-600 text-white font-black text-lg">
                {user?.username?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-[#09090b]"></span>
          </div>
          <div className="hidden sm:block">
            <p className="text-[15px] font-bold text-white tracking-tight">{user?.username}</p>
            <p className="text-[11px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">My Account</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="rounded-full w-10 h-10 text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all">
            <Settings className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="rounded-full w-10 h-10 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-all" onClick={logout} title="Logout">
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="px-5 py-5 shrink-0">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-zinc-600 group-focus-within:text-violet-500 transition-colors" />
          <Input
            placeholder="Search conversations..."
            className="pl-11 h-12 bg-zinc-900 border-zinc-800 rounded-2xl text-[14px] text-white placeholder:text-zinc-600 focus-visible:ring-violet-600 focus-visible:border-violet-600 transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Chat List */}
      <ScrollArea className="flex-1">
        <div className="flex flex-col px-3">
          {/* Global Chat Item */}
          <button
            onClick={() => onOpenDM('global')}
            className={cn(
              "flex items-center gap-4 px-4 py-4 mb-1 rounded-2xl transition-all text-left group relative overflow-hidden",
              currentView === 'global'
                ? "bg-zinc-900 border border-zinc-800 shadow-xl"
                : "hover:bg-zinc-900/50 border border-transparent"
            )}
          >
            <div className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105",
              currentView === 'global' ? "bg-violet-600 shadow-lg shadow-violet-600/20" : "bg-zinc-800"
            )}>
              <Globe className={cn("w-6 h-6", currentView === 'global' ? "text-white" : "text-zinc-400")} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center">
                <span className={cn("font-bold text-[15px] tracking-tight", currentView === 'global' ? "text-white" : "text-zinc-200")}>Global Network</span>
                <span className="text-[10px] bg-violet-600/10 text-violet-400 px-2 py-0.5 rounded-full font-black uppercase tracking-tighter">Live</span>
              </div>
              <p className="text-[13px] text-zinc-500 truncate mt-0.5 font-medium">
                Broadcast messages to everyone
              </p>
            </div>
            {currentView === 'global' && (
              <div className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-violet-600 rounded-r-full"></div>
            )}
          </button>

          <div className="mt-6 mb-2 px-4 flex items-center justify-between">
            <h3 className="text-[11px] font-black text-zinc-600 uppercase tracking-[0.2em]">Conversations</h3>
            <div className="h-px bg-zinc-900 flex-1 ml-4"></div>
          </div>

          {/* Active Conversations */}
          {filteredConversations.map(c => {
            const otherUser = c.other_user
            const isActive = currentView === (c.user1_id === user?.id ? c.user2_id : c.user1_id)

            return (
              <button
                key={c.id}
                onClick={() => onOpenDM(otherUser.id)}
                className={cn(
                  "flex items-center gap-4 px-4 py-4 mb-1 rounded-2xl transition-all text-left group relative",
                  isActive ? "bg-zinc-900 border border-zinc-800 shadow-xl" : "hover:bg-zinc-900/50 border border-transparent"
                )}
              >
                <div className="relative shrink-0">
                  <Avatar className="w-12 h-12 border border-zinc-800 transition-transform group-hover:scale-105">
                    <AvatarFallback className="bg-zinc-800 text-zinc-300 font-black text-lg">
                      {otherUser?.username?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {onlineUsers.some(u => u.id === otherUser.id) && (
                    <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-[#09090b]"></span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center">
                    <span className={cn("font-bold text-[15px] tracking-tight", isActive ? "text-white" : "text-zinc-200")}>{otherUser?.username}</span>
                    <span className="text-[10px] text-zinc-600 font-bold uppercase">
                      {c.last_message_at ? new Date(c.last_message_at).toLocaleDateString([], { month: 'short', day: 'numeric' }) : ''}
                    </span>
                  </div>
                  <p className="text-[13px] text-zinc-500 truncate mt-0.5 font-medium">
                    {c.last_message || 'Start a private conversation'}
                  </p>
                </div>
                {isActive && (
                  <div className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-violet-600 rounded-r-full"></div>
                )}
              </button>
            )
          })}

          {/* Online Users not in conversations */}
          {filteredOnline.length > 0 && (
            <>
              <div className="mt-8 mb-2 px-4 flex items-center justify-between">
                <h3 className="text-[11px] font-black text-zinc-600 uppercase tracking-[0.2em]">Online Now</h3>
                <div className="h-px bg-zinc-900 flex-1 ml-4"></div>
              </div>

              {filteredOnline.map(u => (
                <button
                  key={u.id}
                  onClick={() => onOpenDM(u.id)}
                  className="flex items-center gap-4 px-4 py-3 mb-1 rounded-2xl transition-all text-left hover:bg-zinc-900/50 group border border-transparent"
                >
                  <div className="relative shrink-0">
                    <Avatar className="w-11 h-11 border border-zinc-800 transition-transform group-hover:scale-105">
                      <AvatarFallback className="bg-zinc-950 text-violet-500 font-black">
                        {u.username?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#09090b]"></span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[14px] text-zinc-300 tracking-tight">{u.username}</span>
                      <UserPlus className="w-3.5 h-3.5 text-violet-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <p className="text-[11px] text-emerald-500/80 font-black uppercase tracking-tighter">Available</p>
                  </div>
                </button>
              ))}
            </>
          )}

          {filteredConversations.length === 0 && filteredOnline.length === 0 && searchQuery && (
            <div className="py-12 px-6 text-center animate-in fade-in slide-in-from-bottom-4">
              <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-4 border border-zinc-800">
                <Search className="w-6 h-6 text-zinc-600" />
              </div>
              <p className="text-sm font-bold text-zinc-400">No results found</p>
              <p className="text-[12px] text-zinc-600 mt-1">Try searching for a different username</p>
            </div>
          )}
        </div>
      </ScrollArea>

    </div>
  )
}
