'use client'

import { useState, useEffect } from 'react'
import { authAPI } from '@/lib/supabase'
import SessionRoom from './SessionRoom'

interface User {
  _id: string
  email: string
  name: string
  role: 'mentor' | 'student'
}

interface Session {
  id: string
  mentor: User
  student?: User
  status: 'active' | 'ended'
  createdAt: string
  title?: string
  sessionLink?: string
}

interface DashboardProps {
  user: User
}

export default function Dashboard({ user }: DashboardProps) {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [joinSessionId, setJoinSessionId] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessions, setSessions] = useState<Session[]>([])
  const [loadingSessions, setLoadingSessions] = useState(true)

  useEffect(() => {
    fetchUserSessions()
  }, [])

  const fetchUserSessions = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/sessions`, {
        headers: {
          'Authorization': `Bearer ${authAPI.getToken()}`,
        },
      })
      const data = await response.json()
      if (data.success) {
        setSessions(data.sessions)
      }
    } catch (error) {
      console.error('Failed to fetch sessions:', error)
    } finally {
      setLoadingSessions(false)
    }
  }

  const createSession = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/sessions/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authAPI.getToken()}`,
        },
        body: JSON.stringify({ title: 'Mentoring Session' }),
      })
      const data = await response.json()
      if (data.success && data.session) {
        // Show success message with session link
        const sessionLink = `${window.location.origin}/session/${data.session.id}`
        alert(`Session created successfully!\n\nShare this link with your student:\n${sessionLink}`)

        // Copy to clipboard automatically
        navigator.clipboard.writeText(sessionLink).then(() => {
          console.log('Session link copied to clipboard')
        }).catch(() => {
          console.log('Failed to copy to clipboard')
        })

        setSessionId(data.session.id)
        fetchUserSessions() // Refresh sessions list
      }
    } catch (error) {
      alert('Failed to create session')
    } finally {
      setLoading(false)
    }
  }

  const joinSession = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/sessions/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authAPI.getToken()}`,
        },
        body: JSON.stringify({ sessionId: joinSessionId }),
      })
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.session) {
          setSessionId(data.session.id)
          fetchUserSessions() // Refresh sessions list
        }
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to join session')
      }
    } catch (error) {
      alert('Failed to join session')
    } finally {
      setLoading(false)
    }
  }

  const copySessionLink = (session: Session) => {
    const link = session.sessionLink || `${window.location.origin}/join/${session.id}`
    navigator.clipboard.writeText(link)
    alert('Session link copied to clipboard!')
  }

  if (sessionId) {
    return <SessionRoom sessionId={sessionId} user={user} role={user.role} />
  }

  const activeSessions = sessions.filter(session => session.status === 'active')
  const userSessions = user.role === 'mentor'
? activeSessions.filter(session => session.mentor._id === user._id)
    : activeSessions.filter(session => session.student?._id === user._id)

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {user.name}!
          </h1>
          <p className="text-gray-600">
            {user.role === 'mentor' ? 'Manage your mentoring sessions' : 'Join mentoring sessions'}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Main Action Card */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900">
              {user.role === 'mentor' ? 'Create New Session' : 'Join a Session'}
            </h2>

            {user.role === 'mentor' ? (
              <div className="space-y-4">
                <p className="text-gray-600">
                  Start a new mentoring session for students to join.
                </p>
                <button
                  onClick={createSession}
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {loading ? 'Creating Session...' : 'Create Session'}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-gray-600">
                  Enter a session link to join a mentoring session.
                </p>
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Enter session link or ID"
                    value={joinSessionId}
                    onChange={(e) => setJoinSessionId(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                  <button
                    onClick={joinSession}
                    disabled={loading || !joinSessionId.trim()}
                    className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    {loading ? 'Joining Session...' : 'Join Session'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Sessions Overview Card */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900">
              {user.role === 'mentor' ? 'Your Active Sessions' : 'Your Joined Sessions'}
            </h2>

            {loadingSessions ? (
              <div className="text-center py-8">
                <div className="text-gray-500">Loading sessions...</div>
              </div>
            ) : userSessions.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-500">
                  {user.role === 'mentor'
                    ? 'No active sessions. Create one to get started!'
                    : 'No joined sessions yet. Join a session to begin learning!'
                  }
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {userSessions.map((session) => (
                  <div
                    key={session.id}
                    className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium text-gray-900">
                        {session.title || 'Mentoring Session'}
                      </h3>
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                        Active
                      </span>
                    </div>

                    <div className="text-sm text-gray-600 mb-3">
                      {user.role === 'mentor' ? (
                        <div>
                          Student: {session.student ? session.student.name : 'Waiting for student'}
                        </div>
                      ) : (
                        <div>
                          Mentor: {session.mentor.name}
                        </div>
                      )}
                    </div>

                    <div className="flex space-x-2">
                      <button
                        onClick={() => setSessionId(session.id)}
                        className="flex-1 bg-blue-600 text-white py-2 px-3 rounded text-sm hover:bg-blue-700 transition-colors"
                      >
                        Enter Session
                      </button>

                      {user.role === 'mentor' && (
                        <button
                          onClick={() => copySessionLink(session)}
                          className="px-3 py-2 border border-gray-300 rounded text-sm hover:bg-gray-50 transition-colors"
                          title="Copy session link"
                        >
                          📋
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sign Out Button */}
        <div className="mt-8 text-center">
          <button
            onClick={() => {
              authAPI.logout()
              window.location.reload()
            }}
            className="bg-red-600 text-white py-2 px-6 rounded-lg hover:bg-red-700 transition-colors font-medium"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}