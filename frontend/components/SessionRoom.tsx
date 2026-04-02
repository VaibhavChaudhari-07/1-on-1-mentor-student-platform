'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface SessionRoomProps {
  sessionId: string
  user: any
  role: 'mentor' | 'student'
}

export default function SessionRoom({ sessionId, user, role }: SessionRoomProps) {
  const router = useRouter()

  useEffect(() => {
    // Redirect to the new session page
    router.replace(`/session/${sessionId}`)
  }, [sessionId, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <div className="text-xl text-gray-600">Loading session...</div>
      </div>
    </div>
  )
}