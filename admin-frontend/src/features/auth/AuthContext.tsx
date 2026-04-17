import { useCallback, useEffect, useMemo, useState } from 'react'
import { subscribeToUnauthorized } from '@/api/events'
import { bootstrapAuthUser, clearSessionStorage, loginRequest, logoutRequest, readStoredUser } from '@/features/auth/auth.service'
import type { AuthContextValue } from '@/features/auth/auth.context'
import type { AppUser, AuthState } from '@/features/auth/auth.types'
import { AuthContext } from '@/features/auth/auth.context'

type Props = {
  children: React.ReactNode
}

export function AuthProvider({ children }: Props) {
  const [state, setState] = useState<AuthState>('initializing')
  const [user, setUser] = useState<AppUser | null>(() => readStoredUser())
  const resetToUnauthenticated = useCallback(() => {
    clearSessionStorage()
    setUser(null)
    setState('unauthenticated')
  }, [])

  useEffect(() => {
    let active = true

    const bootstrap = async () => {
      const bootstrappedUser = await bootstrapAuthUser()
      if (!active) return

      setUser(bootstrappedUser)
      setState(bootstrappedUser ? 'authenticated' : 'unauthenticated')
    }

    void bootstrap()

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    return subscribeToUnauthorized(() => {
      resetToUnauthenticated()
    })
  }, [resetToUnauthenticated])

  const login = useCallback(async (username: string, password: string) => {
    const loggedInUser = await loginRequest(username, password)
    setUser(loggedInUser)
    setState('authenticated')
  }, [])

  const logout = useCallback(async () => {
    try {
      await logoutRequest()
    } finally {
      resetToUnauthenticated()
    }
  }, [resetToUnauthenticated])

  const value = useMemo<AuthContextValue>(
    () => ({
      state,
      user,
      login,
      logout,
    }),
    [state, user, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
