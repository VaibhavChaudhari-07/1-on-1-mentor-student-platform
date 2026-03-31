'use client'

import { useState, useEffect, useRef } from 'react'
import { Socket } from 'socket.io-client'

interface ChatProps {
  socket: Socket
  userId: string
  role: 'mentor' | 'student'
}

interface Message {
  id: string
  text: string
  userId: string
  role: 'mentor' | 'student'
  timestamp: number
}

export default function Chat({ socket, userId, role }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    socket.on('receive-message', (message: Message) => {
      setMessages(prev => [...prev, message])
    })

    return () => {
      socket.off('receive-message')
    }
  }, [socket])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = () => {
    if (input.trim()) {
      const message = {
        id: Date.now().toString(),
        text: input,
        userId,
        role,
        timestamp: Date.now(),
      }
      socket.emit('send-message', message)
      setMessages(prev => [...prev, message])
      setInput('')
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      sendMessage()
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-4 h-96 flex flex-col">
      <h2 className="text-lg font-semibold mb-4">Chat</h2>
      <div className="flex-1 overflow-y-auto mb-4">
        {messages.map((msg) => (
          <div key={msg.id} className="mb-2">
            <span className={`font-semibold ${msg.role === 'mentor' ? 'text-blue-600' : 'text-green-600'}`}>
              {msg.role === 'mentor' ? 'Mentor' : 'Student'}:
            </span>
            <span className="ml-2">{msg.text}</span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className="flex">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          className="flex-1 p-2 border rounded-l"
          placeholder="Type a message..."
        />
        <button
          onClick={sendMessage}
          className="bg-blue-500 text-white px-4 py-2 rounded-r hover:bg-blue-600"
        >
          Send
        </button>
      </div>
    </div>
  )
}