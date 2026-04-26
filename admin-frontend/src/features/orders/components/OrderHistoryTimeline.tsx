import { useMemo } from 'react'
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded'
import { useQuery } from '@tanstack/react-query'
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  CircularProgress,
  Paper,
  Stack,
  Typography,
} from '@mui/material'
import { getCustomerById } from '@/api/modules/customers.api'
import type {
  OrderAssignedManager,
  OrderDelivery,
  OrderHistoryCustomerRef,
  OrderHistoryEntry,
  OrderProduct,
} from '@/api/modules/orders.api'
import { ordersQueryKeys } from '@/features/orders/hooks/ordersQueryKeys'
import { ordersUiText } from '@/features/orders/orders.ui-text'
import { formatDate, formatDateTime } from '@/utils/date'
import { formatPrice } from '@/utils/number'
import { getOrderStatusColor } from '@/utils/orderStatus'

type OrderHistoryTimelineProps = {
  history: OrderHistoryEntry[]
}

type HistoryChange = {
  label: string
  previous: string
  updated: string
}

const STATUS_ACTIONS = new Set([
  'Order created',
  'Order canceled',
  'Order processing started',
  'Order reopened',
])

const DELIVERY_ACTIONS = new Set(['Delivery Scheduled', 'Delivery Edited'])
const CUSTOMER_ACTIONS = new Set(['Customer changed'])
const REQUESTED_PRODUCTS_ACTIONS = new Set(['Requested products changed'])
const RECEIVED_ACTIONS = new Set(['Received', 'All products received'])
const MANAGER_ACTIONS = new Set(['Manager Assigned', 'Manager Unassigned'])

function normalizeText(value: string | number | null | undefined) {
  if (value === null || value === undefined) return '-'
  if (typeof value === 'string') {
    const normalized = value.trim()
    return normalized.length ? normalized : '-'
  }
  return String(value)
}

function resolvePersonName(person: Partial<OrderAssignedManager> | null | undefined) {
  if (!person) return '-'
  const fullName = `${person.firstName ?? ''} ${person.lastName ?? ''}`.trim()
  return fullName || normalizeText(person.username)
}

function resolveAssignedManagerName(person: Partial<OrderAssignedManager> | null | undefined) {
  if (!person) return ordersUiText.detailsPage.history.notAssigned
  const fullName = `${person.firstName ?? ''} ${person.lastName ?? ''}`.trim()
  return fullName || normalizeText(person.username)
}

function resolveActionLabel(action: string | undefined) {
  if (typeof action === 'string' && action.trim().length) return action
  return ordersUiText.detailsPage.history.unknownActionLabel
}

function resolveHistoryCustomerId(customer: OrderHistoryCustomerRef | undefined) {
  if (!customer) return null
  if (typeof customer === 'string') return customer
  if (
    typeof customer === 'object' &&
    typeof customer._id === 'string' &&
    customer._id.trim().length
  ) {
    return customer._id
  }
  return null
}

function resolveHistoryCustomerName(
  entry: OrderHistoryEntry | undefined,
  customerNames: Record<string, string>,
) {
  const customerId = resolveHistoryCustomerId(entry?.customer)
  if (!customerId) return '-'
  return customerNames[customerId] ?? customerId
}

function resolveReceivedLabel(received: boolean | undefined) {
  return received ? 'Received' : ordersUiText.detailsPage.history.notReceived
}

function resolveDeliveryFieldValue(
  delivery: OrderDelivery | null | undefined,
  field: keyof OrderDelivery['address'] | 'condition' | 'finalDate',
) {
  if (!delivery) return '-'
  if (field === 'condition') return normalizeText(delivery.condition)
  if (field === 'finalDate') return formatDate(delivery.finalDate)
  return normalizeText(delivery.address?.[field])
}

function resolveDeliverySummary(
  deliveryStatus: string | undefined,
  delivery: OrderDelivery | null | undefined,
) {
  const statusLabel = normalizeText(deliveryStatus)
  const dateLabel = delivery?.finalDate ? formatDate(delivery.finalDate) : '-'

  if (statusLabel === '-' && dateLabel === '-') {
    return ordersUiText.detailsPage.placeholders.noDelivery
  }

  if (statusLabel === '-') {
    return dateLabel
  }

  if (dateLabel === '-') {
    return statusLabel
  }

  return `${statusLabel}, ${dateLabel}`
}

