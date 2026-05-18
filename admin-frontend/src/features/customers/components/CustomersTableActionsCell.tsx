import { IconButton, Stack, Tooltip } from '@mui/material'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined'
import type { Customer } from '@/api/modules/customers.api'

type Props = {
  customer: Customer
  onView: (customer: Customer) => void
  onEdit: (customer: Customer) => void
  onDelete: (customer: Customer) => void
}

export function CustomersTableActionsCell({ customer, onView, onEdit, onDelete }: Props) {
  return (
    <Stack
      direction="row"
      spacing={0.5}
      justifyContent="flex-end"
      data-testid="customers-table-actions-cell"
    >
      <Tooltip title="Details">
        <IconButton
          size="small"
          onClick={() => onView(customer)}
          data-testid="customers-table-details-button"
        >
          <VisibilityOutlinedIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Edit">
        <IconButton
          size="small"
          onClick={() => onEdit(customer)}
          data-testid="customers-table-edit-button"
        >
          <EditOutlinedIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Delete">
        <IconButton
          size="small"
          color="error"
          onClick={() => onDelete(customer)}
          data-testid="customers-table-delete-button"
        >
          <DeleteOutlineOutlinedIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Stack>
  )
}
