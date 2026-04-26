import { Stack, Chip } from '@mui/material'

type Props = {
  search?: string
  searchPrefix?: string
  filters: string[]
  filterPrefix?: string
  onRemoveSearch: () => void
  onRemoveFilter: (value: string) => void
}

function withPrefix(prefix: string | undefined, value: string) {
  return prefix ? `${prefix}: ${value}` : value
}

export function FilterChips({
  search,
  searchPrefix,
  filters,
  filterPrefix,
  onRemoveSearch,
  onRemoveFilter,
}: Props) {
  if (!search && filters.length === 0) {
    return null
  }
  const toFilterTestId = (value: string) => value.toLowerCase().replace(/\s+/g, '-')

  return (
    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap data-testid="filter-chips">
      {search ? (
        <Chip
          color="primary"
          label={withPrefix(searchPrefix, search)}
          onDelete={onRemoveSearch}
          data-testid="filter-chips-search-chip"
        />
      ) : null}
      {filters.map((value) => (
        <Chip
          key={value}
          color="primary"
          variant="outlined"
          label={withPrefix(filterPrefix, value)}
          onDelete={() => onRemoveFilter(value)}
          data-testid={`filter-chips-filter-${toFilterTestId(value)}-chip`}
        />
      ))}
    </Stack>
  )
}
