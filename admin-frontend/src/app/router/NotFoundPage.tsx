import { Box, Button, Paper, Typography } from '@mui/material'
import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <Box
      sx={{ minHeight: 'calc(100vh - 120px)', display: 'grid', placeItems: 'center' }}
      data-testid="not-found-page-container"
    >
      <Paper sx={{ p: 3, width: '100%', maxWidth: 560 }} data-testid="not-found-page-card">
        <Typography variant="h4" sx={{ mb: 1 }} data-testid="not-found-page-code">
          404
        </Typography>
        <Typography variant="h6" sx={{ mb: 1 }} data-testid="not-found-page-title">
          Page not found
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }} data-testid="not-found-page-description">
          The requested page does not exist or the link is outdated.
        </Typography>
        <Box data-testid="not-found-page-actions">
          <Button component={Link} to="/home" variant="contained" data-testid="not-found-page-home-button">
            Go to Home
          </Button>
        </Box>
      </Paper>
    </Box>
  )
}
