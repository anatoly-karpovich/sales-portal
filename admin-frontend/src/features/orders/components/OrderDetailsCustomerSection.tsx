import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import { Box, IconButton, Paper, Stack, Typography } from '@mui/material'
import type { OrderDetails } from '@/api/modules/orders.api'
import { ordersUiText } from '@/features/orders/orders.ui-text'

type OrderDetailsCustomerSectionProps = {
  order: OrderDetails
  isCustomerEditable: boolean
  isEmbedded?: boolean
  onOpenCustomerEdit: () => void
}

function normalizeValue(value: string | number | null | undefined) {
  if (value === null || value === undefined) return '-'
  if (typeof value === 'string' && value.trim().length === 0) return '-'
  return String(value)
}

function formatAddress(order: OrderDetails) {
  const apartmentPart = typeof order.customer.apartment === 'number' ? `, Apt ${order.customer.apartment}` : ''
  return `${order.customer.house} ${order.customer.street}${apartmentPart}, ${order.customer.city}, ${order.customer.state} ${order.customer.zipCode}`
}

export function OrderDetailsCustomerSection({
  order,
  isCustomerEditable,
  isEmbedded = false,
  onOpenCustomerEdit,
}: OrderDetailsCustomerSectionProps) {
  const customerValueSx = {
    maxWidth: '100%',
    whiteSpace: 'pre-wrap',
    overflowWrap: 'anywhere',
    wordBreak: 'break-word',
  }
  const rootSx = { p: { xs: 2, md: 2.5 } }
  const content = (
    <Stack spacing={2}>
      <Stack direction="row" alignItems="center" gap={0.5}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          {ordersUiText.detailsPage.labels.customerDetails}
        </Typography>
        {isCustomerEditable ? (
          <IconButton
            size="small"
            onClick={onOpenCustomerEdit}
            data-testid="order-details-customer-edit-trigger"
            aria-label="edit customer"
          >
            <EditOutlinedIcon fontSize="small" />
          </IconButton>
        ) : null}
      </Stack>

      <Box
        sx={{
          display: 'grid',
          gap: 1.1,
          gridTemplateColumns: '110px minmax(0, 1fr)',
        }}
      >
        <Typography color="text.secondary">Name</Typography>
        <Typography data-testid="order-details-customer-name-value" sx={customerValueSx}>
          {normalizeValue(order.customer.name)}
        </Typography>

        <Typography color="text.secondary">Email</Typography>
        <Typography data-testid="order-details-customer-email-value" sx={customerValueSx}>
          {normalizeValue(order.customer.email)}
        </Typography>

        <Typography color="text.secondary">Phone</Typography>
        <Typography data-testid="order-details-customer-phone-value" sx={customerValueSx}>
          {normalizeValue(order.customer.phone)}
        </Typography>

        <Typography color="text.secondary">Address</Typography>
        <Typography data-testid="order-details-customer-address-value" sx={customerValueSx}>
          {formatAddress(order)}
        </Typography>

        <Typography color="text.secondary">Notes</Typography>
        <Typography data-testid="order-details-customer-notes-value" sx={customerValueSx}>
          {normalizeValue(order.customer.notes)}
        </Typography>
      </Box>
    </Stack>
  )

  if (isEmbedded) {
    return (
      <Stack sx={rootSx} data-testid="order-details-customer-section">
        {content}
      </Stack>
    )
  }

  return (
    <Paper sx={rootSx} data-testid="order-details-customer-section">
      {content}
    </Paper>
  )
}
