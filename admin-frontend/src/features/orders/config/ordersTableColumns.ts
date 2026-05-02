import { createElement } from 'react'
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded'
import { Box, Tooltip, Typography } from '@mui/material'
import type { OrderListItem } from '@/api/modules/orders.api'
import type { DataTableColumn } from '@/components/shared/DataTable'
import { formatDateTime } from '@/utils/date'
import { formatPrice } from '@/utils/number'
import { getOrderStatusColor } from '@/utils/orderStatus'
import { OrdersTableActionsCell } from '@/features/orders/components/OrdersTableActionsCell'
import { getOverdueByDaysLabel } from '@/features/orders/orders.ui-text'

export const ORDERS_EXPORT_AVAILABLE_FIELDS = [
  'status',
  'delivery',
  'deliveryStatus',
  'total_price',
  'customer',
  'products',
  'assignedManager',
  'createdOn',
]

export const ORDERS_EXPORT_DEFAULT_FIELDS = [
  'status',
  'deliveryStatus',
  'total_price',
  'customer',
  'products',
  'createdOn',
]

export const ORDERS_SORT_FIELDS = ['createdOn', 'total_price', 'status'] as const
export type OrdersSortField = (typeof ORDERS_SORT_FIELDS)[number]
export type OrdersSortOrder = 'asc' | 'desc'

export function isOrdersSortField(field: string): field is OrdersSortField {
  return (ORDERS_SORT_FIELDS as readonly string[]).includes(field)
}

type OrdersTableColumnActions = {
  onDetails: (orderId: string) => void
  onReopen: (order: OrderListItem) => void
}

function formatAssignedManager(order: OrderListItem) {
  if (!order.assignedManager) {
    return '-'
  }
  const fullName = `${order.assignedManager.firstName} ${order.assignedManager.lastName}`.trim()
  return fullName || order.assignedManager.username || '-'
}

export function getOrdersTableColumns({ onDetails, onReopen }: OrdersTableColumnActions): DataTableColumn<OrderListItem>[] {
  return [
    {
      key: 'orderNumber',
      label: 'Order Number',
      width: '18%',
      minWidth: 220,
      render: (row) => row._id,
    },
    {
      key: 'customerEmail',
      label: 'Customer Email',
      width: '18%',
      minWidth: 240,
      render: (row) => row.customer.email,
    },
    {
      key: 'total_price',
      label: 'Price',
      sortable: true,
      width: 130,
      minWidth: 120,
      render: (row) => formatPrice(row.total_price),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      width: '12%',
      minWidth: 170,
      render: (row) =>
        createElement(
          Typography,
          { sx: { color: getOrderStatusColor(row.status) } },
          row.status,
        ),
    },
    {
      key: 'deliveryStatus',
      label: 'Delivery',
      width: '16%',
      minWidth: 200,
      render: (row) =>
        createElement(
          Box,
          { sx: { display: 'inline-flex', alignItems: 'center', gap: 0.75 } },
          createElement('span', null, row.delivery.status || '-'),
          row.delivery.isOverdue
            ? createElement(
                Tooltip,
                { title: getOverdueByDaysLabel(row.delivery.overdueByDays) },
                createElement(ErrorOutlineRoundedIcon, {
                  color: 'error',
                  fontSize: 'small',
                  'data-testid': 'orders-table-delivery-overdue-icon',
                }),
              )
            : null,
        ),
    },
    {
      key: 'assignedManager',
      label: 'Assigned Manager',
      width: '14%',
      minWidth: 200,
      render: (row) => formatAssignedManager(row),
    },
    {
      key: 'createdOn',
      label: 'Created On',
      sortable: true,
      width: '14%',
      minWidth: 220,
      render: (row) => formatDateTime(row.createdOn),
    },
    {
      key: 'actions',
      label: 'Actions',
      width: 160,
      minWidth: 150,
      align: 'right',
      stickyRight: true,
      render: (row) =>
        createElement(OrdersTableActionsCell, {
          order: row,
          onDetails,
          onReopen,
        }),
    },
  ]
}
