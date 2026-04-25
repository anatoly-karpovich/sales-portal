import { createTheme } from '@mui/material'

export function createAppTheme(mode: 'light' | 'dark') {
  const scrollbarThumb = mode === 'dark' ? '#5f6b7b' : '#bac4cf'
  const scrollbarThumbHover = mode === 'dark' ? '#748398' : '#9facba'
  const scrollbarThumbActive = mode === 'dark' ? '#8a9db7' : '#8898ab'

  return createTheme({
    palette: {
      mode,
      primary: {
        main: mode === 'dark' ? '#64b5f6' : '#1976d2',
      },
      background: {
        default: mode === 'dark' ? '#111827' : '#f8fafc',
        paper: mode === 'dark' ? '#1f2937' : '#ffffff',
      },
    },
    shape: {
      borderRadius: 10,
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          '*': {
            scrollbarWidth: 'thin',
            scrollbarColor: `${scrollbarThumb} transparent`,
          },
          '*::-webkit-scrollbar': {
            width: 8,
            height: 8,
          },
          '*::-webkit-scrollbar-track': {
            background: 'transparent',
          },
          '*::-webkit-scrollbar-thumb': {
            backgroundColor: scrollbarThumb,
            borderRadius: 8,
            border: '2px solid transparent',
            backgroundClip: 'content-box',
          },
          '*::-webkit-scrollbar-thumb:hover': {
            backgroundColor: scrollbarThumbHover,
          },
          '*::-webkit-scrollbar-thumb:active': {
            backgroundColor: scrollbarThumbActive,
          },
          '*::-webkit-scrollbar-corner': {
            background: 'transparent',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
          },
        },
      },
    },
  })
}
