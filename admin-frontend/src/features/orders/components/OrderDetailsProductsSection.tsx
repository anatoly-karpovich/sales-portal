import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import {
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  IconButton,
  Paper,
  Stack,
  Typography,
} from '@mui/material'
import type { OrderDetails } from '@/api/modules/orders.api'
import { ordersUiText } from '@/features/orders/orders.ui-text'
import { formatPrice } from '@/utils/number'

export type OrderDetailsProductDisplayRow = {
  displayName: string
  manufacturer: string
  imageUrl: string
}

type OrderDetailsProductsSectionProps = {
  order: OrderDetails
  displayRows: OrderDetailsProductDisplayRow[]
  isProductsEditable: boolean
  isReceiveStartVisible: boolean
  isReceiveModeVisible: boolean
  isReceiveSavePending: boolean
  isReceiveSaveEnabled: boolean
  hasPendingProductsToReceive: boolean
  isSelectAllChecked: boolean
  isSelectAllIndeterminate: boolean
  selectedReceivePendingRowIndices: number[]
  isEmbedded?: boolean
  onOpenProductsEdit: () => void
  onStartReceiveMode: () => void
  onCancelReceiveMode: () => void
  onSaveReceivedProducts: () => void
  onToggleSelectAllReceive: () => void
  onToggleReceiveProduct: (index: number) => void
}

