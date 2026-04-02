'use client'

import { useState, useEffect, useRef } from 'react'
import { Socket } from 'socket.io-client'
import { authAPI } from '@/lib/supabase'

interface ChatPanelProps {
  socket: Socket
  sessionId: string
  userId: string
  userRole: 'mentor' | 'student'
  userName: string
}

interface Message {
  id: string
  content: string
  userId: string
  role: 'mentor' | 'student'
  timestamp: string
  sender?: {
    name: string
    role: 'mentor' | 'student'
  }
}

export default function ChatPanel({ socket, sessionId, userId, userRole, userName }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isConnected, setIsConnected] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  // Load chat history on component mount
  useEffect(() => {
    loadChatHistory()
  }, [sessionId])

  // Handle real-time messages
  useEffect(() => {
    socket.on('chat-message', (message: Message) => {
      setMessages(prev => [...prev, message])
    })

    socket.on('connect', () => setIsConnected(true))
    socket.on('disconnect', () => setIsConnected(false))

    // Check initial connection status
    setIsConnected(socket.connected)

    return () => {
      socket.off('chat-message')
      socket.off('connect')
      socket.off('disconnect')
    }
  }, [socket])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const loadChatHistory = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/sessions/${sessionId}/messages?limit=50`,
        {
          headers: {
            'Authorization': `Bearer ${authAPI.getToken()}`,
          },
        }
      )

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setMessages(data.messages)
        }
      }
    } catch (error) {
      console.error('Failed to load chat history:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const sendMessage = () => {
    if (input.trim() && isConnected) {
      const message = {
        content: input.trim(),
      }
      socket.emit('chat-message', message)

      // Add message to local state immediately for better UX
      const localMessage: Message = {
        id: Date.now().toString(),
        content: input.trim(),
        userId,
        role: userRole,
        timestamp: new Date().toISOString(),
        sender: {
          name: userName,
          role: userRole
        }
      }
      setMessages(prev => [...prev, localMessage])
      setInput('')
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })
  }

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) {
      return 'Today'
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday'
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      })
    }
  }

  const shouldShowDateSeparator = (index: number): boolean => {
    if (index === 0) return true
    const currentMessage = messages[index]
    const previousMessage = messages[index - 1]
    return formatDate(currentMessage.timestamp) !== formatDate(previousMessage.timestamp)
  }

  return (
    <div className="bg-white rounded-lg shadow-md flex flex-col h-full max-h-96">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <h3 className="text-lg font-semibold text-gray-900">Chat</h3>
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-xs text-gray-500">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
        <button
          onClick={loadChatHistory}
          className="text-xs text-blue-600 hover:text-blue-800"
          disabled={isLoading}
        >
          {isLoading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {/* Messages Container */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-4 py-2 space-y-1"
        style={{ maxHeight: 'calc(100% - 120px)' }}
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-500">Loading messages...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-gray-500 text-center">
              <div className="text-2xl mb-2">💬</div>
              <div>No messages yet</div>
              <div className="text-sm">Start the conversation!</div>
            </div>
          </div>
        ) : (
          messages.map((message, index) => (
            <div key={message.id}>
              {/* Date Separator */}
              {shouldShowDateSeparator(index) && (
                <div className="flex items-center my-4">
                  <div className="flex-1 border-t border-gray-300"></div>
                  <div className="px-3 py-1 bg-gray-100 rounded-full text-xs text-gray-600">
                    {formatDate(message.timestamp)}
                  </div>
                  <div className="flex-1 border-t border-gray-300"></div>
                </div>
              )}

              {/* Message */}
              <div className={`flex ${message.userId === userId ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-xs lg:max-w-md px-3 py-2 rounded-lg ${
                    message.userId === userId
                      ? 'bg-blue-600 text-white'
                      : message.role === 'mentor'
                      ? 'bg-blue-100 text-blue-900'
                      : 'bg-green-100 text-green-900'
                  }`}
                >
                  {/* Sender name (only for others' messages) */}
                  {message.userId !== userId && (
                    <div className="text-xs font-medium mb-1 opacity-75">
                      {message.sender?.name || (message.role === 'mentor' ? 'Mentor' : 'Student')}
                    </div>
                  )}

                  {/* Message content */}
                  <div className="text-sm whitespace-pre-wrap break-words">
                    {message.content}
                  </div>

                  {/* Timestamp */}
                  <div className={`text-xs mt-1 ${
                    message.userId === userId ? 'text-blue-200' : 'text-gray-500'
                  }`}>
                    {formatTime(message.timestamp)}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="px-4 py-3 border-t border-gray-200">
        <div className="flex items-end space-x-2">
          <div className="flex-1">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={isConnected ? "Type a message..." : "Connecting..."}
              disabled={!isConnected}
              rows={1}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ minHeight: '36px', maxHeight: '100px' }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = Math.min(target.scrollHeight, 100) + 'px';
              }}
            />
          </div>
          <button
            onClick={sendMessage}
            disabled={!input.trim() || !isConnected}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            Send
          </button>
        </div>

        {/* Connection status hint */}
        {!isConnected && (
          <div className="text-xs text-red-500 mt-1">
            Reconnecting to chat...
          </div>
        )}
      </div>
    </div>
  )
}