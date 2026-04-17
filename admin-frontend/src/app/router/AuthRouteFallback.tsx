import { Box, CircularProgress } from '@mui/material'

export function AuthRouteFallback() {
  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', p: 2 }} data-testid="auth-route-fallback">
      <CircularProgress size={28} />
    </Box>
  )
}
