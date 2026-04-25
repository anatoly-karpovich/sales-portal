import { Box, Button, Paper, Stack, Typography } from '@mui/material'

type Props = {
  errorMessage: string | null
  onRetry: () => void
  onGoHome: () => void
  onReload: () => void
}

export function AppCrashFallbackPage({ errorMessage, onRetry, onGoHome, onReload }: Props) {
  return (
    <Box
      sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', p: 2 }}
      data-testid="app-crash-fallback-page-container"
    >
      <Paper sx={{ p: 3, width: '100%', maxWidth: 560 }} data-testid="app-crash-fallback-page-card">
        <Typography variant="h5" sx={{ mb: 1 }} data-testid="app-crash-fallback-page-title">
          Something went wrong
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }} data-testid="app-crash-fallback-page-description">
          The page crashed unexpectedly. You can retry, go back to Home, or reload the app.
        </Typography>
        {errorMessage ? (
          <Typography
            variant="body2"
            color="error.main"
            sx={{ mb: 2, wordBreak: 'break-word' }}
            data-testid="app-crash-fallback-page-error-message"
          >
            {errorMessage}
          </Typography>
        ) : null}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} data-testid="app-crash-fallback-page-actions">
          <Button variant="outlined" onClick={onRetry} data-testid="app-crash-fallback-page-retry-button">
            Retry
          </Button>
          <Button variant="outlined" onClick={onGoHome} data-testid="app-crash-fallback-page-home-button">
            Home
          </Button>
          <Button variant="contained" onClick={onReload} data-testid="app-crash-fallback-page-reload-button">
            Reload
          </Button>
        </Stack>
      </Paper>
    </Box>
  )
}
