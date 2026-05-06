import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded'
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded'
import type { ReactNode } from 'react'
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material'
import { Link } from 'react-router-dom'
import type { OrderDetails } from '@/api/modules/orders.api'
import { getOverdueByDaysLabel, ordersUiText } from '@/features/orders/orders.ui-text'
import { formatDateTime } from '@/utils/date'
import { formatPrice } from '@/utils/number'
import { getOrderStatusColor } from '@/utils/orderStatus'

type OrderDetailsSummarySectionProps = {
  order: OrderDetails
  productsSubtotal: number
  isCancelVisible: boolean
  isCancelDisabled: boolean
  isReopenVisible: boolean
  isProcessVisible: boolean
  isProcessDisabled: boolean
  isRefreshPending: boolean
  isOrderFetching: boolean
  onCancel: () => void
  onReopen: () => void
  onProcess: () => void
  onRefresh: () => void
}

export function OrderDetailsSummarySection({
  order,
  productsSubtotal,
  isCancelVisible,
  isCancelDisabled,
  isReopenVisible,
  isProcessVisible,
  isProcessDisabled,
  isRefreshPending,
  isOrderFetching,
  onCancel,
  onReopen,
  onProcess,
  onRefresh,
}: OrderDetailsSummarySectionProps) {
  const deliveryFee = Math.max(order.delivery.price, 0)

  return (
    <Paper sx={{ overflow: 'hidden' }} data-testid="order-details-summary-section">
      <Stack spacing={0}>
        <Box sx={{ p: { xs: 2, md: 3 } }}>
          <Stack spacing={2.5}>
            <Button
              component={Link}
              to="/orders"
              variant="text"
              startIcon={<ArrowBackRoundedIcon fontSize="small" />}
              sx={{ alignSelf: 'flex-start', px: 0, textTransform: 'none' }}
              data-testid="order-details-back-to-list-link"
            >
              {ordersUiText.detailsPage.backToOrders}
            </Button>

            <Stack
              direction={{ xs: 'column', lg: 'row' }}
              spacing={2}
              justifyContent="space-between"
              alignItems={{ xs: 'flex-start', lg: 'flex-start' }}
            >
              <Box>
                <Typography color="text.secondary" sx={{ mb: 0.75 }}>
                  {ordersUiText.detailsPage.title}
                </Typography>
                <Typography
                  variant="h4"
                  sx={{ fontWeight: 800, letterSpacing: -0.6 }}
                  data-testid="order-details-order-id-value"
                >
                  {order._id}
                </Typography>
                <Stack direction="row" spacing={1.25} flexWrap="wrap" sx={{ mt: 1.25 }}>
                  <Typography color="text.secondary" variant="body2">
                    Created {formatDateTime(order.createdOn)}
                  </Typography>
                </Stack>
              </Box>

              <Stack direction="row" spacing={1} flexWrap="wrap">
                {isProcessVisible ? (
                  <Tooltip
                    title={ordersUiText.detailsPage.placeholders.processNeedsDelivery}
                    disableHoverListener={!isProcessDisabled}
                  >
                    <span>
                      <Button
                        variant="contained"
                        onClick={onProcess}
                        disabled={isProcessDisabled}
                        data-testid="order-details-action-process-button"
                      >
                        {ordersUiText.detailsPage.actions.process}
                      </Button>
                    </span>
                  </Tooltip>
                ) : null}

                <Button
                  variant="outlined"
                  onClick={onRefresh}
                  disabled={isRefreshPending}
                  startIcon={
                    isRefreshPending || isOrderFetching ? (
                      <CircularProgress size={14} color="inherit" />
                    ) : (
                      <RefreshRoundedIcon fontSize="small" />
                    )
                  }
                  data-testid="order-details-action-refresh-button"
                >
                  Refresh
                </Button>

                {isCancelVisible ? (
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={onCancel}
                    disabled={isCancelDisabled}
                    data-testid="order-details-action-cancel-button"
                  >
                    {ordersUiText.detailsPage.actions.cancel}
                  </Button>
                ) : null}

                {isReopenVisible ? (
                  <Button
                    variant="outlined"
                    color="success"
                    onClick={onReopen}
                    data-testid="order-details-action-reopen-button"
                  >
                    {ordersUiText.detailsPage.actions.reopen}
                  </Button>
                ) : null}
              </Stack>
            </Stack>
          </Stack>
        </Box>

        <Box sx={{ borderTop: 1, borderBottom: 1, borderColor: 'divider' }}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, minmax(0, 1fr))',
                xl: 'repeat(5, minmax(0, 1fr))',
              },
            }}
            data-testid="order-details-summary-metrics-grid"
          >
            <MetricCard label={ordersUiText.detailsPage.labels.orderStatus} testId="order-details-summary-status-value">
              <Typography sx={{ fontWeight: 700, color: getOrderStatusColor(order.status) }}>
                {order.status}
              </Typography>
            </MetricCard>

            <MetricCard label={ordersUiText.detailsPage.labels.delivery} testId="order-details-summary-delivery-date-value">
              <Stack spacing={0.75}>
                <Typography sx={{ fontWeight: 700, color: order.delivery.isOverdue ? 'error.main' : 'text.primary' }}>
                  {order.delivery.status}
                </Typography>
                {order.delivery.isOverdue ? (
                  <Chip
                    size="small"
                    color="error"
                    label={getOverdueByDaysLabel(order.delivery.overdueByDays)}
                    data-testid="order-details-summary-delivery-overdue-badge"
                    sx={{ alignSelf: 'flex-start', fontWeight: 600 }}
                  />
                ) : null}
              </Stack>
            </MetricCard>

            <MetricCard label="Total" testId="order-details-summary-total-price-value">
              <Typography sx={{ fontWeight: 800 }}>{formatPrice(order.total_price)}</Typography>
            </MetricCard>

            <MetricCard label="Products Subtotal" testId="order-details-summary-products-subtotal-value">
              <Typography sx={{ fontWeight: 800 }}>{formatPrice(productsSubtotal)}</Typography>
            </MetricCard>

            <MetricCard label="Delivery Fee" testId="order-details-summary-delivery-fee-value">
              <Typography sx={{ fontWeight: 800 }}>{formatPrice(deliveryFee)}</Typography>
            </MetricCard>
          </Box>
        </Box>
      </Stack>
    </Paper>
  )
}

function MetricCard({
  label,
  testId,
  children,
}: {
  label: string
  testId: string
  children: ReactNode
}) {
  return (
    <Box sx={{ p: { xs: 1.75, md: 2.25 }, borderRight: { xs: 0, xl: 1 }, borderColor: 'divider' }}>
      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
        {label}
      </Typography>
      <Box sx={{ mt: 0.8 }} data-testid={testId}>
        {children}
      </Box>
    </Box>
  )
}
