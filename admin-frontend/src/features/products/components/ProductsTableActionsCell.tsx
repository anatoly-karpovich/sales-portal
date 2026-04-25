import { IconButton, Stack, Tooltip } from '@mui/material'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined'
import type { Product } from '@/api/modules/products.api'

type Props = {
  product: Product
  onView: (product: Product) => void
  onEdit: (product: Product) => void
  onDelete: (product: Product) => void
}

export function ProductsTableActionsCell({ product, onView, onEdit, onDelete }: Props) {
  return (
    <Stack direction="row" spacing={0.5} justifyContent="flex-end" data-testid="products-table-actions-cell">
      <Tooltip title="Details">
        <IconButton size="small" onClick={() => onView(product)} data-testid="products-table-details-button">
          <VisibilityOutlinedIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Edit">
        <IconButton size="small" onClick={() => onEdit(product)} data-testid="products-table-edit-button">
          <EditOutlinedIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Delete">
        <IconButton size="small" color="error" onClick={() => onDelete(product)} data-testid="products-table-delete-button">
          <DeleteOutlineOutlinedIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Stack>
  )
}
