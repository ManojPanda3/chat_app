import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '../context/AuthContext'

export function useWebSocket() {
  const { token, logout } = useAuth()
  const [ws, setWs] = useState(null)
  const [status, setStatus] = useState('disconnected')

  const connect = useCallback(() => {
    if (!token) return
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const socket = new WebSocket(`${protocol}//${window.location.host}/ws?token=${token}`)

    socket.onopen = () => setStatus('connected')
    socket.onclose = (event) => {
      setStatus('disconnected')
      if (event.code === 4001 || event.code === 4003) {
        logout()
      } else {
        setTimeout(connect, 3000)
      }
    }
    socket.onerror = () => setStatus('error')

    setWs(socket)
    return socket
  }, [token, logout])

  useEffect(() => {
    const socket = connect()
    return () => { if (socket) socket.close() }
  }, [connect])

  return { ws, status }
}

export function useMessages() {
  const { token, logout } = useAuth()
  const [messages, setMessages] = useState([])

  const loadMessages = async (view) => {
    if (!token) return
    try {
      const url = view === 'global'
        ? '/api/messages/global?limit=50'
        : `/api/messages/dm/${view}?limit=50`
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.status === 401) {
        logout()
        return
      }
      const data = await res.json()
      setMessages(data)
    } catch (err) {
      console.error('Failed to load messages:', err)
    }
  }

  const appendMessage = (msg) => setMessages(prev => [...prev, msg])
  const clearMessages = () => setMessages([])

  return { messages, loadMessages, appendMessage, clearMessages }
}

export function useOnlineUsers() {
  const { token, logout } = useAuth()
  const [users, setUsers] = useState([])

  const loadUsers = async () => {
    if (!token) return
    try {
      const res = await fetch('/api/messages/online', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.status === 401) {
        logout()
        return
      }
      const data = await res.json()
      setUsers(data)
    } catch (err) {
      console.error('Failed to load online users:', err)
    }
  }

  useEffect(() => {
    loadUsers()
    const interval = setInterval(loadUsers, 10000)
    return () => clearInterval(interval)
  }, [token])

  return { users, refresh: loadUsers }
}

export function useConversations() {
  const { token, logout } = useAuth()
  const [conversations, setConversations] = useState([])

  const loadConversations = async () => {
    if (!token) return
    try {
      const res = await fetch('/api/conversations', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.status === 401) {
        logout()
        return
      }
      const data = await res.json()
      setConversations(data)
    } catch (err) {
      console.error('Failed to load conversations:', err)
    }
  }

  useEffect(() => { loadConversations() }, [token])

  return { conversations, refresh: loadConversations }
}
