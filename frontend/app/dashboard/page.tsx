'use client'

import { useAuth } from '@/hooks/useAuth'
import Dashboard from '@/components/Dashboard'

export default function DashboardPage() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Please log in to access the dashboard.</div>
      </div>
    )
  }

  return <Dashboard user={user} />
}