'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import SessionRoom from './SessionRoom'

interface DashboardProps {
  user: any
}

export default function Dashboard({ user }: DashboardProps) {
  const [role, setRole] = useState<'mentor' | 'student' | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [joinSessionId, setJoinSessionId] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const getProfile = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      setRole(data?.role)
    }
    getProfile()
  }, [user])

  const createSession = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({ title: 'Mentoring Session' }),
      })
      const data = await response.json()
      setSessionId(data.sessionId)
    } catch (error) {
      alert('Failed to create session')
    } finally {
      setLoading(false)
    }
  }

  const joinSession = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/sessions/${joinSessionId}/join`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      })
      if (response.ok) {
        setSessionId(joinSessionId)
      } else {
        alert('Failed to join session')
      }
    } catch (error) {
      alert('Failed to join session')
    } finally {
      setLoading(false)
    }
  }

  if (sessionId) {
    return <SessionRoom sessionId={sessionId} user={user} role={role!} />
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-6">Welcome, {role}!</h1>
        {role === 'mentor' && (
          <button
            onClick={createSession}
            disabled={loading}
            className="w-full bg-green-500 text-white p-2 rounded hover:bg-green-600 mb-4 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create New Session'}
          </button>
        )}
        {role === 'student' && (
          <div>
            <input
              type="text"
              placeholder="Enter Session ID"
              value={joinSessionId}
              onChange={(e) => setJoinSessionId(e.target.value)}
              className="w-full p-2 border rounded mb-4"
            />
            <button
              onClick={joinSession}
              disabled={loading || !joinSessionId}
              className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? 'Joining...' : 'Join Session'}
            </button>
          </div>
        )}
        <button
          onClick={() => supabase.auth.signOut()}
          className="w-full mt-4 bg-red-500 text-white p-2 rounded hover:bg-red-600"
        >
          Sign Out
        </button>
      </div>
    </div>
  )
}