export function OrderDetailsProductsSection({
  order,
  displayRows,
  isProductsEditable,
  isReceiveStartVisible,
  isReceiveModeVisible,
  isReceiveSavePending,
  isReceiveSaveEnabled,
  hasPendingProductsToReceive,
  isSelectAllChecked,
  isSelectAllIndeterminate,
  selectedReceivePendingRowIndices,
  isEmbedded = false,
  onOpenProductsEdit,
  onStartReceiveMode,
  onCancelReceiveMode,
  onSaveReceivedProducts,
  onToggleSelectAllReceive,
  onToggleReceiveProduct,
}: OrderDetailsProductsSectionProps) {
  const rootSx = { overflow: 'hidden' }
  const content = (
    <Stack spacing={0}>
      <Box sx={{ p: { xs: 2, md: 2.5 } }}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={1}
          alignItems={{ xs: 'flex-start', md: 'center' }}
          justifyContent="space-between"
        >
          <Stack direction="row" spacing={0.75} alignItems="center" width="100%">
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              {ordersUiText.detailsPage.labels.requestedProducts}
            </Typography>
            <Box sx={{ ml: 'auto' }}>
              {isProductsEditable ? (
                <IconButton
                  size="small"
                  onClick={onOpenProductsEdit}
                  data-testid="order-details-products-edit-trigger"
                  aria-label="edit products"
                >
                  <EditOutlinedIcon fontSize="small" />
                </IconButton>
              ) : null}
            </Box>
          </Stack>

          {isReceiveStartVisible ? (
            <Button
              variant="contained"
              onClick={onStartReceiveMode}
              disabled={isReceiveSavePending}
              data-testid="order-details-products-receive-start-button"
            >
              {ordersUiText.detailsPage.actions.receive}
            </Button>
          ) : null}

          {isReceiveModeVisible ? (
            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                onClick={onCancelReceiveMode}
                disabled={isReceiveSavePending}
                data-testid="order-details-products-receive-cancel-button"
              >
                {ordersUiText.detailsPage.actions.cancelReceive}
              </Button>
              <Button
                variant="contained"
                onClick={onSaveReceivedProducts}
                disabled={!isReceiveSaveEnabled}
                data-testid="order-details-products-receive-save-button"
              >
                {isReceiveSavePending ? (
                  <CircularProgress size={18} color="inherit" />
                ) : (
                  ordersUiText.detailsPage.actions.save
                )}
              </Button>
            </Stack>
          ) : null}
        </Stack>
      </Box>

      <Box data-testid="order-details-products-table">
        <Box
          sx={{
            px: { xs: 1.5, md: 2.5 },
            py: 1.25,
            borderTop: 1,
            borderBottom: 1,
            borderColor: 'divider',
            display: 'grid',
            gridTemplateColumns: {
              xs: 'minmax(0, 1fr) auto',
              md: 'minmax(300px, 1.6fr) 120px 140px 180px',
            },
            gap: 1.5,
            color: 'text.secondary',
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          <Typography>Product</Typography>
          <Typography sx={{ display: { xs: 'none', md: 'block' } }}>Quantity</Typography>
          <Typography sx={{ display: { xs: 'none', md: 'block' } }}>Unit Price</Typography>
          <Stack
            direction="row"
            spacing={0.5}
            justifyContent="flex-end"
            alignItems="center"
            sx={{ pr: { xs: 0, md: 0.25 } }}
          >
            {isReceiveModeVisible ? (
              <Checkbox
                size="small"
                checked={isSelectAllChecked}
                indeterminate={isSelectAllIndeterminate}
                disabled={!hasPendingProductsToReceive || isReceiveSavePending}
                onChange={onToggleSelectAllReceive}
                data-testid="order-details-products-receive-select-all-checkbox"
              />
            ) : null}
            <Typography color="text.secondary" fontSize={12}>
              Status
            </Typography>
          </Stack>
        </Box>

        {order.products.length ? (
          order.products.map((product, index) => {
            const displayRow = displayRows[index]
            return (
              <Box
                key={`${product.product._id}-${product.variant._id}-${index}`}
                sx={{
                  px: { xs: 1.5, md: 2.5 },
                  py: 1.5,
                  borderBottom: 1,
                  borderColor: 'divider',
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: 'minmax(0, 1fr) auto',
                    md: 'minmax(300px, 1.6fr) 120px 140px 180px',
                  },
                  gap: 1.5,
                  alignItems: 'center',
                }}
                data-testid={`order-details-products-row-${index}`}
              >
                <Stack direction="row" spacing={1.25} minWidth={0} alignItems="center">
                  <Box
                    component="img"
                    src={displayRow?.imageUrl}
                    alt={displayRow?.displayName ?? product.product.name}
                    sx={{
                      width: 52,
                      height: 52,
                      borderRadius: 1.5,
                      border: 1,
                      borderColor: 'divider',
                      objectFit: 'cover',
                      flexShrink: 0,
                    }}
                  />
                  <Box sx={{ minWidth: 0 }}>
                    <Typography
                      sx={{ fontWeight: 700, overflowWrap: 'anywhere' }}
                      data-testid={`order-details-products-row-${index}-name`}
                    >
                      {displayRow?.displayName ?? product.product.name}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ overflowWrap: 'anywhere' }}
                      data-testid={`order-details-products-row-${index}-manufacturer`}
                    >
                      {displayRow?.manufacturer ?? product.product.manufacturer}
                    </Typography>
                    <Stack
                      direction="row"
                      spacing={1.5}
                      sx={{ mt: 0.5, display: { xs: 'flex', md: 'none' } }}
                    >
                      <Typography data-testid={`order-details-products-row-${index}-amount`}>
                        Qty: {product.quantity}
                      </Typography>
                      <Typography data-testid={`order-details-products-row-${index}-price`}>
                        {formatPrice(product.unitPrice)}
                      </Typography>
                    </Stack>
                  </Box>
                </Stack>

                <Typography sx={{ display: { xs: 'none', md: 'block' } }} data-testid={`order-details-products-row-${index}-amount`}>
                  {product.quantity}
                </Typography>

                <Typography sx={{ display: { xs: 'none', md: 'block' } }} data-testid={`order-details-products-row-${index}-price`}>
                  {formatPrice(product.unitPrice)}
                </Typography>

                <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="flex-end">
                  {isReceiveModeVisible ? (
                    <Checkbox
                      size="small"
                      checked={product.received || selectedReceivePendingRowIndices.includes(index)}
                      disabled={product.received || isReceiveSavePending}
                      onChange={() => onToggleReceiveProduct(index)}
                      data-testid={`order-details-products-row-${index}-receive-checkbox`}
                    />
                  ) : null}
                  <Chip
                    label={product.received ? 'Received' : 'Not Received'}
                    color={product.received ? 'success' : 'default'}
                    variant="outlined"
                    size="small"
                    sx={{ display: { xs: 'none', md: 'inline-flex' } }}
                  />
                  <Typography
                    color={product.received ? 'success.main' : 'text.secondary'}
                    sx={{ display: { xs: 'block', md: 'none' } }}
                    data-testid={
                      isReceiveModeVisible
                        ? `order-details-products-row-${index}-receive-state`
                        : `order-details-products-row-${index}-received`
                    }
                  >
                    {product.received ? 'Received' : 'Not Received'}
                  </Typography>
                </Stack>
              </Box>
            )
          })
        ) : (
          <Box sx={{ p: 2.5 }}>
            <Typography color="text.secondary" data-testid="order-details-products-empty">
              -
            </Typography>
          </Box>
        )}
      </Box>
    </Stack>
  )

  if (isEmbedded) {
    return (
      <Box sx={rootSx} data-testid="order-details-products-section">
        {content}
      </Box>
    )
  }

  return (
    <Paper sx={rootSx} data-testid="order-details-products-section">
      {content}
    </Paper>
  )
}
