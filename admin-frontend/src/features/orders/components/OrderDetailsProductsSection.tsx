import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded'
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  IconButton,
  Paper,
  Stack,
  Typography,
} from '@mui/material'
import type { OrderDetails } from '@/api/modules/orders.api'
import { ordersUiText } from '@/features/orders/orders.ui-text'
import { formatPrice } from '@/utils/number'

type OrderDetailsProductsSectionProps = {
  order: OrderDetails
  isProductsEditable: boolean
  isReceiveStartVisible: boolean
  isReceiveModeVisible: boolean
  isReceiveSavePending: boolean
  isReceiveSaveEnabled: boolean
  hasPendingProductsToReceive: boolean
  isSelectAllChecked: boolean
  isSelectAllIndeterminate: boolean
  selectedReceivePendingRowIndices: number[]
  onOpenProductsEdit: () => void
  onStartReceiveMode: () => void
  onCancelReceiveMode: () => void
  onSaveReceivedProducts: () => void
  onToggleSelectAllReceive: () => void
  onToggleReceiveProduct: (index: number) => void
}

function normalizeValue(value: string | number | null | undefined) {
  if (value === null || value === undefined) return '-'
  if (typeof value === 'string' && value.trim().length === 0) return '-'
  return String(value)
}

export function OrderDetailsProductsSection({
  order,
  isProductsEditable,
  isReceiveStartVisible,
  isReceiveModeVisible,
  isReceiveSavePending,
  isReceiveSaveEnabled,
  hasPendingProductsToReceive,
  isSelectAllChecked,
  isSelectAllIndeterminate,
  selectedReceivePendingRowIndices,
  onOpenProductsEdit,
  onStartReceiveMode,
  onCancelReceiveMode,
  onSaveReceivedProducts,
  onToggleSelectAllReceive,
  onToggleReceiveProduct,
}: OrderDetailsProductsSectionProps) {
  return (
    <Paper sx={{ p: { xs: 2, md: 3 } }} data-testid="order-details-products-section">
      <Stack spacing={2}>
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          justifyContent="space-between"
          flexWrap="wrap"
        >
          <Stack direction="row" spacing={0.75} alignItems="center">
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              {ordersUiText.detailsPage.labels.requestedProducts}
            </Typography>
            {isProductsEditable ? (
              <IconButton
                size="small"
                onClick={onOpenProductsEdit}
                data-testid="order-details-products-edit-trigger"
              >
                <EditOutlinedIcon fontSize="small" />
              </IconButton>
            ) : null}
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
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }} />

        {isReceiveModeVisible ? (
          <Stack direction="row" justifyContent="flex-end">
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Box
                sx={{ display: 'inline-flex', alignItems: 'center' }}
                data-testid="order-details-products-receive-select-all-checkbox-field"
              >
                <Checkbox
                  size="small"
                  checked={isSelectAllChecked}
                  indeterminate={isSelectAllIndeterminate}
                  disabled={!hasPendingProductsToReceive || isReceiveSavePending}
                  onChange={onToggleSelectAllReceive}
                  data-testid="order-details-products-receive-select-all-checkbox"
                />
              </Box>
              <Typography>{ordersUiText.detailsPage.placeholders.selectAll}</Typography>
            </Stack>
          </Stack>
        ) : null}

        <Stack spacing={1} data-testid="order-details-products-table">
          {order.products.length ? (
            order.products.map((product, index) => (
              <Accordion
                key={`${product._id}-${index}`}
                disableGutters
                elevation={0}
                data-testid={`order-details-products-row-${index}`}
              >
                <AccordionSummary expandIcon={<ExpandMoreRoundedIcon fontSize="small" />}>
                  <Box
                    sx={{
                      width: '100%',
                      display: 'flex',
                      gap: 1,
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                    }}
                  >
                    <Typography data-testid={`order-details-products-row-${index}-name`}>
                      {normalizeValue(product.name)}
                    </Typography>

                    {isReceiveModeVisible ? (
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <Box
                          sx={{ display: 'inline-flex', alignItems: 'center' }}
                          data-testid={`order-details-products-row-${index}-receive-checkbox-field`}
                        >
                          <Checkbox
                            size="small"
                            checked={
                              product.received || selectedReceivePendingRowIndices.includes(index)
                            }
                            disabled={product.received || isReceiveSavePending}
                            onChange={() => onToggleReceiveProduct(index)}
                            data-testid={`order-details-products-row-${index}-receive-checkbox`}
                          />
                        </Box>
                        <Typography
                          color={product.received ? 'success.main' : 'text.secondary'}
                          data-testid={`order-details-products-row-${index}-receive-state`}
                        >
                          {product.received ? 'Received' : 'Not Received'}
                        </Typography>
                      </Stack>
                    ) : (
                      <Typography
                        color={product.received ? 'success.main' : 'text.secondary'}
                        data-testid={`order-details-products-row-${index}-received`}
                      >
                        {product.received ? 'Received' : 'Not Received'}
                      </Typography>
                    )}
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Stack spacing={0.8}>
                    <Typography data-testid={`order-details-products-row-${index}-manufacturer`}>
                      <Typography
                        component="span"
                        variant="subtitle2"
                        sx={{ color: 'text.primary', fontWeight: 700 }}
                      >
                        Manufacturer:
                      </Typography>{' '}
                      {normalizeValue(product.manufacturer)}
                    </Typography>
                    <Typography data-testid={`order-details-products-row-${index}-amount`}>
                      <Typography
                        component="span"
                        variant="subtitle2"
                        sx={{ color: 'text.primary', fontWeight: 700 }}
                      >
                        Amount:
                      </Typography>{' '}
                      {normalizeValue(product.amount)}
                    </Typography>
                    <Typography data-testid={`order-details-products-row-${index}-price`}>
                      <Typography
                        component="span"
                        variant="subtitle2"
                        sx={{ color: 'text.primary', fontWeight: 700 }}
                      >
                        Price:
                      </Typography>{' '}
                      {formatPrice(product.price)}
                    </Typography>
                  </Stack>
                </AccordionDetails>
              </Accordion>
            ))
          ) : (
            <Typography color="text.secondary">-</Typography>
          )}
        </Stack>
      </Stack>
    </Paper>
  )
}
