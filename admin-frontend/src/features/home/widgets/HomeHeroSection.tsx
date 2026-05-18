import { Box, Stack, Typography } from '@mui/material'

export function HomeHeroSection() {
  return (
    <>
      <Box sx={{ p: { xs: 3, md: 5 } }} data-testid="home-hero-section">
        <Stack spacing={1} alignItems="center" textAlign="center" data-testid="home-hero-primary">
          <Typography variant="h4" sx={{ fontWeight: 700 }} data-testid="home-hero-title">
            Welcome to Sales Management Portal
          </Typography>
          <Typography color="text.secondary" data-testid="home-hero-description">
            Monitor key metrics, manage orders, and optimize customer interactions - all in one
            place.
          </Typography>
        </Stack>
      </Box>

      <Stack
        spacing={1}
        alignItems="center"
        textAlign="center"
        sx={{ py: { xs: 2, md: 3 } }}
        data-testid="home-hero-secondary"
      >
        <Typography variant="h4" sx={{ fontWeight: 700 }} data-testid="home-hero-metrics-title">
          Business Metrics Overview
        </Typography>
        <Typography color="text.secondary" data-testid="home-hero-metrics-description">
          Here you can track the key metrics and performance indicators of your store.
        </Typography>
      </Stack>
    </>
  )
}
