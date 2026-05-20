import { Box, Paper, Skeleton, Stack } from '@mui/material'

export function HomePageSkeleton() {
  return (
    <Stack
      spacing={4}
      sx={{ maxWidth: 1300, mx: 'auto', width: '100%' }}
      data-testid="home-page-skeleton"
    >
      <Box sx={{ p: { xs: 3, md: 5 } }} data-testid="home-page-skeleton-hero">
        <Stack spacing={1} alignItems="center">
          <Skeleton variant="text" width="44%" height={54} />
          <Skeleton variant="text" width="62%" height={28} />
        </Stack>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' },
        }}
      >
        {Array.from({ length: 3 }).map((_, idx) => (
          <Paper key={`actions-skeleton-${idx}`} sx={{ p: 3 }}>
            <Stack spacing={1.1} alignItems="center">
              <Skeleton variant="circular" width={44} height={44} />
              <Skeleton variant="text" width="50%" height={30} />
              <Skeleton variant="text" width="88%" />
              <Skeleton variant="text" width="75%" />
              <Skeleton variant="rounded" width={120} height={36} />
            </Stack>
          </Paper>
        ))}
      </Box>

      <Stack spacing={1} alignItems="center">
        <Skeleton variant="text" width="34%" height={46} />
        <Skeleton variant="text" width="58%" />
      </Stack>

      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, minmax(0, 1fr))',
            lg: 'repeat(5, minmax(0, 1fr))',
          },
        }}
      >
        {Array.from({ length: 5 }).map((_, idx) => (
          <Paper key={`metrics-skeleton-${idx}`} sx={{ p: 2.5 }}>
            <Stack spacing={1} alignItems="center">
              <Skeleton variant="circular" width={28} height={28} />
              <Skeleton variant="text" width="72%" />
              <Skeleton variant="text" width="58%" height={42} />
            </Stack>
          </Paper>
        ))}
      </Box>

      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
        {Array.from({ length: 6 }).map((_, idx) => (
          <Paper key={`grid-skeleton-${idx}`} sx={{ p: 2.5, minHeight: 280 }}>
            <Skeleton variant="rounded" height={240} />
          </Paper>
        ))}
      </Box>

      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
        {Array.from({ length: 2 }).map((_, idx) => (
          <Paper key={`table-skeleton-${idx}`} sx={{ p: 2.5 }}>
            <Skeleton variant="text" width="44%" height={34} />
            {Array.from({ length: 5 }).map((__, rowIdx) => (
              <Skeleton
                key={`table-skeleton-${idx}-row-${rowIdx}`}
                variant="text"
                width="100%"
                height={30}
              />
            ))}
          </Paper>
        ))}
      </Box>
    </Stack>
  )
}
