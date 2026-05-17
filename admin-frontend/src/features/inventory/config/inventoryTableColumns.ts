import { createElement } from 'react'
import { Typography } from '@mui/material'
import type {
  InventoryListItem,
  InventorySortField,
  InventorySortOrder,
} from '@/api/modules/inventory.api'
import type { DataTableColumn } from '@/components/shared/DataTable'
import { InventoryTableActionsCell } from '@/features/inventory/components/InventoryTableActionsCell'
import { formatDateTime } from '@/utils/date'

export const INVENTORY_SORT_FIELDS = [
  'updatedOn',
  'inventoryStatus',
  'product.name',
  'manufacturer',
] as const

export function isInventorySortField(field: string): field is InventorySortField {
  return (INVENTORY_SORT_FIELDS as readonly string[]).includes(field)
}

function getProductStatusColor(status: InventoryListItem['product']['status']) {
  if (status === 'Active') return 'primary.main'
  if (status === 'Archived') return 'warning.main'
  return 'text.primary'
}

function getInventoryStatusColor(status: InventoryListItem['inventoryStatus']) {
  if (status === 'Out Of Stock') return 'error.main'
  if (status === 'Low Stock') return 'warning.main'
  if (status === 'In Stock') return 'success.main'
  return 'text.secondary'
}

function formatVariantsLabel(count: number) {
  const normalizedCount = Number.isFinite(count) ? Math.max(0, count) : 0
  return `${normalizedCount} ${normalizedCount === 1 ? 'variant' : 'variants'}`
}

export function getInventoryTableColumns(): DataTableColumn<InventoryListItem>[] {
  return [
    {
      key: 'product.name',
      label: 'Product',
      sortable: true,
      width: '21%',
      minWidth: 200,
      render: (row) => row.product.name,
    },
    {
      key: 'manufacturer',
      label: 'Manufacturer',
      sortable: true,
      width: '15%',
      minWidth: 150,
      render: (row) => row.product.manufacturer,
    },
    {
      key: 'productStatus',
      label: 'Product Status',
      width: 130,
      minWidth: 120,
      render: (row) =>
        createElement(
          Typography,
          { sx: { color: getProductStatusColor(row.product.status) } },
          row.product.status,
        ),
    },
    {
      key: 'inventoryStatus',
      label: 'Inventory Status',
      sortable: true,
      width: 140,
      minWidth: 130,
      render: (row) =>
        createElement(
          Typography,
          { sx: { color: getInventoryStatusColor(row.inventoryStatus) } },
          row.inventoryStatus,
        ),
    },
    {
      key: 'variantsCount',
      label: 'Variants',
      width: 115,
      minWidth: 100,
      render: (row) => formatVariantsLabel(row.variantsCount),
    },
    {
      key: 'lowStockVariantsCount',
      label: 'Low Stock',
      width: 110,
      minWidth: 95,
      render: (row) => row.lowStockVariantsCount,
    },
    {
      key: 'outOfStockVariantsCount',
      label: 'Out Of Stock',
      width: 130,
      minWidth: 110,
      render: (row) => row.outOfStockVariantsCount,
    },
    {
      key: 'updatedOn',
      label: 'Updated On',
      sortable: true,
      width: '17%',
      minWidth: 185,
      render: (row) => formatDateTime(row.updatedOn),
    },
    {
      key: 'actions',
      label: 'Actions',
      width: 110,
      minWidth: 100,
      align: 'right',
      stickyRight: true,
      render: () => createElement(InventoryTableActionsCell),
    },
  ]
}

export type InventoryTableSortField = InventorySortField
export type InventoryTableSortOrder = InventorySortOrder
