import { IconButton, Stack, Tooltip } from '@mui/material'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'

export function InventoryTableActionsCell() {
  return (
    <Stack direction="row" spacing={0.5} justifyContent="flex-end" data-testid="inventory-table-actions-cell">
      <Tooltip title="Details">
        <span>
          <IconButton size="small" disabled data-testid="inventory-table-details-button">
            <VisibilityOutlinedIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
    </Stack>
  )
}
