import { Chip, Stack } from '@mui/material'

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
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
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
  if (
    !search &&
    manufacturerFilters.length === 0 &&
    productStatusFilters.length === 0 &&
    inventoryStatusFilters.length === 0
  ) {
    return null
  }

  return (
    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap data-testid="inventory-list-filter-chips">
      {search ? (
        <Chip
          color="primary"
          variant="outlined"
          label={withPrefix(searchPrefix, search)}
          onDelete={onRemoveSearch}
          data-testid="inventory-list-filter-chips-search-chip"
        />
      ) : null}

      {inventoryStatusFilters.map((value) => (
        <Chip
          key={`inventory-status-${value}`}
          color="primary"
          variant="outlined"
          label={withPrefix(inventoryStatusPrefix, value)}
          onDelete={() => onRemoveInventoryStatusFilter(value)}
          data-testid={`inventory-list-filter-chips-inventory-status-${toFilterTestId(value)}-chip`}
        />
      ))}

      {productStatusFilters.map((value) => (
        <Chip
          key={`product-status-${value}`}
          color="primary"
          variant="outlined"
          label={withPrefix(productStatusPrefix, value)}
          onDelete={() => onRemoveProductStatusFilter(value)}
          data-testid={`inventory-list-filter-chips-product-status-${toFilterTestId(value)}-chip`}
        />
      ))}

      {manufacturerFilters.map((value) => (
        <Chip
          key={`manufacturer-${value}`}
          color="primary"
          variant="outlined"
          label={withPrefix(manufacturerPrefix, value)}
          onDelete={() => onRemoveManufacturerFilter(value)}
          data-testid={`inventory-list-filter-chips-manufacturer-${toFilterTestId(value)}-chip`}
        />
      ))}
    </Stack>
  )
}
