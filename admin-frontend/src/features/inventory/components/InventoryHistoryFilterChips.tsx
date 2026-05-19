import { FilterChips } from '@/components/shared/FilterChips'

type Props = {
  selectedVariantLabel: string
  variantPrefix: string
  isAllVariantsSelected: boolean
  typeFilters: string[]
  typePrefix: string
  orderId: string
  orderIdPrefix: string
  fromDate: string
  fromDatePrefix: string
  toDate: string
  toDatePrefix: string
  sortLabel: string
  sortPrefix: string
  onResetVariant: () => void
  onRemoveType: (value: string) => void
  onRemoveOrderId: () => void
  onRemoveFromDate: () => void
  onRemoveToDate: () => void
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

export function InventoryHistoryFilterChips({
  selectedVariantLabel,
  variantPrefix,
  isAllVariantsSelected,
  typeFilters,
  typePrefix,
  orderId,
  orderIdPrefix,
  fromDate,
  fromDatePrefix,
  toDate,
  toDatePrefix,
  sortLabel,
  sortPrefix,
  onResetVariant,
  onRemoveType,
  onRemoveOrderId,
  onRemoveFromDate,
  onRemoveToDate,
  onRemoveSort,
}: Props) {
  const items = [
    ...(!isAllVariantsSelected
      ? [
          {
            key: `variant-${selectedVariantLabel}`,
            label: withPrefix(variantPrefix, selectedVariantLabel),
            onDelete: onResetVariant,
            testId: 'inventory-history-filter-chips-variant-chip',
          },
        ]
      : []),
    ...typeFilters.map((value) => ({
      key: `type-${value}`,
      label: withPrefix(typePrefix, value),
      onDelete: () => onRemoveType(value),
      testId: `inventory-history-filter-chips-type-${toFilterTestId(value)}-chip`,
    })),
    ...(orderId
      ? [
          {
            key: `order-${orderId}`,
            label: withPrefix(orderIdPrefix, orderId),
            onDelete: onRemoveOrderId,
            testId: 'inventory-history-filter-chips-order-id-chip',
          },
        ]
      : []),
    ...(fromDate
      ? [
          {
            key: `from-${fromDate}`,
            label: withPrefix(fromDatePrefix, fromDate),
            onDelete: onRemoveFromDate,
            testId: 'inventory-history-filter-chips-from-date-chip',
          },
        ]
      : []),
    ...(toDate
      ? [
          {
            key: `to-${toDate}`,
            label: withPrefix(toDatePrefix, toDate),
            onDelete: onRemoveToDate,
            testId: 'inventory-history-filter-chips-to-date-chip',
          },
        ]
      : []),
    ...(sortLabel
      ? [
          {
            key: `sort-${sortLabel}`,
            label: withPrefix(sortPrefix, sortLabel),
            onDelete: onRemoveSort,
            testId: 'inventory-history-filter-chips-sort-chip',
          },
        ]
      : []),
  ]

  return (
    <FilterChips items={items} containerTestId="inventory-history-filter-chips" />
  )
}
