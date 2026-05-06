import { Button, Paper, Stack, Typography } from '@mui/material'
import { Link } from 'react-router-dom'
import type { OrderDetails } from '@/api/modules/orders.api'
import { ordersUiText } from '@/features/orders/orders.ui-text'

type OrderDetailsManagerSectionProps = {
  order: OrderDetails
  assignedManagerDisplayValue: string
  isManagerAssigned: boolean
  isManagerActionPending: boolean
  onAssignManager: () => void
  onEditManager: () => void
  onUnassignManager: () => void
}

export function OrderDetailsManagerSection({
  order,
  assignedManagerDisplayValue,
  isManagerAssigned,
  isManagerActionPending,
  onAssignManager,
  onEditManager,
  onUnassignManager,
}: OrderDetailsManagerSectionProps) {
  return (
    <Paper sx={{ p: { xs: 2, md: 2.5 } }} data-testid="order-details-manager-section">
      <Stack spacing={1.75}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Manager
          </Typography>
          <Stack direction="row" spacing={1}>
            <Button
              variant="text"
              disabled={isManagerActionPending}
              onClick={isManagerAssigned ? onEditManager : onAssignManager}
              data-testid={
                isManagerAssigned
                  ? 'order-details-manager-edit-trigger'
                  : 'order-details-manager-assign-trigger'
              }
              sx={{ textTransform: 'none' }}
            >
              {isManagerAssigned ? 'Change' : 'Assign'}
            </Button>
            {isManagerAssigned ? (
              <Button
                variant="text"
                color="error"
                disabled={isManagerActionPending}
                onClick={onUnassignManager}
                data-testid="order-details-manager-unassign-trigger"
                sx={{ textTransform: 'none' }}
              >
                Unassign
              </Button>
            ) : null}
          </Stack>
        </Stack>

        {isManagerAssigned ? (
          typeof order.assignedManager?._id === 'string' && order.assignedManager._id.length > 0 ? (
            <Button
              component={Link}
              to={`/managers/${order.assignedManager._id}`}
              variant="text"
              sx={{
                px: 0,
                minWidth: 0,
                textTransform: 'none',
                textDecoration: 'underline',
                justifyContent: 'flex-start',
                alignSelf: 'flex-start',
              }}
              data-testid="order-details-assigned-manager-value"
            >
              <Typography component="span" sx={{ fontStyle: 'italic' }}>
                {assignedManagerDisplayValue}
              </Typography>
            </Button>
          ) : (
            <Typography sx={{ fontStyle: 'italic' }} data-testid="order-details-assigned-manager-value">
              {assignedManagerDisplayValue}
            </Typography>
          )
        ) : (
          <Stack spacing={0.5}>
            <Typography sx={{ fontWeight: 700 }} data-testid="order-details-assigned-manager-value">
              {ordersUiText.detailsPage.history.notAssigned}
            </Typography>
            <Typography color="text.secondary" variant="body2">
              Select manager before processing
            </Typography>
          </Stack>
        )}
      </Stack>
    </Paper>
  )
}
