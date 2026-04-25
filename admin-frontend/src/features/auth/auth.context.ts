import { createContext } from 'react'
import type { AppUser, AuthState } from '@/features/auth/auth.types'

export type AuthContextValue = {
  state: AuthState
  user: AppUser | null
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)
