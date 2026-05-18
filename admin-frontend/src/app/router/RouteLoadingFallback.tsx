import { Box, CircularProgress } from '@mui/material'

export function RouteLoadingFallback() {
  return (
    <Box
      sx={{ minHeight: 'calc(100vh - 120px)', display: 'grid', placeItems: 'center', p: 2 }}
      data-testid="route-loading-fallback"
    >
      <CircularProgress size={28} />
    </Box>
  )
}