function buildStatusChanges(
  current: OrderHistoryEntry,
  previous: OrderHistoryEntry | undefined,
): HistoryChange[] {
  return [
    {
      label: 'Status',
      previous: normalizeText(previous?.status),
      updated: normalizeText(current.status),
    },
  ]
}

function buildDeliveryChanges(
  current: OrderHistoryEntry,
  previous: OrderHistoryEntry | undefined,
): HistoryChange[] {
  return [
    {
      label: 'Delivery type',
      previous: resolveDeliveryFieldValue(previous?.delivery, 'condition'),
      updated: resolveDeliveryFieldValue(current.delivery, 'condition'),
    },
    {
      label: 'Delivery date',
      previous: resolveDeliveryFieldValue(previous?.delivery, 'finalDate'),
      updated: resolveDeliveryFieldValue(current.delivery, 'finalDate'),
    },
    {
      label: 'City',
      previous: resolveDeliveryFieldValue(previous?.delivery, 'city'),
      updated: resolveDeliveryFieldValue(current.delivery, 'city'),
    },
    {
      label: 'Street',
      previous: resolveDeliveryFieldValue(previous?.delivery, 'street'),
      updated: resolveDeliveryFieldValue(current.delivery, 'street'),
    },
    {
      label: 'House',
      previous: resolveDeliveryFieldValue(previous?.delivery, 'house'),
      updated: resolveDeliveryFieldValue(current.delivery, 'house'),
    },
    {
      label: 'Flat',
      previous: resolveDeliveryFieldValue(previous?.delivery, 'flat'),
      updated: resolveDeliveryFieldValue(current.delivery, 'flat'),
    },
  ]
}

function buildCustomerChanges(
  current: OrderHistoryEntry,
  previous: OrderHistoryEntry | undefined,
  customerNames: Record<string, string>,
): HistoryChange[] {
  return [
    {
      label: 'Customer',
      previous: resolveHistoryCustomerName(previous, customerNames),
      updated: resolveHistoryCustomerName(current, customerNames),
    },
  ]
}

function buildRequestedProductsChanges(
  current: OrderHistoryEntry,
  previous: OrderHistoryEntry | undefined,
): HistoryChange[] {
  const previousProducts = previous?.products ?? []
  const updatedProducts = current.products ?? []
  const maxLength = Math.max(previousProducts.length, updatedProducts.length)

  return Array.from({ length: maxLength }).map((_, productIndex) => ({
    label: `${ordersUiText.detailsPage.history.productLabel} ${productIndex + 1}`,
    previous: normalizeText(previousProducts[productIndex]?.name),
    updated: normalizeText(updatedProducts[productIndex]?.name),
  }))
}

function buildReceivedChanges(
  current: OrderHistoryEntry,
  previous: OrderHistoryEntry | undefined,
): HistoryChange[] {
  const updatedProducts = current.products ?? []
  const previousProducts = previous?.products ?? []

  return updatedProducts.map((updatedProduct, productIndex) => ({
    label: normalizeText(updatedProduct.name),
    previous: resolveReceivedLabel(previousProducts[productIndex]?.received),
    updated: resolveReceivedLabel(updatedProduct.received),
  }))
}

function buildManagerChanges(
  current: OrderHistoryEntry,
  previous: OrderHistoryEntry | undefined,
): HistoryChange[] {
  return [
    {
      label: ordersUiText.detailsPage.history.assignedManager,
      previous: resolveAssignedManagerName(previous?.assignedManager),
      updated: resolveAssignedManagerName(current.assignedManager),
    },
  ]
}

function buildFallbackChanges(
  current: OrderHistoryEntry,
  previous: OrderHistoryEntry | undefined,
  customerNames: Record<string, string>,
): HistoryChange[] {
  const fallbackChanges: HistoryChange[] = []

  if (current.status !== previous?.status) {
    fallbackChanges.push({
      label: ordersUiText.detailsPage.history.orderStatus,
      previous: normalizeText(previous?.status),
      updated: normalizeText(current.status),
    })
  }

  const previousCustomerName = resolveHistoryCustomerName(previous, customerNames)
  const updatedCustomerName = resolveHistoryCustomerName(current, customerNames)
  if (previousCustomerName !== updatedCustomerName) {
    fallbackChanges.push({
      label: 'Customer',
      previous: previousCustomerName,
      updated: updatedCustomerName,
    })
  }

  const previousDelivery = resolveDeliverySummary(previous?.deliveryStatus, previous?.delivery)
  const updatedDelivery = resolveDeliverySummary(current.deliveryStatus, current.delivery)
  if (previousDelivery !== updatedDelivery) {
    fallbackChanges.push({
      label: ordersUiText.detailsPage.history.delivery,
      previous: previousDelivery,
      updated: updatedDelivery,
    })
  }

  const previousTotalPrice = formatPrice(previous?.total_price)
  const updatedTotalPrice = formatPrice(current.total_price)
  if (previousTotalPrice !== updatedTotalPrice) {
    fallbackChanges.push({
      label: ordersUiText.detailsPage.history.totalPrice,
      previous: previousTotalPrice,
      updated: updatedTotalPrice,
    })
  }

  if (!fallbackChanges.length) {
    fallbackChanges.push({
      label: ordersUiText.detailsPage.history.fallbackChangeLabel,
      previous: resolveActionLabel(previous?.action),
      updated: resolveActionLabel(current.action),
    })
  }

  return fallbackChanges
}

