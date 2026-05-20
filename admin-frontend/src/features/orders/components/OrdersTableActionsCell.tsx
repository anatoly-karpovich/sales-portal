import { IconButton, Stack, Tooltip } from '@mui/material'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import UndoOutlinedIcon from '@mui/icons-material/UndoOutlined'
import type { OrderListItem } from '@/api/modules/orders.api'

type Props = {
  order: OrderListItem
  onDetails: (orderId: string) => void
  onReopen: (order: OrderListItem) => void
}

export function OrdersTableActionsCell({ order, onDetails, onReopen }: Props) {
  return (
    <Stack
      direction="row"
      spacing={0.5}
      justifyContent="flex-end"
      data-testid="orders-table-actions-cell"
    >
      <Tooltip title="Details">
        <IconButton
          size="small"
          onClick={() => onDetails(order._id)}
          data-testid="orders-table-details-button"
        >
          <VisibilityOutlinedIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      {order.status === 'Canceled' ? (
        <Tooltip title="Reopen">
          <IconButton
            size="small"
            color="warning"
            onClick={() => onReopen(order)}
            data-testid="orders-table-reopen-button"
          >
            <UndoOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      ) : null}
    </Stack>
  )
}
