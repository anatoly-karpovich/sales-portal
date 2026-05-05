import { Chip, Stack } from '@mui/material'
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
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
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

  if (
    !search &&
    manufacturerFilters.length === 0 &&
    statusFilters.length === 0 &&
    !priceLabel
  ) {
    return null
  }

  return (
    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap data-testid="products-list-filter-chips">
      {search ? (
        <Chip
          color="primary"
          variant="outlined"
          label={withPrefix(searchPrefix, search)}
          onDelete={onRemoveSearch}
          data-testid="products-list-filter-chips-search-chip"
        />
      ) : null}

      {manufacturerFilters.map((value) => (
        <Chip
          key={`manufacturer-${value}`}
          color="primary"
          variant="outlined"
          label={withPrefix(manufacturerPrefix, value)}
          onDelete={() => onRemoveManufacturerFilter(value)}
          data-testid={`products-list-filter-chips-manufacturer-${toFilterTestId(value)}-chip`}
        />
      ))}

      {statusFilters.map((value) => (
        <Chip
          key={`status-${value}`}
          color="primary"
          variant="outlined"
          label={withPrefix(statusPrefix, value)}
          onDelete={() => onRemoveStatusFilter(value)}
          data-testid={`products-list-filter-chips-status-${toFilterTestId(value)}-chip`}
        />
      ))}

      {priceLabel ? (
        <Chip
          color="primary"
          variant="outlined"
          label={priceLabel}
          onDelete={onRemovePriceFilter}
          data-testid="products-list-filter-chips-price-chip"
        />
      ) : null}
    </Stack>
  )
}
