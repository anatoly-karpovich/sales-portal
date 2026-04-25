import { IconButton, Stack, Tooltip } from '@mui/material'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import type { Manager } from '@/api/modules/managers.api'

type Props = {
  manager: Manager
  onView: (manager: Manager) => void
}

export function ManagersTableActionsCell({ manager, onView }: Props) {
  return (
    <Stack
      direction="row"
      spacing={0.5}
      justifyContent="flex-end"
      data-testid="managers-table-actions-cell"
    >
      <Tooltip title="Details">
        <IconButton
          size="small"
          onClick={() => onView(manager)}
          data-testid="managers-table-details-button"
        >
          <VisibilityOutlinedIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Stack>
  )
}
