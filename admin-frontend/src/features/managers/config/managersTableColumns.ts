import { createElement } from 'react'
import type { Manager } from '@/api/modules/managers.api'
import type { DataTableColumn } from '@/components/shared/DataTable'
import { formatDateTime } from '@/utils/date'
import { ManagersTableActionsCell } from '@/features/managers/components/ManagersTableActionsCell'

export const MANAGERS_SORT_FIELDS = ['firstName', 'lastName', 'roles', 'createdOn'] as const
export type ManagersSortField = (typeof MANAGERS_SORT_FIELDS)[number]
export type ManagersSortOrder = 'asc' | 'desc'

export function isManagersSortField(field: string): field is ManagersSortField {
  return (MANAGERS_SORT_FIELDS as readonly string[]).includes(field)
}

type ManagersTableColumnActions = {
  onView: (manager: Manager) => void
}

function formatRoles(roles: string[]) {
  return roles.length > 1 ? roles.join(', ') : (roles[0] ?? '-')
}

export function getManagersTableColumns({
  onView,
}: ManagersTableColumnActions): DataTableColumn<Manager>[] {
  return [
    {
      key: 'firstName',
      label: 'First Name',
      sortable: true,
      width: '26%',
      minWidth: 220,
      render: (row) => row.firstName,
    },
    {
      key: 'lastName',
      label: 'Last Name',
      sortable: true,
      width: '26%',
      minWidth: 220,
      render: (row) => row.lastName,
    },
    {
      key: 'roles',
      label: 'Roles',
      sortable: true,
      width: '20%',
      minWidth: 170,
      render: (row) => formatRoles(row.roles),
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
      width: 130,
      minWidth: 120,
      align: 'right',
      stickyRight: true,
      render: (row) =>
        createElement(ManagersTableActionsCell, {
          manager: row,
          onView,
        }),
    },
  ]
}

