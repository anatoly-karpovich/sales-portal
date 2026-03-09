import { CircularProgress, FormControl, MenuItem, Pagination, Select, Stack, Typography } from '@mui/material'
import { PAGE_LIMIT_OPTIONS } from '@/constants/dictionaries'

type Props = {
  total: number
  page: number
  limit: number
  isLoading?: boolean
  onPageChange: (page: number) => void
  onLimitChange: (limit: number) => void
}

export function PaginationControls({ total, page, limit, isLoading = false, onPageChange, onLimitChange }: Props) {
  const pageCount = Math.max(Math.ceil(total / limit), 1)

  return (
    <Stack
      direction={{ xs: 'column', md: 'row' }}
      spacing={1.5}
      alignItems={{ xs: 'flex-start', md: 'center' }}
      justifyContent="space-between"
      sx={{ px: { xs: 0, md: 1.5 }, pt: 0.5 }}
    >
      <Stack direction="row" spacing={1} alignItems="center">
        <Typography variant="body2">Items on page:</Typography>
        <FormControl size="small">
          <Select value={limit} onChange={(event) => onLimitChange(Number(event.target.value))} disabled={isLoading}>
            {PAGE_LIMIT_OPTIONS.map((value) => (
              <MenuItem key={value} value={value}>
                {value}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        {isLoading ? (
          <Stack direction="row" spacing={0.75} alignItems="center" sx={{ pl: 0.5 }}>
            <CircularProgress size={14} />
            <Typography variant="caption" color="text.secondary">
              Updating...
            </Typography>
          </Stack>
        ) : null}
      </Stack>

      <Pagination
        page={Math.min(page, pageCount)}
        count={pageCount}
        onChange={(_, value) => onPageChange(value)}
        shape="rounded"
        color="primary"
        disabled={isLoading}
      />
    </Stack>
  )
}
