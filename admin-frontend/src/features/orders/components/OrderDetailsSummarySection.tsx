import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded'
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded'
import { useEffect, useState, type ReactNode } from 'react'
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
import type { OrderDetails, OrderInventoryReservationSummaryState } from '@/api/modules/orders.api'
import { getOverdueByDaysLabel, ordersUiText } from '@/features/orders/orders.ui-text'
import { formatDateTime } from '@/utils/date'
import { formatPrice } from '@/utils/number'
import { getOrderStatusColor } from '@/utils/orderStatus'

const ONE_MINUTE_MS = 60_000
const FIVE_MINUTES_MS = 5 * ONE_MINUTE_MS

const INVENTORY_RESERVATION_STATE_LABEL: Record<OrderInventoryReservationSummaryState, string> = {
  'Temporary Lock': ordersUiText.detailsPage.labels.reservationStateTemporary,
  'Processing Lock': ordersUiText.detailsPage.labels.reservationStateProcessing,
  'No Active Lock': ordersUiText.detailsPage.labels.reservationStateNoLock,
  Consumed: ordersUiText.detailsPage.labels.reservationStateConsumed,
  Released: ordersUiText.detailsPage.labels.reservationStateReleased,
}

function formatDateTimeWithoutSeconds(value: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

function toCountdownText(diffMs: number) {
  if (diffMs <= ONE_MINUTE_MS) {
    return ordersUiText.detailsPage.labels.lessThanOneMinute
  }

  const totalMinutes = Math.floor(diffMs / ONE_MINUTE_MS)
  if (totalMinutes < 60) {
    return `${totalMinutes}m`
  }

  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (minutes === 0) {
    return `${hours}h`
  }

  return `${hours}h ${minutes}m`
}

type OrderDetailsSummarySectionProps = {
  order: OrderDetails
  productsSubtotal: number
  isEmbedded?: boolean
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
  isEmbedded = false,
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
  const [nowMs, setNowMs] = useState(() => Date.now())

  const inventorySummary = order.inventoryReservation?.summary
  const inventorySummaryLabel = inventorySummary
    ? INVENTORY_RESERVATION_STATE_LABEL[inventorySummary.state]
    : ordersUiText.errors.inventoryReservationUnavailable
  const shouldShowReservationExpiry =
    inventorySummary?.state === 'Temporary Lock' && Boolean(inventorySummary.expiresAt)

  useEffect(() => {
    if (!shouldShowReservationExpiry) return

    const intervalId = window.setInterval(() => {
      setNowMs(Date.now())
    }, ONE_MINUTE_MS)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [shouldShowReservationExpiry])

  const inventoryReservationCountdown = (() => {
    if (!shouldShowReservationExpiry || !inventorySummary?.expiresAt) return null

    const expiresAtMs = new Date(inventorySummary.expiresAt).getTime()
    if (Number.isNaN(expiresAtMs)) return null

    const diffMs = Math.max(expiresAtMs - nowMs, 0)
    return {
      text: toCountdownText(diffMs),
      color:
        diffMs <= ONE_MINUTE_MS ? 'error.main' : diffMs <= FIVE_MINUTES_MS ? 'warning.main' : null,
    }
  })()

  const content = (
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
              <Typography
                variant="h4"
                sx={{ fontWeight: 800, letterSpacing: -0.6 }}
                data-testid="order-details-order-id-value"
              >
                {order._id}
              </Typography>
              <Stack spacing={0.35} sx={{ mt: 1.25 }}>
                <Typography color="text.secondary" variant="body2">
                  Created {formatDateTime(order.createdOn)}
                </Typography>
                {shouldShowReservationExpiry ? (
                  <Stack
                    direction="row"
                    spacing={0.75}
                    flexWrap="wrap"
                    alignItems={{ xs: 'flex-start', sm: 'center' }}
                    data-testid="order-details-summary-inventory-reservation-expiry-inline"
                  >
                    <Typography variant="body2" color="text.secondary">
                      Reservation {ordersUiText.detailsPage.labels.expiresAt}{' '}
                      {formatDateTimeWithoutSeconds(inventorySummary?.expiresAt ?? null)}
                    </Typography>
                    {inventoryReservationCountdown ? (
                      <Typography
                        variant="body2"
                        color={inventoryReservationCountdown.color ?? 'text.secondary'}
                        data-testid="order-details-summary-inventory-reservation-countdown"
                      >
                        | {ordersUiText.detailsPage.labels.expiresInPrefix}{' '}
                        {inventoryReservationCountdown.text}
                      </Typography>
                    ) : null}
                  </Stack>
                ) : null}
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

      <Box sx={{ borderTop: 1, borderColor: 'divider', p: { xs: 1.5, md: 2 } }}>
        <Box
          sx={{
            display: 'grid',
            gap: 1.25,
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, minmax(0, 1fr))',
              md: 'repeat(3, minmax(0, 1fr))',
              xl: 'repeat(6, minmax(0, 1fr))',
            },
          }}
          data-testid="order-details-summary-metrics-grid"
        >
          <MetricCard
            label={ordersUiText.detailsPage.labels.orderStatus}
            testId="order-details-summary-status-value"
          >
            <Typography sx={{ fontWeight: 700, color: getOrderStatusColor(order.status) }}>
              {order.status}
            </Typography>
          </MetricCard>

          <MetricCard
            label={ordersUiText.detailsPage.labels.delivery}
            testId="order-details-summary-delivery-date-value"
          >
            <Stack spacing={0.75}>
              <Typography
                sx={{
                  fontWeight: 700,
                  color: order.delivery.isOverdue ? 'error.main' : 'text.primary',
                }}
              >
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

          <MetricCard
            label={ordersUiText.detailsPage.labels.inventoryReservation}
            testId="order-details-summary-inventory-reservation-value"
          >
            <Typography sx={{ fontWeight: 700 }}>{inventorySummaryLabel}</Typography>
          </MetricCard>

          <MetricCard label="Total" testId="order-details-summary-total-price-value">
            <Typography sx={{ fontWeight: 800 }}>{formatPrice(order.total_price)}</Typography>
          </MetricCard>

          <MetricCard
            label="Products Subtotal"
            testId="order-details-summary-products-subtotal-value"
          >
            <Typography sx={{ fontWeight: 800 }}>{formatPrice(productsSubtotal)}</Typography>
          </MetricCard>

          <MetricCard label="Delivery Fee" testId="order-details-summary-delivery-fee-value">
            <Typography sx={{ fontWeight: 800 }}>{formatPrice(deliveryFee)}</Typography>
          </MetricCard>
        </Box>
      </Box>
    </Stack>
  )

  if (isEmbedded) {
    return <Box data-testid="order-details-summary-section">{content}</Box>
  }

  return (
    <Paper sx={{ overflow: 'hidden' }} data-testid="order-details-summary-section">
      {content}
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
    <Paper
      variant="outlined"
      sx={{ p: { xs: 1.5, md: 2 }, borderColor: 'divider', height: '100%' }}
    >
      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
        {label}
      </Typography>
      <Box sx={{ mt: 0.8 }} data-testid={testId}>
        {children}
      </Box>
    </Paper>
  )
}
