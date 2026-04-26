import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import { Box, IconButton, Paper, Stack, Typography } from '@mui/material'
import type { OrderDetails } from '@/api/modules/orders.api'
import { ordersUiText } from '@/features/orders/orders.ui-text'
import { formatDateTime } from '@/utils/date'

type OrderDetailsCustomerSectionProps = {
  order: OrderDetails
  isCustomerEditable: boolean
  onOpenCustomerEdit: () => void
}

function normalizeValue(value: string | number | null | undefined) {
  if (value === null || value === undefined) return '-'
  if (typeof value === 'string' && value.trim().length === 0) return '-'
  return String(value)
}

export function OrderDetailsCustomerSection({
  order,
  isCustomerEditable,
  onOpenCustomerEdit,
}: OrderDetailsCustomerSectionProps) {
  return (
    <Paper sx={{ p: { xs: 2, md: 3 } }} data-testid="order-details-customer-section">
      <Stack spacing={2}>
        <Stack direction="row" spacing={0.75} alignItems="center">
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            {ordersUiText.detailsPage.labels.customerDetails}
          </Typography>
          {isCustomerEditable ? (
            <IconButton
              size="small"
              onClick={onOpenCustomerEdit}
              data-testid="order-details-customer-edit-trigger"
            >
              <EditOutlinedIcon fontSize="small" />
            </IconButton>
          ) : null}
        </Stack>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }} />
        <Box
          sx={{
            display: 'grid',
            gap: 1.25,
            gridTemplateColumns: { xs: '1fr', sm: '170px 1fr' },
          }}
        >
          <Typography fontWeight={700}>{ordersUiText.detailsPage.fields.customer.email}</Typography>
          <Typography data-testid="order-details-customer-email-value">
            {normalizeValue(order.customer.email)}
          </Typography>

          <Typography fontWeight={700}>{ordersUiText.detailsPage.fields.customer.name}</Typography>
          <Typography data-testid="order-details-customer-name-value">
            {normalizeValue(order.customer.name)}
          </Typography>

          <Typography fontWeight={700}>{ordersUiText.detailsPage.fields.customer.city}</Typography>
          <Typography data-testid="order-details-customer-city-value">
            {normalizeValue(order.customer.city)}
          </Typography>

          <Typography fontWeight={700}>{ordersUiText.detailsPage.fields.customer.street}</Typography>
          <Typography data-testid="order-details-customer-street-value">
            {normalizeValue(order.customer.street)}
          </Typography>

          <Typography fontWeight={700}>{ordersUiText.detailsPage.fields.customer.house}</Typography>
          <Typography data-testid="order-details-customer-house-value">
            {normalizeValue(order.customer.house)}
          </Typography>

          <Typography fontWeight={700}>{ordersUiText.detailsPage.fields.customer.flat}</Typography>
          <Typography data-testid="order-details-customer-flat-value">
            {normalizeValue(order.customer.flat)}
          </Typography>

          <Typography fontWeight={700}>{ordersUiText.detailsPage.fields.customer.phone}</Typography>
          <Typography data-testid="order-details-customer-phone-value">
            {normalizeValue(order.customer.phone)}
          </Typography>

          <Typography fontWeight={700}>
            {ordersUiText.detailsPage.fields.customer.createdOn}
          </Typography>
          <Typography data-testid="order-details-customer-created-on-value">
            {formatDateTime(order.customer.createdOn)}
          </Typography>

          <Typography fontWeight={700}>{ordersUiText.detailsPage.fields.customer.notes}</Typography>
          <Typography
            data-testid="order-details-customer-notes-value"
            sx={{
              maxWidth: '100%',
              whiteSpace: 'pre-wrap',
              overflowWrap: 'anywhere',
              wordBreak: 'break-word',
            }}
          >
            {normalizeValue(order.customer.notes)}
          </Typography>
        </Box>
      </Stack>
    </Paper>
  )
}
