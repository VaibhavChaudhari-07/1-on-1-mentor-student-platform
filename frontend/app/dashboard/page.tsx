'use client'

import { useAuth } from '@/hooks/useAuth'
import Dashboard from '@/components/Dashboard'

export default function DashboardPage() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse">
          <div className="text-2xl font-semibold text-gray-700">Loading...</div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-semibold text-gray-700 mb-4">Access Denied</div>
          <div className="text-gray-500">Please log in to access the dashboard.</div>
        </div>
      </div>
    )
  }

  return <Dashboard user={user} />
}