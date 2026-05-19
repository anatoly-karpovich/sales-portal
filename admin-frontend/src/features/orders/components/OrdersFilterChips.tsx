import { FilterChips } from '@/components/shared/FilterChips'

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
  const items = [
    ...(search
      ? [
          {
            key: `search-${search}`,
            label: withPrefix(searchPrefix, search),
            onDelete: onRemoveSearch,
            testId: 'orders-list-filter-chips-search-chip',
          },
        ]
      : []),
    ...statusFilters.map((value) => ({
      key: `status-${value}`,
      label: withPrefix(orderStatusPrefix, value),
      onDelete: () => onRemoveStatusFilter(value),
      testId: `orders-list-filter-chips-order-status-${toFilterTestId(value)}-chip`,
    })),
    ...deliveryStatusFilters.map((value) => ({
      key: `delivery-status-${value}`,
      label: withPrefix(deliveryStatusPrefix, value),
      onDelete: () => onRemoveDeliveryStatusFilter(value),
      testId: `orders-list-filter-chips-delivery-status-${toFilterTestId(value)}-chip`,
    })),
  ]

  return (
    <FilterChips items={items} containerTestId="orders-list-filter-chips" />
  )
}
