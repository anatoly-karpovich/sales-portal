import { createElement } from 'react'
import ArrowRightAltRoundedIcon from '@mui/icons-material/ArrowRightAltRounded'
import { Chip, Stack, Typography } from '@mui/material'
import type { DataTableColumn } from '@/components/shared/DataTable'
import { inventoryUiText } from '@/features/inventory/inventory.ui-text'
import { formatDateTime } from '@/utils/date'

export type InventoryHistoryRow = {
  id: string
  createdOn: string
  variantLabel: string
  type: string
  quantityBefore: number
  quantityAfter: number
  reservedBefore: number
  reservedAfter: number
  comment: string
  managerName: string
}

export const INVENTORY_HISTORY_SORT_FIELDS = ['createdOn'] as const
export type InventoryHistorySortField = (typeof INVENTORY_HISTORY_SORT_FIELDS)[number]
export type InventoryHistorySortOrder = 'asc' | 'desc'

function getDeltaColor(before: number, after: number) {
  if (after > before) return 'success.main'
  if (after < before) return 'error.main'
  return 'text.secondary'
}

function formatDeltaValue(before: number, after: number) {
  const delta = after - before
  const sign = delta > 0 ? '+' : ''
  return `(${sign}${delta})`
}

function renderDelta(before: number, after: number) {
  const color = getDeltaColor(before, after)

  return createElement(
    Stack,
    {
      direction: 'row',
      spacing: 0.5,
      alignItems: 'center',
      sx: { color, flexWrap: 'wrap' },
    },
    createElement(Typography, { component: 'span', sx: { color: 'inherit' } }, before),
    createElement(ArrowRightAltRoundedIcon, {
      sx: { fontSize: 20, color: 'inherit', flexShrink: 0 },
    }),
    createElement(Typography, { component: 'span', sx: { color: 'inherit' } }, after),
    createElement(Typography, { component: 'span', sx: { color: 'inherit' } }, formatDeltaValue(before, after)),
  )
}

export function getInventoryHistoryTableColumns(): DataTableColumn<InventoryHistoryRow>[] {
  return [
    {
      key: 'createdOn',
      label: inventoryUiText.historyPage.columns.createdOn,
      sortable: true,
      width: 170,
      minWidth: 160,
      render: (row) => formatDateTime(row.createdOn),
    },
    {
      key: 'variant',
      label: inventoryUiText.historyPage.columns.variant,
      width: '20%',
      minWidth: 220,
      render: (row) => row.variantLabel,
    },
    {
      key: 'type',
      label: inventoryUiText.historyPage.columns.type,
      width: 180,
      minWidth: 170,
      render: (row) => createElement(Chip, { size: 'small', variant: 'outlined', label: row.type }),
    },
    {
      key: 'quantity',
      label: inventoryUiText.historyPage.columns.quantity,
      width: 140,
      minWidth: 130,
      render: (row) => renderDelta(row.quantityBefore, row.quantityAfter),
    },
    {
      key: 'reserved',
      label: inventoryUiText.historyPage.columns.reserved,
      width: 140,
      minWidth: 130,
      render: (row) => renderDelta(row.reservedBefore, row.reservedAfter),
    },
    {
      key: 'comment',
      label: inventoryUiText.historyPage.columns.comment,
      width: '24%',
      minWidth: 240,
      render: (row) => createElement(Typography, { title: row.comment, noWrap: true }, row.comment),
    },
    {
      key: 'manager',
      label: inventoryUiText.historyPage.columns.manager,
      width: 150,
      minWidth: 140,
      render: (row) => row.managerName,
    },
  ]
}
