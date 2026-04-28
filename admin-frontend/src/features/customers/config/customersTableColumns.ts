import { createElement } from 'react'
import type { Customer } from '@/api/modules/customers.api'
import type { DataTableColumn } from '@/components/shared/DataTable'
import { formatDateTime } from '@/utils/date'
import { CustomersTableActionsCell } from '@/features/customers/components/CustomersTableActionsCell'

export const CUSTOMERS_EXPORT_AVAILABLE_FIELDS = [
  'email',
  'name',
  'state',
  'city',
  'street',
  'house',
  'apartment',
  'zipCode',
  'phone',
  'createdOn',
  'notes',
]
export const CUSTOMERS_EXPORT_DEFAULT_FIELDS = ['email', 'name', 'createdOn']

export const CUSTOMERS_SORT_FIELDS = ['email', 'name', 'createdOn'] as const
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
      width: '40%',
      minWidth: 280,
      render: (row) => row.email,
    },
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      width: '24%',
      minWidth: 200,
      render: (row) => row.name,
    },
    {
      key: 'state',
      label: 'State',
      width: '18%',
      minWidth: 180,
      render: (row) => row.state || '-',
    },
    {
      key: 'city',
      label: 'City',
      width: '18%',
      minWidth: 180,
      render: (row) => row.city || '-',
    },
    {
      key: 'createdOn',
      label: 'Created On',
      sortable: true,
      width: '18%',
      minWidth: 200,
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
