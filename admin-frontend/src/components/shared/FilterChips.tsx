import { Stack, Chip } from '@mui/material'

type Props = {
  search?: string
  filters: string[]
  onRemoveSearch: () => void
  onRemoveFilter: (value: string) => void
}

export function FilterChips({ search, filters, onRemoveSearch, onRemoveFilter }: Props) {
  if (!search && filters.length === 0) {
    return null
  }

  return (
    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
      {search ? <Chip color="primary" label={search} onDelete={onRemoveSearch} /> : null}
      {filters.map((value) => (
        <Chip key={value} color="primary" variant="outlined" label={value} onDelete={() => onRemoveFilter(value)} />
      ))}
    </Stack>
  )
}
