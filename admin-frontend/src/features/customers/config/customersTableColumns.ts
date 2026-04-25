import { createElement } from 'react'
import type { Customer } from '@/api/modules/customers.api'
import type { DataTableColumn } from '@/components/shared/DataTable'
import { formatDateTime } from '@/utils/date'
import { CustomersTableActionsCell } from '@/features/customers/components/CustomersTableActionsCell'

export const CUSTOMERS_EXPORT_AVAILABLE_FIELDS = [
  'email',
  'name',
  'country',
  'city',
  'street',
  'house',
  'flat',
  'phone',
  'createdOn',
  'notes',
]
export const CUSTOMERS_EXPORT_DEFAULT_FIELDS = ['email', 'name', 'country', 'createdOn']

export const CUSTOMERS_SORT_FIELDS = ['email', 'name', 'country', 'createdOn'] as const
export type CustomersSortField = (typeof CUSTOMERS_SORT_FIELDS)[number]
export type CustomersSortOrder = 'asc' | 'desc'

export function isCustomersSortField(field: string): field is CustomersSortField {
  return (CUSTOMERS_SORT_FIELDS as readonly string[]).includes(field)
}

type CustomersTableColumnActions = {
  onView: (customer: Customer) => void
  onEdit: (customer: Customer) => void
  onDelete: (customer: Customer) => void
}

export function getCustomersTableColumns({
  onView,
  onEdit,
  onDelete,
}: CustomersTableColumnActions): DataTableColumn<Customer>[] {
  return [
    {
      key: 'email',
      label: 'Email',
      sortable: true,
      width: '34%',
      minWidth: 280,
      render: (row) => row.email,
    },
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      width: '22%',
      minWidth: 220,
      render: (row) => row.name,
    },
    {
      key: 'country',
      label: 'Country',
      sortable: true,
      width: '16%',
      minWidth: 150,
      render: (row) => row.country,
    },
    {
      key: 'createdOn',
      label: 'Created On',
      sortable: true,
      width: '20%',
      minWidth: 220,
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
        createElement(CustomersTableActionsCell, {
          customer: row,
          onView,
          onEdit,
          onDelete,
        }),
    },
  ]
}
