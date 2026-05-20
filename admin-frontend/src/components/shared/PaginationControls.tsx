import {
  CircularProgress,
  FormControl,
  MenuItem,
  Pagination,
  Select,
  Stack,
  Typography,
} from '@mui/material'
import { PAGE_LIMIT_OPTIONS } from '@/constants/dictionaries'

type Props = {
  total: number
  page: number
  limit: number
  isLoading?: boolean
  onPageChange: (page: number) => void
  onLimitChange: (limit: number) => void
}

export function PaginationControls({
  total,
  page,
  limit,
  isLoading = false,
  onPageChange,
  onLimitChange,
}: Props) {
  const pageCount = Math.max(Math.ceil(total / limit), 1)

  return (
    <Stack
      direction={{ xs: 'column', md: 'row' }}
      spacing={1.5}
      alignItems={{ xs: 'flex-start', md: 'center' }}
      justifyContent="space-between"
      sx={{ px: { xs: 0, md: 1.5 }, pt: 0.5 }}
      data-testid="pagination-controls"
    >
      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        data-testid="pagination-controls-limit-section"
      >
        <Typography variant="body2" data-testid="pagination-controls-limit-label">
          Items on page:
        </Typography>
        <FormControl size="small" data-testid="pagination-controls-limit-control">
          <Select
            value={limit}
            onChange={(event) => onLimitChange(Number(event.target.value))}
            disabled={isLoading}
            data-testid="pagination-controls-limit-select"
          >
            {PAGE_LIMIT_OPTIONS.map((value) => (
              <MenuItem
                key={value}
                value={value}
                data-testid={`pagination-controls-limit-option-${value}`}
              >
                {value}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        {isLoading ? (
          <Stack
            direction="row"
            spacing={0.75}
            alignItems="center"
            sx={{ pl: 0.5 }}
            data-testid="pagination-controls-loading-state"
          >
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
        data-testid="pagination-controls-page-selector"
      />
    </Stack>
  )
}
