import { createElement } from 'react'
import type { Product } from '@/api/modules/products.api'
import type { DataTableColumn } from '@/components/shared/DataTable'
import { ProductsTableActionsCell } from '@/features/products/components/ProductsTableActionsCell'
import { formatDateTime } from '@/utils/date'
import { formatPrice } from '@/utils/number'

export const PRODUCTS_EXPORT_AVAILABLE_FIELDS = [
  '_id',
  'name',
  'manufacturer',
  'category',
  'status',
  'variantsCount',
  'priceRange',
  'createdOn',
  'updatedOn',
]
export const PRODUCTS_EXPORT_DEFAULT_FIELDS = [
  'name',
  'manufacturer',
  'category',
  'variantsCount',
  'priceRange',
  'createdOn',
]

export const PRODUCTS_SORT_FIELDS = [
  'name',
  'price',
  'manufacturer',
  'createdOn',
  'variantsCount',
] as const
export type ProductsSortField = (typeof PRODUCTS_SORT_FIELDS)[number]
export type ProductsSortOrder = 'asc' | 'desc'

export function isProductsSortField(field: string): field is ProductsSortField {
  return (PRODUCTS_SORT_FIELDS as readonly string[]).includes(field)
}

type ProductsTableColumnActions = {
  onView: (product: Product) => void
  onDelete: (product: Product) => void
}

function renderProductPriceRange(product: Product) {
  const min = product.priceRange?.min
  const max = product.priceRange?.max

  if (typeof min !== 'number' || Number.isNaN(min)) {
    return '-'
  }

  if (typeof max !== 'number' || Number.isNaN(max) || min === max) {
    return formatPrice(min)
  }

  return `${formatPrice(min)} - ${formatPrice(max)}`
}

export function getProductsTableColumns({
  onView,
  onDelete,
}: ProductsTableColumnActions): DataTableColumn<Product>[] {
  return [
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      width: '29%',
      minWidth: 240,
      render: (row) => row.name,
    },
    {
      key: 'price',
      label: 'Price',
      sortable: true,
      width: 190,
      minWidth: 180,
      render: (row) => renderProductPriceRange(row),
    },
    {
      key: 'manufacturer',
      label: 'Manufacturer',
      sortable: true,
      width: '20%',
      minWidth: 180,
      render: (row) => row.manufacturer,
    },
    {
      key: 'variantsCount',
      label: 'Variants',
      sortable: true,
      width: 110,
      minWidth: 100,
      render: (row) => row.variantsCount ?? row.variants?.length ?? 0,
    },
    {
      key: 'createdOn',
      label: 'Created On',
      sortable: true,
      width: '23%',
      minWidth: 210,
      render: (row) => formatDateTime(row.createdOn),
    },
    {
      key: 'actions',
      label: 'Actions',
      width: 150,
      minWidth: 140,
      align: 'right',
      stickyRight: true,
      render: (row) =>
        createElement(ProductsTableActionsCell, {
          product: row,
          onView,
          onDelete,
        }),
    },
  ]
}