function buildHistoryChanges(
  current: OrderHistoryEntry,
  previous: OrderHistoryEntry | undefined,
  customerNames: Record<string, string>,
): HistoryChange[] {
  const action = resolveActionLabel(current.action)

  if (STATUS_ACTIONS.has(action)) return buildStatusChanges(current, previous)
  if (DELIVERY_ACTIONS.has(action)) return buildDeliveryChanges(current, previous)
  if (CUSTOMER_ACTIONS.has(action)) return buildCustomerChanges(current, previous, customerNames)
  if (REQUESTED_PRODUCTS_ACTIONS.has(action)) {
    return buildRequestedProductsChanges(current, previous)
  }
  if (RECEIVED_ACTIONS.has(action)) return buildReceivedChanges(current, previous)
  if (MANAGER_ACTIONS.has(action)) return buildManagerChanges(current, previous)

  return buildFallbackChanges(current, previous, customerNames)
}

function buildHistoryCustomerIds(history: OrderHistoryEntry[]) {
  const ids = new Set<string>()
  history.forEach((entry) => {
    const customerId = resolveHistoryCustomerId(entry.customer)
    if (customerId) ids.add(customerId)
  })
  return [...ids]
}

function HistoryProducts({ products, index }: { products: OrderProduct[]; index: number }) {
  if (!products.length) {
    return <Typography color="text.secondary">-</Typography>
  }

  return (
    <Box
      sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}
      data-testid={`order-details-history-item-${index}-products-list`}
    >
      {products.map((product, productIndex) => (
        <Box
          key={`${product._id}-${productIndex}`}
          component="span"
          sx={{
            px: 1,
            py: 0.5,
            borderRadius: 1.5,
            border: 1,
            borderColor: 'divider',
            backgroundColor: product.received
              ? 'rgba(46, 125, 50, 0.2)'
              : (theme) =>
                  theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.04)' : 'grey.100',
            color: product.received ? 'success.light' : 'text.primary',
            fontSize: '0.8125rem',
            lineHeight: 1.35,
            fontWeight: 600,
          }}
          data-testid={`order-details-history-item-${index}-products-item-${productIndex}`}
        >
          {product.name}
          {product.received ? ' \u2713' : ''}
        </Box>
      ))}
    </Box>
  )
}

