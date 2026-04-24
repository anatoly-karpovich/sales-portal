import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded'
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded'
import {
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material'
import { Link } from 'react-router-dom'
import type { OrderDetails } from '@/api/modules/orders.api'
import { ordersUiText } from '@/features/orders/orders.ui-text'
import { formatDate, formatDateTime } from '@/utils/date'
import { formatPrice } from '@/utils/number'
import { getOrderStatusColor } from '@/utils/orderStatus'

type OrderDetailsSummarySectionProps = {
  order: OrderDetails
  assignedManagerDisplayValue: string
  isCancelVisible: boolean
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
  assignedManagerDisplayValue,
  isCancelVisible,
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
  const summaryMetricCardSx = {
    width: { xs: '100%', sm: 'clamp(210px, 22vw, 250px)' },
    flex: '0 0 auto',
    p: { xs: 1.25, md: 1.5 },
    border: 1,
    borderColor: 'divider',
    borderRadius: 2,
    backgroundColor: (theme: { palette: { mode: 'light' | 'dark' } }) =>
      theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : 'rgba(25, 118, 210, 0.03)',
  }

  return (
    <Paper sx={{ p: { xs: 2, md: 3 } }} data-testid="order-details-summary-section">
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

        <Typography variant="h4" sx={{ fontWeight: 700 }} data-testid="order-details-page-title">
          {ordersUiText.detailsPage.title}
        </Typography>

        <Stack spacing={1.5}>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={1.5}
            alignItems={{ xs: 'flex-start', md: 'flex-start' }}
            justifyContent="space-between"
          >
            <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
              <Typography color="text.secondary" sx={{ lineHeight: 1.4 }}>
                <Typography
                  component="span"
                  variant="subtitle2"
                  sx={{ color: 'text.primary', fontWeight: 700 }}
                >
                  {ordersUiText.detailsPage.labels.orderNumber}:
                </Typography>{' '}
                <Typography
                  component="span"
                  sx={{ fontStyle: 'italic' }}
                  data-testid="order-details-order-id-value"
                >
                  {order._id}
                </Typography>
              </Typography>
            </Stack>

            <Stack
              direction="row"
              spacing={1}
              flexWrap="wrap"
              justifyContent={{ xs: 'flex-start', md: 'flex-end' }}
            >
              {isCancelVisible ? (
                <Button
                  variant="outlined"
                  color="error"
                  onClick={onCancel}
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

          <Stack direction="row" spacing={1} flexWrap="wrap" justifyContent="flex-start">
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
              variant="text"
              startIcon={
                isRefreshPending || isOrderFetching ? (
                  <CircularProgress size={14} color="inherit" />
                ) : (
                  <RefreshRoundedIcon fontSize="small" />
                )
              }
              onClick={onRefresh}
              disabled={isRefreshPending}
              sx={{ px: 0.5 }}
              data-testid="order-details-action-refresh-button"
            >
              {ordersUiText.detailsPage.actions.refresh}
            </Button>
          </Stack>
        </Stack>

        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'stretch',
            justifyContent: { xs: 'flex-start', sm: 'space-between' },
            rowGap: 1.25,
            columnGap: { xs: 1.5, sm: 0 },
          }}
          data-testid="order-details-summary-metrics-grid"
        >
          <Stack
            spacing={0.75}
            sx={summaryMetricCardSx}
            data-testid="order-details-summary-metric-status-card"
          >
            <Typography variant="caption" sx={{ color: 'text.secondary', letterSpacing: 0.2 }}>
              {ordersUiText.detailsPage.labels.orderStatus}
            </Typography>
            <Typography
              variant="subtitle1"
              sx={{ fontWeight: 700, color: getOrderStatusColor(order.status) }}
              data-testid="order-details-summary-status-value"
            >
              {order.status}
            </Typography>
          </Stack>

          <Stack
            spacing={0.75}
            sx={summaryMetricCardSx}
            data-testid="order-details-summary-metric-delivery-card"
          >
            <Typography variant="caption" sx={{ color: 'text.secondary', letterSpacing: 0.2 }}>
              {ordersUiText.detailsPage.labels.delivery}
            </Typography>
            <Typography
              variant="subtitle1"
              sx={{ fontWeight: 700 }}
              data-testid="order-details-summary-delivery-date-value"
            >
              {order.delivery?.finalDate
                ? formatDate(order.delivery.finalDate)
                : ordersUiText.detailsPage.placeholders.noDelivery}
            </Typography>
          </Stack>

          <Stack
            spacing={0.75}
            sx={summaryMetricCardSx}
            data-testid="order-details-summary-metric-total-price-card"
          >
            <Typography variant="caption" sx={{ color: 'text.secondary', letterSpacing: 0.2 }}>
              {ordersUiText.detailsPage.labels.totalPrice}
            </Typography>
            <Typography
              variant="subtitle1"
              sx={{ fontWeight: 700 }}
              data-testid="order-details-summary-total-price-value"
            >
              {formatPrice(order.total_price)}
            </Typography>
          </Stack>

          <Stack
            spacing={0.75}
            sx={summaryMetricCardSx}
            data-testid="order-details-summary-metric-assigned-manager-card"
          >
            <Typography variant="caption" sx={{ color: 'text.secondary', letterSpacing: 0.2 }}>
              {ordersUiText.detailsPage.labels.assignedManager}
            </Typography>
            <Typography
              variant="subtitle1"
              sx={{ fontWeight: 700 }}
              data-testid="order-details-summary-assigned-manager-value"
            >
              {assignedManagerDisplayValue}
            </Typography>
          </Stack>

          <Stack
            spacing={0.75}
            sx={summaryMetricCardSx}
            data-testid="order-details-summary-metric-created-on-card"
          >
            <Typography variant="caption" sx={{ color: 'text.secondary', letterSpacing: 0.2 }}>
              {ordersUiText.detailsPage.labels.createdOn}
            </Typography>
            <Typography
              variant="subtitle1"
              sx={{ fontWeight: 700 }}
              data-testid="order-details-summary-created-on-value"
            >
              {formatDateTime(order.createdOn)}
            </Typography>
          </Stack>
        </Box>
      </Stack>
    </Paper>
  )
}
