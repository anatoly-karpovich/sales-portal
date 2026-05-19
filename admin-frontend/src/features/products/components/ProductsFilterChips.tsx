import { FilterChips } from '@/components/shared/FilterChips'
import { formatPrice } from '@/utils/number'

type Props = {
  search?: string
  searchPrefix: string
  manufacturerFilters: string[]
  manufacturerPrefix: string
  statusFilters: string[]
  statusPrefix: string
  pricePrefix: string
  minPrice: number | null
  maxPrice: number | null
  onRemoveSearch: () => void
  onRemoveManufacturerFilter: (value: string) => void
  onRemoveStatusFilter: (value: string) => void
  onRemovePriceFilter: () => void
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

function getPriceLabel(pricePrefix: string, minPrice: number | null, maxPrice: number | null) {
  if (typeof minPrice === 'number' && typeof maxPrice === 'number') {
    return withPrefix(pricePrefix, `${formatPrice(minPrice)} - ${formatPrice(maxPrice)}`)
  }

  if (typeof minPrice === 'number') {
    return withPrefix(pricePrefix, `>= ${formatPrice(minPrice)}`)
  }

  if (typeof maxPrice === 'number') {
    return withPrefix(pricePrefix, `<= ${formatPrice(maxPrice)}`)
  }

  return null
}

export function ProductsFilterChips({
  search,
  searchPrefix,
  manufacturerFilters,
  manufacturerPrefix,
  statusFilters,
  statusPrefix,
  pricePrefix,
  minPrice,
  maxPrice,
  onRemoveSearch,
  onRemoveManufacturerFilter,
  onRemoveStatusFilter,
  onRemovePriceFilter,
}: Props) {
  const priceLabel = getPriceLabel(pricePrefix, minPrice, maxPrice)
  const items = [
    ...(search
      ? [
          {
            key: `search-${search}`,
            label: withPrefix(searchPrefix, search),
            onDelete: onRemoveSearch,
            testId: 'products-list-filter-chips-search-chip',
          },
        ]
      : []),
    ...manufacturerFilters.map((value) => ({
      key: `manufacturer-${value}`,
      label: withPrefix(manufacturerPrefix, value),
      onDelete: () => onRemoveManufacturerFilter(value),
      testId: `products-list-filter-chips-manufacturer-${toFilterTestId(value)}-chip`,
    })),
    ...statusFilters.map((value) => ({
      key: `status-${value}`,
      label: withPrefix(statusPrefix, value),
      onDelete: () => onRemoveStatusFilter(value),
      testId: `products-list-filter-chips-status-${toFilterTestId(value)}-chip`,
    })),
    ...(priceLabel
      ? [
          {
            key: 'price',
            label: priceLabel,
            onDelete: onRemovePriceFilter,
            testId: 'products-list-filter-chips-price-chip',
          },
        ]
      : []),
  ]

  return (
    <FilterChips items={items} containerTestId="products-list-filter-chips" />
  )
}
