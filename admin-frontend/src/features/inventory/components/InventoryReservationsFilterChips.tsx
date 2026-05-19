import { FilterChips } from '@/components/shared/FilterChips'

type Props = {
  search: string
  searchPrefix: string
  typeFilters: string[]
  typePrefix: string
  fromDate: string
  fromDatePrefix: string
  toDate: string
  toDatePrefix: string
  expiresBefore: string
  expiresBeforePrefix: string
  sortLabel: string
  sortPrefix: string
  onRemoveSearch: () => void
  onRemoveType: (value: string) => void
  onRemoveFromDate: () => void
  onRemoveToDate: () => void
  onRemoveExpiresBefore: () => void
  onRemoveSort: () => void
}

function toFilterTestId(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function withPrefix(prefix: string, value: string) {
  return `${prefix}: ${value}`
}

function formatExpiresBeforeLabel(value: string) {
  if (!value) return ''
  return value.replace('T', ' ')
}

export function InventoryReservationsFilterChips({
  search,
  searchPrefix,
  typeFilters,
  typePrefix,
  fromDate,
  fromDatePrefix,
  toDate,
  toDatePrefix,
  expiresBefore,
  expiresBeforePrefix,
  sortLabel,
  sortPrefix,
  onRemoveSearch,
  onRemoveType,
  onRemoveFromDate,
  onRemoveToDate,
  onRemoveExpiresBefore,
  onRemoveSort,
}: Props) {
  const items = [
    ...(search
      ? [
          {
            key: `search-${search}`,
            label: withPrefix(searchPrefix, search),
            onDelete: onRemoveSearch,
            testId: 'inventory-reservations-filter-chips-search-chip',
          },
        ]
      : []),
    ...typeFilters.map((value) => ({
      key: `type-${value}`,
      label: withPrefix(typePrefix, value),
      onDelete: () => onRemoveType(value),
      testId: `inventory-reservations-filter-chips-type-${toFilterTestId(value)}-chip`,
    })),
    ...(fromDate
      ? [
          {
            key: `from-date-${fromDate}`,
            label: withPrefix(fromDatePrefix, fromDate),
            onDelete: onRemoveFromDate,
            testId: 'inventory-reservations-filter-chips-from-date-chip',
          },
        ]
      : []),
    ...(toDate
      ? [
          {
            key: `to-date-${toDate}`,
            label: withPrefix(toDatePrefix, toDate),
            onDelete: onRemoveToDate,
            testId: 'inventory-reservations-filter-chips-to-date-chip',
          },
        ]
      : []),
    ...(expiresBefore
      ? [
          {
            key: `expires-before-${expiresBefore}`,
            label: withPrefix(expiresBeforePrefix, formatExpiresBeforeLabel(expiresBefore)),
            onDelete: onRemoveExpiresBefore,
            testId: 'inventory-reservations-filter-chips-expires-before-chip',
          },
        ]
      : []),
    ...(sortLabel
      ? [
          {
            key: `sort-${sortLabel}`,
            label: withPrefix(sortPrefix, sortLabel),
            onDelete: onRemoveSort,
            testId: 'inventory-reservations-filter-chips-sort-chip',
          },
        ]
      : []),
  ]

  return (
    <FilterChips items={items} containerTestId="inventory-reservations-filter-chips" />
  )
}

