'use client'

import { useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import Editor from './Editor'
import Chat from './Chat'
import VideoCall from './VideoCall'

interface SessionRoomProps {
  sessionId: string
  user: any
  role: 'mentor' | 'student'
}

export default function SessionRoom({ sessionId, user, role }: SessionRoomProps) {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    const newSocket = io(process.env.NEXT_PUBLIC_BACKEND_URL!)
    setSocket(newSocket)

    newSocket.on('connect', () => {
      setConnected(true)
      newSocket.emit('join-session', { sessionId, userId: user.id, role })
    })

    newSocket.on('disconnect', () => {
      setConnected(false)
    })

    return () => {
      newSocket.disconnect()
    }
  }, [sessionId, user.id, role])

  if (!connected) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Connecting...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <VideoCall socket={socket!} sessionId={sessionId} userId={user.id} />
          <Editor socket={socket!} />
        </div>
        <div className="lg:col-span-1">
          <Chat socket={socket!} userId={user.id} role={role} />
        </div>
      </div>
    </div>
  )
}