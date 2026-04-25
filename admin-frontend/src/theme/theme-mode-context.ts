import { createContext, useContext } from 'react'

export type Mode = 'light' | 'dark'

export type ThemeModeContextValue = {
  mode: Mode
  toggleMode: () => void
}

export const ThemeModeContext = createContext<ThemeModeContextValue | undefined>(undefined)

export function useThemeMode() {
  const context = useContext(ThemeModeContext)
  if (!context) {
    throw new Error('useThemeMode must be used within ThemeModeProvider')
  }
  return context
}
