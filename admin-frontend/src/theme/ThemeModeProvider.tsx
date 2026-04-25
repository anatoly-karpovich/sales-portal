import { CssBaseline, ThemeProvider } from '@mui/material'
import { useMemo, useState } from 'react'
import { createAppTheme } from '@/theme/theme'
import { ThemeModeContext, type Mode, type ThemeModeContextValue } from '@/theme/theme-mode-context'

type Props = {
  children: React.ReactNode
}

const THEME_STORAGE_KEY = 'admin-frontend-theme-mode'

function getInitialMode(): Mode {
  const fromStorage = window.localStorage.getItem(THEME_STORAGE_KEY)
  return fromStorage === 'dark' ? 'dark' : 'light'
}

export function ThemeModeProvider({ children }: Props) {
  const [mode, setMode] = useState<Mode>(() => getInitialMode())

  const toggleMode = () => {
    setMode((currentMode) => {
      const nextMode = currentMode === 'light' ? 'dark' : 'light'
      window.localStorage.setItem(THEME_STORAGE_KEY, nextMode)
      return nextMode
    })
  }

  const value = useMemo<ThemeModeContextValue>(
    () => ({
      mode,
      toggleMode,
    }),
    [mode],
  )

  const theme = useMemo(() => createAppTheme(mode), [mode])

  return (
    <ThemeModeContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeModeContext.Provider>
  )
}
