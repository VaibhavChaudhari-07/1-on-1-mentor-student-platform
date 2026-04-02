'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { io, Socket } from 'socket.io-client'
import { useAuth } from '@/hooks/useAuth'
import VideoCall from '@/components/VideoCall'
import CodeEditor from '@/components/Editor'
import ChatPanel from '@/components/ChatPanel'

interface SessionData {
  _id: string
  mentor_id: string
  student_id?: string
  status: 'active' | 'ended'
  created_at: string
}

interface User {
  _id: string
  name: string
  email: string
  role: 'mentor' | 'student'
}

export default function SessionPage() {
  const params = useParams()
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const sessionId = params.id as string

  // State
  const [socket, setSocket] = useState<Socket | null>(null)
  const [session, setSession] = useState<SessionData | null>(null)
  const [userRole, setUserRole] = useState<'mentor' | 'student' | null>(null)
  const [connected, setConnected] = useState(false)
  const [joined, setJoined] = useState(false)
  const [participants, setParticipants] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Refs
  const socketRef = useRef<Socket | null>(null)

  // Initialize socket connection
  useEffect(() => {
    if (!user || !sessionId) return

    const newSocket = io(process.env.NEXT_PUBLIC_BACKEND_URL!, {
      transports: ['websocket', 'polling'],
      upgrade: true,
    })

    socketRef.current = newSocket
    setSocket(newSocket)

    // Connection events
    newSocket.on('connect', () => {
      console.log('Connected to server')
      setConnected(true)
      setError(null)
    })

    newSocket.on('disconnect', () => {
      console.log('Disconnected from server')
      setConnected(false)
      setJoined(false)
    })

    // Session events
    newSocket.on('joined-session', (data) => {
      console.log('Successfully joined session:', data)
      setJoined(true)
      setParticipants(data.participantCount)
      setLoading(false)
    })

    newSocket.on('join-error', (error) => {
      console.error('Failed to join session:', error)
      setError(error.message || 'Failed to join session')
      setLoading(false)
    })

    newSocket.on('user-joined', (data) => {
      console.log('User joined:', data)
      setParticipants(data.participantCount)
    })

    newSocket.on('user-left', (data) => {
      console.log('User left:', data)
      setParticipants(data.participantCount)
    })

    newSocket.on('session-ended', () => {
      console.log('Session ended')
      setError('Session has ended')
      setTimeout(() => {
        router.push('/dashboard')
      }, 3000)
    })

    // Error handling
    newSocket.on('error', (error) => {
      console.error('Socket error:', error)
      setError('Connection error occurred')
    })

    newSocket.on('connect_error', (error) => {
      console.error('Connection error:', error)
      setConnected(false)
      setError('Failed to connect to server')
    })

    return () => {
      newSocket.disconnect()
    }
  }, [user, sessionId, router])

  // Load session data and join session
  useEffect(() => {
    if (!user || !socket || !sessionId) return

    const loadSessionAndJoin = async () => {
      try {
        setLoading(true)
        setError(null)

        // Load session data
        const sessionResponse = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/sessions/${sessionId}`,
          {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
            },
          }
        )

        if (!sessionResponse.ok) {
          throw new Error('Session not found or access denied')
        }

        const sessionData = await sessionResponse.json()
        setSession(sessionData.session)

        // Determine user role
        let role: 'mentor' | 'student'
        if (sessionData.session.mentor_id === user._id) {
          role = 'mentor'
        } else if (sessionData.session.student_id === user._id) {
          role = 'student'
        } else {
          // User is not assigned to this session yet - try to join as student
          if (user.role === 'student') {
            // Join the session as student
            const joinResponse = await fetch(
              `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/sessions/join`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${localStorage.getItem('token')}`,
                },
                body: JSON.stringify({ sessionId }),
              }
            )

            if (!joinResponse.ok) {
              const joinError = await joinResponse.json()
              throw new Error(joinError.error || 'Failed to join session')
            }

            // Reload session data after joining
            const updatedSessionResponse = await fetch(
              `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/sessions/${sessionId}`,
              {
                headers: {
                  'Authorization': `Bearer ${localStorage.getItem('token')}`,
                },
              }
            )

            if (!updatedSessionResponse.ok) {
              throw new Error('Failed to reload session data')
            }

            const updatedSessionData = await updatedSessionResponse.json()
            setSession(updatedSessionData.session)
            role = 'student'
          } else {
            throw new Error('You are not authorized to join this session')
          }
        }

        setUserRole(role)

        // Join the session
        socket.emit('join-session', {
          sessionId,
          userId: user._id,
          role
        })

      } catch (err) {
        console.error('Error loading session:', err)
        setError(err instanceof Error ? err.message : 'Failed to load session')
        setLoading(false)
      }
    }

    loadSessionAndJoin()
  }, [user, socket, sessionId])

  // Handle page refresh - rejoin session
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (socket && joined) {
        socket.emit('leave-session')
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [socket, joined])

  // Loading state
  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-xl text-gray-600">
            {authLoading ? 'Authenticating...' : 'Joining session...'}
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Session Error</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  // Not authenticated
  if (!user) {
    router.push('/login')
    return null
  }

  // Main session interface
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top Video Call Bar */}
      <div className="bg-white border-b border-gray-200 p-4 shadow-sm">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold text-gray-900">
                Session: {sessionId.slice(-8)}
              </h1>
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-sm text-gray-600">
                  {connected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Role: <span className="font-medium capitalize">{userRole}</span>
              </span>
              <span className="text-sm text-gray-600">
                Participants: {participants}/2
              </span>
              {participants === 1 && (
                <span className="text-sm text-amber-600 bg-amber-100 px-2 py-1 rounded">
                  Waiting for {userRole === 'mentor' ? 'student' : 'mentor'} to join...
                </span>
              )}
              {userRole === 'mentor' && (
                <button
                  onClick={async () => {
                    if (confirm('Are you sure you want to end this session?')) {
                      try {
                        const response = await fetch(
                          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/sessions/end`,
                          {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              'Authorization': `Bearer ${localStorage.getItem('token')}`,
                            },
                            body: JSON.stringify({ sessionId }),
                          }
                        )

                        if (response.ok) {
                          alert('Session ended successfully')
                          router.push('/dashboard')
                        } else {
                          alert('Failed to end session')
                        }
                      } catch (error) {
                        alert('Failed to end session')
                      }
                    }
                  }}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm"
                >
                  End Session
                </button>
              )}
            </div>
          </div>

          {/* Video Call Section */}
          <div className="mt-4">
            {socket && userRole && participants === 2 && (
              <VideoCall
                socket={socket}
                sessionId={sessionId}
                userId={user._id}
                userRole={userRole}
              />
            )}
            {participants === 1 && (
              <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <div className="text-gray-500 text-lg mb-2">
                  {userRole === 'mentor'
                    ? 'Waiting for student to join...'
                    : 'Waiting for mentor to join...'
                  }
                </div>
                <div className="text-gray-400 text-sm">
                  Video call will start when both participants are connected
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side - Code Editor (70%) */}
        <div className="w-7/10 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Code Editor</h2>
            <p className="text-sm text-gray-600">
              {participants === 2
                ? 'Real-time collaborative coding'
                : 'Code editor will be available when both participants join'
              }
            </p>
          </div>
          <div className="flex-1 overflow-hidden">
            {participants === 2 ? (
              <CodeEditor sessionId={sessionId} />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <div className="text-4xl mb-4">📝</div>
                  <div>Waiting for both participants to join...</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Side - Chat Panel (30%) */}
        <div className="w-3/10 bg-white flex flex-col">
          {socket && userRole && participants === 2 ? (
            <ChatPanel
              socket={socket}
              sessionId={sessionId}
              userId={user._id}
              userRole={userRole}
              userName={user.name || `${userRole.charAt(0).toUpperCase() + userRole.slice(1)} User`}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <div className="text-4xl mb-4">💬</div>
                <div>Chat will be available when both participants join...</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}