'use client'

import { useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import Dashboard from '@/components/Dashboard'

export default function MentorDashboardPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login')
      } else if (user.role !== 'mentor') {
        router.push('/dashboard/student')
      }
    }
  }, [loading, user, router])

  if (loading || !user || user.role !== 'mentor') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl font-semibold text-gray-700">Loading...</div>
      </div>
    )
  }

  return <Dashboard user={user} />
}