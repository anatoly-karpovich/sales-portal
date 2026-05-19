import { FilterChips } from '@/components/shared/FilterChips'

type Props = {
  search?: string
  searchPrefix: string
  manufacturerFilters: string[]
  manufacturerPrefix: string
  productStatusFilters: string[]
  productStatusPrefix: string
  inventoryStatusFilters: string[]
  inventoryStatusPrefix: string
  onRemoveSearch: () => void
  onRemoveManufacturerFilter: (value: string) => void
  onRemoveProductStatusFilter: (value: string) => void
  onRemoveInventoryStatusFilter: (value: string) => void
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

export function InventoryFilterChips({
  search,
  searchPrefix,
  manufacturerFilters,
  manufacturerPrefix,
  productStatusFilters,
  productStatusPrefix,
  inventoryStatusFilters,
  inventoryStatusPrefix,
  onRemoveSearch,
  onRemoveManufacturerFilter,
  onRemoveProductStatusFilter,
  onRemoveInventoryStatusFilter,
}: Props) {
  const items = [
    ...(search
      ? [
          {
            key: `search-${search}`,
            label: withPrefix(searchPrefix, search),
            onDelete: onRemoveSearch,
            testId: 'inventory-list-filter-chips-search-chip',
          },
        ]
      : []),
    ...inventoryStatusFilters.map((value) => ({
      key: `inventory-status-${value}`,
      label: withPrefix(inventoryStatusPrefix, value),
      onDelete: () => onRemoveInventoryStatusFilter(value),
      testId: `inventory-list-filter-chips-inventory-status-${toFilterTestId(value)}-chip`,
    })),
    ...productStatusFilters.map((value) => ({
      key: `product-status-${value}`,
      label: withPrefix(productStatusPrefix, value),
      onDelete: () => onRemoveProductStatusFilter(value),
      testId: `inventory-list-filter-chips-product-status-${toFilterTestId(value)}-chip`,
    })),
    ...manufacturerFilters.map((value) => ({
      key: `manufacturer-${value}`,
      label: withPrefix(manufacturerPrefix, value),
      onDelete: () => onRemoveManufacturerFilter(value),
      testId: `inventory-list-filter-chips-manufacturer-${toFilterTestId(value)}-chip`,
    })),
  ]

  return (
    <FilterChips items={items} containerTestId="inventory-list-filter-chips" />
  )
}
