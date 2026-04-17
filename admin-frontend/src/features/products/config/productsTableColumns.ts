import { createElement } from 'react'
import type { Product } from '@/api/modules/products.api'
import type { DataTableColumn } from '@/components/shared/DataTable'
import { formatDateTime } from '@/utils/date'
import { ProductsTableActionsCell } from '@/features/products/components/ProductsTableActionsCell'

export const PRODUCTS_EXPORT_AVAILABLE_FIELDS = ['name', 'amount', 'price', 'manufacturer', 'createdOn', 'notes']
export const PRODUCTS_EXPORT_DEFAULT_FIELDS = ['name', 'price', 'manufacturer', 'createdOn']

export const PRODUCTS_SORT_FIELDS = ['name', 'price', 'manufacturer', 'createdOn'] as const
export type ProductsSortField = (typeof PRODUCTS_SORT_FIELDS)[number]
export type ProductsSortOrder = 'asc' | 'desc'

export function isProductsSortField(field: string): field is ProductsSortField {
  return (PRODUCTS_SORT_FIELDS as readonly string[]).includes(field)
}

type ProductsTableColumnActions = {
  onView: (product: Product) => void
  onEdit: (product: Product) => void
  onDelete: (product: Product) => void
}

export function getProductsTableColumns({ onView, onEdit, onDelete }: ProductsTableColumnActions): DataTableColumn<Product>[] {
  return [
    { key: 'name', label: 'Name', sortable: true, width: '32%', minWidth: 260, render: (row) => row.name },
    { key: 'price', label: 'Price', sortable: true, width: 140, minWidth: 120, render: (row) => `$${row.price}` },
    { key: 'manufacturer', label: 'Manufacturer', sortable: true, width: '22%', minWidth: 180, render: (row) => row.manufacturer },
    { key: 'createdOn', label: 'Created On', sortable: true, width: '28%', minWidth: 220, render: (row) => formatDateTime(row.createdOn) },
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
          onEdit,
          onDelete,
        }),
    },
  ]
}
