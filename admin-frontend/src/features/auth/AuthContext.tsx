import { useEffect, useMemo, useState } from 'react'
import { API_UNAUTHORIZED_EVENT } from '@/api/events'
import { TOKEN_STORAGE_KEY } from '@/api/client'
import { clearSessionStorage, loginRequest, logoutRequest, meRequest, readStoredUser } from '@/features/auth/auth.service'
import type { AuthContextValue } from '@/features/auth/auth.context'
import type { AppUser, AuthState } from '@/features/auth/auth.types'
import { AuthContext } from '@/features/auth/auth.context'

type Props = {
  children: React.ReactNode
}

export function AuthProvider({ children }: Props) {
  const [state, setState] = useState<AuthState>('initializing')
  const [user, setUser] = useState<AppUser | null>(() => readStoredUser())

  useEffect(() => {
    let active = true

    const bootstrap = async () => {
      const token = window.localStorage.getItem(TOKEN_STORAGE_KEY)
      if (!token) {
        if (!active) return
        setState('unauthenticated')
        return
      }

      try {
        const me = await meRequest()
        if (!active) return
        setUser(me)
        setState('authenticated')
      } catch {
        if (!active) return
        clearSessionStorage()
        setUser(null)
        setState('unauthenticated')
      }
    }

    bootstrap()

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    const onUnauthorized = () => {
      clearSessionStorage()
      setUser(null)
      setState('unauthenticated')
    }

    window.addEventListener(API_UNAUTHORIZED_EVENT, onUnauthorized)
    return () => window.removeEventListener(API_UNAUTHORIZED_EVENT, onUnauthorized)
  }, [])

  const login = async (username: string, password: string) => {
    const loggedInUser = await loginRequest(username, password)
    setUser(loggedInUser)
    setState('authenticated')
  }

  const logout = async () => {
    try {
      await logoutRequest()
    } finally {
      clearSessionStorage()
      setUser(null)
      setState('unauthenticated')
    }
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      state,
      user,
      login,
      logout,
    }),
    [state, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
