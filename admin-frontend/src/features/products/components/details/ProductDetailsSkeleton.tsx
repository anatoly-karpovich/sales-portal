import { Paper, Skeleton, Stack } from '@mui/material'

export function ProductDetailsSkeleton() {
  return (
    <Stack spacing={2.5} data-testid="product-details-page-skeleton">
      <Skeleton variant="text" width={220} height={36} />
      <Paper sx={{ p: { xs: 2, md: 3 } }}>
        <Stack spacing={2}>
          <Skeleton variant="text" width={240} height={38} />
          <Skeleton variant="text" width={540} height={28} />
          <Skeleton variant="rounded" height={220} />
          <Skeleton variant="rounded" height={260} />
        </Stack>
      </Paper>
    </Stack>
  )
}
