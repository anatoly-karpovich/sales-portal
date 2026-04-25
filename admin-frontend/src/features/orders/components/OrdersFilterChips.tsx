import { Chip, Stack } from '@mui/material'

type Props = {
  search?: string
  searchPrefix: string
  statusFilters: string[]
  deliveryStatusFilters: string[]
  orderStatusPrefix: string
  deliveryStatusPrefix: string
  onRemoveSearch: () => void
  onRemoveStatusFilter: (value: string) => void
  onRemoveDeliveryStatusFilter: (value: string) => void
}

function toFilterTestId(value: string) {
  return value.toLowerCase().replace(/\s+/g, '-')
}

function withPrefix(prefix: string, value: string) {
  return `${prefix}: ${value}`
}

export function OrdersFilterChips({
  search,
  searchPrefix,
  statusFilters,
  deliveryStatusFilters,
  orderStatusPrefix,
  deliveryStatusPrefix,
  onRemoveSearch,
  onRemoveStatusFilter,
  onRemoveDeliveryStatusFilter,
}: Props) {
  if (!search && statusFilters.length === 0 && deliveryStatusFilters.length === 0) {
    return null
  }

  return (
    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap data-testid="orders-list-filter-chips">
      {search ? (
        <Chip
          color="primary"
          variant="outlined"
          label={withPrefix(searchPrefix, search)}
          onDelete={onRemoveSearch}
          data-testid="orders-list-filter-chips-search-chip"
        />
      ) : null}

      {statusFilters.map((value) => (
        <Chip
          key={`status-${value}`}
          color="primary"
          variant="outlined"
          label={withPrefix(orderStatusPrefix, value)}
          onDelete={() => onRemoveStatusFilter(value)}
          data-testid={`orders-list-filter-chips-order-status-${toFilterTestId(value)}-chip`}
        />
      ))}

      {deliveryStatusFilters.map((value) => (
        <Chip
          key={`delivery-status-${value}`}
          color="primary"
          variant="outlined"
          label={withPrefix(deliveryStatusPrefix, value)}
          onDelete={() => onRemoveDeliveryStatusFilter(value)}
          data-testid={`orders-list-filter-chips-delivery-status-${toFilterTestId(value)}-chip`}
        />
      ))}
    </Stack>
  )
}