export function OrderHistoryTimeline({ history }: OrderHistoryTimelineProps) {
  const customerIds = useMemo(() => buildHistoryCustomerIds(history), [history])

  const customersDirectoryQuery = useQuery({
    queryKey: [...ordersQueryKeys.all, 'history-customers', customerIds] as const,
    queryFn: async () => {
      const resolvedCustomers = await Promise.all(
        customerIds.map(async (customerId) => {
          try {
            const customer = await getCustomerById(customerId, { skipErrorToast: true })
            return [customerId, customer.name] as const
          } catch {
            return [customerId, customerId] as const
          }
        }),
      )

      return Object.fromEntries(resolvedCustomers)
    },
    enabled: customerIds.length > 0,
    staleTime: 5 * 60 * 1000,
  })

  const customerNamesById = customersDirectoryQuery.data ?? {}

  if (!history.length) {
    return (
      <Typography color="text.secondary" data-testid="order-details-history-empty">
        {ordersUiText.detailsPage.history.noHistory}
      </Typography>
    )
  }

  return (
    <Stack
      spacing={2}
      sx={{
        position: 'relative',
        pl: { xs: 3, md: 4 },
      }}
      data-testid="order-details-history-list"
    >
      <Box
        sx={{
          position: 'absolute',
          top: 10,
          bottom: 10,
          left: { xs: 11, md: 15 },
          width: 2,
          borderRadius: 999,
          backgroundColor: 'divider',
        }}
        aria-hidden
      />

      {history.map((entry, index) => {
        const previousEntry = history[index + 1]
        const changes = buildHistoryChanges(entry, previousEntry, customerNamesById)
        const stateRows: Array<{ label: string; value: string; valueColor?: string }> = [
          {
            label: ordersUiText.detailsPage.history.orderStatus,
            value: normalizeText(entry.status),
            valueColor: getOrderStatusColor(normalizeText(entry.status)),
          },
          {
            label: ordersUiText.detailsPage.history.totalPrice,
            value: formatPrice(entry.total_price),
          },
          {
            label: ordersUiText.detailsPage.history.delivery,
            value: resolveDeliverySummary(entry.deliveryStatus, entry.delivery),
          },
          {
            label: ordersUiText.detailsPage.history.assignedManager,
            value: resolveAssignedManagerName(entry.assignedManager),
          },
        ]

        return (
          <Box
            key={`${entry.changedOn ?? 'no-date'}-${index}`}
            sx={{ position: 'relative' }}
            data-testid={`order-details-history-item-${index}`}
          >
            <Box
              sx={{
                position: 'absolute',
                width: 12,
                height: 12,
                borderRadius: '50%',
                left: { xs: -18, md: -22 },
                top: 22,
                border: 2,
                borderColor: 'background.paper',
                backgroundColor: 'primary.main',
                boxShadow: (theme) =>
                  theme.palette.mode === 'dark'
                    ? '0 0 0 4px rgba(66, 165, 245, 0.2)'
                    : '0 0 0 4px rgba(25, 118, 210, 0.14)',
              }}
              aria-hidden
            />

            <Accordion
              disableGutters
              elevation={0}
              defaultExpanded={index === 0}
              data-testid={`order-details-history-item-${index}-accordion`}
              sx={{
                border: 1,
                borderColor: 'divider',
                borderRadius: 2,
                backgroundColor: 'background.paper',
                overflow: 'hidden',
                '&::before': {
                  display: 'none',
                },
                '& .MuiAccordionSummary-root': {
                  px: { xs: 1.5, md: 2 },
                  py: 1.5,
                  minHeight: 0,
                },
                '& .MuiAccordionSummary-content': {
                  my: 0,
                },
                '& .MuiAccordionSummary-expandIconWrapper': {
                  color: 'text.secondary',
                },
                '& .MuiAccordionDetails-root': {
                  px: { xs: 1.5, md: 2 },
                  pt: 0,
                  pb: { xs: 1.5, md: 2 },
                },
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreRoundedIcon fontSize="small" />}
                data-testid={`order-details-history-item-${index}-summary`}
              >
                <Box
                  sx={{
                    width: '100%',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: { xs: 'flex-start', md: 'center' },
                    flexDirection: { xs: 'column', md: 'row' },
                    gap: 1,
                  }}
                >
                  <Typography
                    variant="h6"
                    sx={{ fontWeight: 700, fontSize: '1.3125rem', lineHeight: 1.25 }}
                    data-testid={`order-details-history-item-${index}-action`}
                  >
                    {resolveActionLabel(entry.action)}
                  </Typography>

                  <Stack
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    flexWrap="wrap"
                    sx={{ alignSelf: { xs: 'flex-start', md: 'auto' } }}
                  >
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ fontSize: '0.8125rem', lineHeight: 1.35 }}
                      data-testid={`order-details-history-item-${index}-performer`}
                    >
                      By {resolvePersonName(entry.performer)}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ fontSize: '0.8125rem', lineHeight: 1.35 }}
                    >
                      &bull;
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ fontSize: '0.8125rem', lineHeight: 1.35 }}
                      data-testid={`order-details-history-item-${index}-changed-on`}
                    >
                      {formatDateTime(entry.changedOn)}
                    </Typography>
                    {customersDirectoryQuery.isFetching && index === 0 ? (
                      <CircularProgress
                        size={14}
                        data-testid="order-details-history-customer-lookup-loader"
                      />
                    ) : null}
                  </Stack>
                </Box>
              </AccordionSummary>

              <AccordionDetails>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: {
                      xs: '1fr',
                      lg: 'minmax(0, 1.5fr) minmax(250px, 0.95fr)',
                    },
                    gap: 1.5,
                    alignItems: 'start',
                  }}
                >
                  <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                    <Stack spacing={1.25}>
                      <Typography
                        variant="overline"
                        color="text.secondary"
                        sx={{
                          fontWeight: 700,
                          fontSize: '0.8125rem',
                          lineHeight: 1.35,
                          letterSpacing: 0.4,
                        }}
                      >
                        {ordersUiText.detailsPage.history.whatChanged}
                      </Typography>

                      {changes.map((change, changeIndex) => (
                        <Box
                          key={`${change.label}-${changeIndex}`}
                          sx={{
                            pb: changeIndex === changes.length - 1 ? 0 : 1.25,
                            borderBottom: changeIndex === changes.length - 1 ? 'none' : 1,
                            borderColor: 'divider',
                          }}
                          data-testid={`order-details-history-item-${index}-change-${changeIndex}`}
                        >
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{
                              mb: 0.75,
                              fontSize: '0.875rem',
                              lineHeight: 1.4,
                              fontWeight: 500,
                            }}
                          >
                            {change.label}
                          </Typography>
                          <Box
                            sx={{
                              display: 'grid',
                              gridTemplateColumns: {
                                xs: '1fr',
                                sm: 'minmax(0, 1fr) auto minmax(0, 1fr)',
                              },
                              gap: 1,
                              alignItems: 'center',
                            }}
                          >
                            <Box
                              sx={{
                                p: 1,
                                borderRadius: 1.5,
                                backgroundColor: 'rgba(229, 57, 53, 0.12)',
                                color: 'error.light',
                                overflowWrap: 'anywhere',
                                fontSize: '0.875rem',
                                lineHeight: 1.4,
                              }}
                            >
                              {change.previous}
                            </Box>
                            <Typography
                              color="text.secondary"
                              sx={{
                                textAlign: 'center',
                                display: { xs: 'none', sm: 'block' },
                                fontSize: '0.875rem',
                                lineHeight: 1.4,
                              }}
                            >
                              &rarr;
                            </Typography>
                            <Box
                              sx={{
                                p: 1,
                                borderRadius: 1.5,
                                backgroundColor: 'rgba(46, 125, 50, 0.2)',
                                color: 'success.light',
                                overflowWrap: 'anywhere',
                                fontSize: '0.875rem',
                                lineHeight: 1.4,
                              }}
                            >
                              {change.updated}
                            </Box>
                          </Box>
                        </Box>
                      ))}
                    </Stack>
                  </Paper>

                  <Stack spacing={1.5} sx={{ alignSelf: 'start' }}>
                    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                      <Stack spacing={1}>
                        <Typography
                          variant="overline"
                          color="text.secondary"
                          sx={{
                            fontWeight: 700,
                            fontSize: '0.8125rem',
                            lineHeight: 1.35,
                            letterSpacing: 0.4,
                          }}
                        >
                          {ordersUiText.detailsPage.history.stateAfterEvent}
                        </Typography>
                        {stateRows.map((row, rowIndex) => (
                          <Box
                            key={`${row.label}-${rowIndex}`}
                            sx={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              gap: 1,
                              alignItems: 'flex-start',
                              pb: rowIndex === stateRows.length - 1 ? 0 : 0.75,
                              borderBottom: rowIndex === stateRows.length - 1 ? 'none' : 1,
                              borderColor: 'divider',
                            }}
                            data-testid={`order-details-history-item-${index}-state-row-${rowIndex}`}
                          >
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{ fontSize: '0.875rem', lineHeight: 1.4, fontWeight: 500 }}
                            >
                              {row.label}
                            </Typography>
                            <Typography
                              variant="body2"
                              sx={{
                                fontWeight: 600,
                                textAlign: 'right',
                                fontSize: '0.875rem',
                                lineHeight: 1.4,
                                color: row.valueColor ?? 'text.primary',
                              }}
                            >
                              {row.value}
                            </Typography>
                          </Box>
                        ))}
                      </Stack>
                    </Paper>

                    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                      <Stack spacing={1}>
                        <Typography
                          variant="overline"
                          color="text.secondary"
                          sx={{
                            fontWeight: 700,
                            fontSize: '0.8125rem',
                            lineHeight: 1.35,
                            letterSpacing: 0.4,
                          }}
                        >
                          {ordersUiText.detailsPage.history.productsAfterEvent}
                        </Typography>
                        <HistoryProducts products={entry.products ?? []} index={index} />
                      </Stack>
                    </Paper>
                  </Stack>
                </Box>
              </AccordionDetails>
            </Accordion>
          </Box>
        )
      })}
    </Stack>
  )
}
