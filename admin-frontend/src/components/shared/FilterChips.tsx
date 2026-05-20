import { Chip, Stack, type ChipProps } from '@mui/material'

type FilterChipItem = {
  key: string
  label: string
  onDelete: () => void
  testId: string
  color?: ChipProps['color']
  variant?: ChipProps['variant']
}

type Props = {
  items?: FilterChipItem[]
  containerTestId?: string
  enableHover?: boolean
  search?: string
  searchPrefix?: string
  filters?: string[]
  filterPrefix?: string
  onRemoveSearch?: () => void
  onRemoveFilter?: (value: string) => void
}

function withPrefix(prefix: string | undefined, value: string) {
  return prefix ? `${prefix}: ${value}` : value
}

const CHIP_HOVER_SX = {
  transition: 'border-color 120ms ease, transform 120ms ease',
  '&:hover': {
    borderColor: 'primary.main',
    transform: 'translateY(-1px)',
  },
}

export function FilterChips({
  items,
  containerTestId = 'filter-chips',
  enableHover = true,
  search,
  searchPrefix,
  filters,
  filterPrefix,
  onRemoveSearch,
  onRemoveFilter,
}: Props) {
  const normalizedFilters = filters ?? []
  const toFilterTestId = (value: string) => value.toLowerCase().replace(/\s+/g, '-')
  const legacyItems: FilterChipItem[] = [
    ...(search && onRemoveSearch
      ? [
          {
            key: `search-${search}`,
            label: withPrefix(searchPrefix, search),
            onDelete: onRemoveSearch,
            testId: 'filter-chips-search-chip',
            color: 'primary' as const,
            variant: 'filled' as const,
          },
        ]
      : []),
    ...normalizedFilters.map((value) => ({
      key: value,
      label: withPrefix(filterPrefix, value),
      onDelete: () => onRemoveFilter?.(value),
      testId: `filter-chips-filter-${toFilterTestId(value)}-chip`,
      color: 'primary' as const,
      variant: 'outlined' as const,
    })),
  ]

  const resolvedItems = items ?? legacyItems

  if (resolvedItems.length === 0) {
    return null
  }

  return (
    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap data-testid={containerTestId}>
      {resolvedItems.map((item) => (
        <Chip
          key={item.key}
          color={item.color ?? 'primary'}
          variant={item.variant ?? 'outlined'}
          label={item.label}
          onDelete={item.onDelete}
          sx={enableHover ? CHIP_HOVER_SX : undefined}
          data-testid={item.testId}
        />
      ))}
    </Stack>
  )
}
