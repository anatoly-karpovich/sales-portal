import { IconButton, Stack, Tooltip } from '@mui/material'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import { Link } from 'react-router-dom'

type Props = {
  productId: string
}

export function InventoryTableActionsCell({ productId }: Props) {
  return (
    <Stack
      direction="row"
      spacing={0.5}
      justifyContent="flex-end"
      data-testid="inventory-table-actions-cell"
    >
      <Tooltip title="Details">
        <IconButton
          size="small"
          component={Link}
          to={`/products/${productId}/inventory`}
          data-testid="inventory-table-details-button"
        >
          <VisibilityOutlinedIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Stack>
  )
}
