'use client'

import { useState, useEffect, useContext, createContext, ReactNode } from 'react'
import { authAPI } from '@/lib/supabase'

interface User {
  id: string
  _id: string
  email: string
  name: string
  role: 'mentor' | 'student'
}

interface AuthContextType {
  user: User | null
  loading: boolean
  signOut: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshUser = async () => {
    try {
      const userData = await authAPI.getCurrentUser()
      if (userData) {
        // Normalize id field so session page works with _id reference
        const normalizedUser = {
          ...userData,
          _id: userData._id || userData.id || userData?.userId || null,
          id: userData.id || userData._id || null
        }
        setUser(normalizedUser as any)
      } else {
        setUser(null)
      }
    } catch (error) {
      setUser(null)
      authAPI.logout()
    }
  }

  useEffect(() => {
    const initAuth = async () => {
      const token = authAPI.getToken()
      if (token) {
        await refreshUser()
      }
      setLoading(false)
    }

    initAuth()
  }, [])

  const signOut = () => {
    authAPI.logout()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}