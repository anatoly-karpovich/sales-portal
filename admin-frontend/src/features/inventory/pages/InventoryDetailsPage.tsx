import KeyboardBackspaceRoundedIcon from '@mui/icons-material/KeyboardBackspaceRounded'
import { Alert, Box, Button, Chip, Paper, Skeleton, Stack, Typography } from '@mui/material'
import { Link, useParams } from 'react-router-dom'
import type { InventoryRecordStatus, InventoryStatus } from '@/api/modules/inventory.api'
import { useInventoryDetailsQuery } from '@/features/inventory/hooks/useInventoryQuery'
import { inventoryUiText } from '@/features/inventory/inventory.ui-text'
import { useProductQuery } from '@/features/products/hooks/useProductsQuery'
import { formatDateTime } from '@/utils/date'

function getInventoryStatusColor(status: InventoryStatus) {
  if (status === 'Out Of Stock') return 'error'
  if (status === 'Low Stock') return 'warning'
  if (status === 'In Stock') return 'success'
  return 'default'
}

function getProductVariantStatusColor(status: InventoryRecordStatus) {
  if (status === 'Active') return 'primary'
  return 'default'
}

function getVariantCardBorderColor(status: InventoryStatus) {
  if (status === 'Out Of Stock') return 'error.dark'
  if (status === 'Low Stock') return 'warning.main'
  return 'divider'
}

function resolveAvailableNote(status: InventoryStatus) {
  if (status === 'Out Of Stock') return 'No stock available'
  if (status === 'Low Stock') return 'Limited stock available'
  return 'Ready to sell from stock'
}

function resolveVariantAttributesLabel(attributes: Record<string, string> | undefined) {
  if (!attributes) return ''

  return Object.values(attributes)
    .map((value) => value.trim())
    .filter((value) => value.length > 0)
    .join(' | ')
}

function resolveVariantAttributeEntries(
  attributes: Record<string, string> | undefined,
  namesByKey: Map<string, string>,
) {
  if (!attributes) return []

  return Object.entries(attributes)
    .map(([key, value]) => {
      const normalizedValue = value.trim()
      if (!normalizedValue) return null
      return {
        key,
        label: `${namesByKey.get(key) ?? key}: ${normalizedValue}`,
      }
    })
    .filter((entry): entry is { key: string; label: string } => Boolean(entry))
}

function InventoryDetailsSkeleton() {
  return (
    <Stack spacing={2.5} data-testid="inventory-details-page-skeleton">
      <Skeleton variant="text" width={160} height={34} />
      <Paper variant="outlined" sx={{ p: { xs: 2, md: 2.5 } }}>
        <Stack spacing={2}>
          <Skeleton variant="text" width={320} height={44} />
          <Skeleton variant="rounded" height={120} />
          <Skeleton variant="rounded" height={320} />
        </Stack>
      </Paper>
    </Stack>
  )
}

export function InventoryDetailsPage() {
  const { productId } = useParams<{ productId: string }>()

  const inventoryQuery = useInventoryDetailsQuery(productId ?? '', Boolean(productId))
  const productQuery = useProductQuery(productId ?? '', Boolean(productId))

  if (!productId) {
    return (
      <Paper sx={{ p: 3 }} data-testid="inventory-details-page-missing-id">
        <Typography color="error">{inventoryUiText.detailsPage.placeholders.missingProductId}</Typography>
      </Paper>
    )
  }

  if (inventoryQuery.isLoading || productQuery.isLoading) {
    return <InventoryDetailsSkeleton />
  }

  if (inventoryQuery.isError || productQuery.isError || !inventoryQuery.data || !productQuery.data) {
    return (
      <Paper sx={{ p: 3 }} data-testid="inventory-details-page-load-error">
        <Stack spacing={2} alignItems="flex-start">
          <Alert severity="error">{inventoryUiText.detailsPage.placeholders.unavailable}</Alert>
          <Button component={Link} to="/inventory" variant="outlined" data-testid="inventory-details-page-load-error-back-link">
            {inventoryUiText.detailsPage.backToInventory}
          </Button>
        </Stack>
      </Paper>
    )
  }

  const inventory = inventoryQuery.data
  const product = productQuery.data

  const productVariantsById = new Map(
    (product.variants ?? [])
      .filter((variant) => typeof variant._id === 'string')
      .map((variant) => [variant._id as string, variant]),
  )
  const productAttributeNamesByKey = new Map(
    (product.attributes ?? []).map((attribute) => [attribute.key, attribute.name]),
  )

  return (
    <Stack spacing={2.5} data-testid="inventory-details-page">
      <Button
        component={Link}
        to="/inventory"
        variant="text"
        startIcon={<KeyboardBackspaceRoundedIcon fontSize="small" />}
        sx={{ alignSelf: 'flex-start', px: 0, textTransform: 'none' }}
        data-testid="inventory-details-page-back-link"
      >
        {inventoryUiText.detailsPage.backToInventory}
      </Button>

      <Paper variant="outlined" sx={{ overflow: 'hidden' }} data-testid="inventory-details-page-content">
        <Stack spacing={0}>
          <Box sx={{ p: { xs: 2, md: 2.5 } }}>
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={1.5}
              alignItems={{ xs: 'flex-start', md: 'center' }}
              justifyContent="space-between"
            >
              <Stack spacing={0.75}>
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                  <Typography variant="h4" sx={{ fontWeight: 700 }} data-testid="inventory-details-page-title">
                    {product.name}
                  </Typography>
                  <Chip
                    label={inventory.inventoryStatus}
                    color={getInventoryStatusColor(inventory.inventoryStatus)}
                    variant="outlined"
                    size="small"
                    data-testid="inventory-details-page-inventory-status-chip"
                  />
                </Stack>
                <Stack spacing={0.25} color="text.secondary" data-testid="inventory-details-page-meta">
                  <Typography color="inherit" data-testid="inventory-details-page-meta-row-1">
                    {product.manufacturer} | {product.categoryPath || '-'} | Product status {product.status}
                  </Typography>
                  <Typography color="inherit" data-testid="inventory-details-page-meta-row-2">
                    Created {formatDateTime(inventory.createdOn)} | Updated {formatDateTime(inventory.updatedOn)}
                  </Typography>
                </Stack>
              </Stack>

              <Button
                component={Link}
                to={`/products/${productId}`}
                variant="outlined"
                data-testid="inventory-details-page-view-product-button"
              >
                {inventoryUiText.detailsPage.actions.viewProduct}
              </Button>
            </Stack>
          </Box>

          <Box sx={{ px: { xs: 2, md: 2.5 }, py: { xs: 1.5, md: 2 }, borderTop: 1, borderColor: 'divider' }}>
            <Box
              sx={{
                display: 'grid',
                gap: 1,
                gridTemplateColumns: {
                  xs: '1fr',
                  sm: 'repeat(2, minmax(0, 1fr))',
                  md: 'repeat(3, minmax(0, 1fr))',
                  xl: 'repeat(6, minmax(0, 1fr))',
                },
              }}
              data-testid="inventory-details-page-summary"
            >
              <Paper variant="outlined" sx={{ p: 1.1 }}>
                <Typography variant="caption" color="text.secondary" data-testid="inventory-details-page-summary-inventory-status-label">
                  {inventoryUiText.detailsPage.summary.inventoryStatus}
                </Typography>
                <Typography sx={{ mt: 0.25, fontWeight: 700, lineHeight: 1.2 }} data-testid="inventory-details-page-summary-inventory-status-value">
                  {inventory.inventoryStatus}
                </Typography>
              </Paper>

              <Paper variant="outlined" sx={{ p: 1.1 }}>
                <Typography variant="caption" color="text.secondary" data-testid="inventory-details-page-summary-low-stock-label">
                  {inventoryUiText.detailsPage.summary.lowStockVariants}
                </Typography>
                <Typography sx={{ mt: 0.25, fontWeight: 700, lineHeight: 1.2 }} data-testid="inventory-details-page-summary-low-stock-value">
                  {inventory.lowStockVariantsCount}
                </Typography>
              </Paper>

              <Paper variant="outlined" sx={{ p: 1.1 }}>
                <Typography variant="caption" color="text.secondary" data-testid="inventory-details-page-summary-out-of-stock-label">
                  {inventoryUiText.detailsPage.summary.outOfStockVariants}
                </Typography>
                <Typography sx={{ mt: 0.25, fontWeight: 700, lineHeight: 1.2 }} data-testid="inventory-details-page-summary-out-of-stock-value">
                  {inventory.outOfStockVariantsCount}
                </Typography>
              </Paper>

              <Paper variant="outlined" sx={{ p: 1.1 }}>
                <Typography variant="caption" color="text.secondary" data-testid="inventory-details-page-summary-total-available-label">
                  {inventoryUiText.detailsPage.summary.totalAvailable}
                </Typography>
                <Typography sx={{ mt: 0.25, fontWeight: 700, lineHeight: 1.2 }} data-testid="inventory-details-page-summary-total-available-value">
                  {inventory.totalAvailable}
                </Typography>
              </Paper>

              <Paper variant="outlined" sx={{ p: 1.1 }}>
                <Typography variant="caption" color="text.secondary" data-testid="inventory-details-page-summary-total-quantity-label">
                  {inventoryUiText.detailsPage.summary.totalQuantity}
                </Typography>
                <Typography sx={{ mt: 0.25, fontWeight: 700, lineHeight: 1.2 }} data-testid="inventory-details-page-summary-total-quantity-value">
                  {inventory.totalQuantity}
                </Typography>
              </Paper>

              <Paper variant="outlined" sx={{ p: 1.1 }}>
                <Typography variant="caption" color="text.secondary" data-testid="inventory-details-page-summary-total-reserved-label">
                  {inventoryUiText.detailsPage.summary.totalReserved}
                </Typography>
                <Typography sx={{ mt: 0.25, fontWeight: 700, lineHeight: 1.2 }} data-testid="inventory-details-page-summary-total-reserved-value">
                  {inventory.totalReserved}
                </Typography>
              </Paper>
            </Box>
          </Box>

          <Box
            sx={{
              px: { xs: 2, md: 2.5 },
              py: { xs: 1.5, md: 2 },
              borderTop: 1,
              borderColor: 'divider',
            }}
            data-testid="inventory-details-page-variants-section"
          >
            <Stack spacing={0.25} sx={{ mb: 1.5 }}>
              <Typography variant="h5" sx={{ fontWeight: 700 }} data-testid="inventory-details-page-variants-title">
                Variants Inventory
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                data-testid="inventory-details-page-variants-subtitle"
              >
                Stock is managed per product variant. Adjustments are tracked through inventory history.
              </Typography>
            </Stack>

            {inventory.variants.length === 0 ? (
              <Box sx={{ p: { xs: 0.5, md: 1 } }}>
                <Typography color="text.secondary" data-testid="inventory-details-page-variants-empty">
                  {inventoryUiText.detailsPage.placeholders.noVariants}
                </Typography>
              </Box>
            ) : (
              <Box
                sx={{
                  display: 'grid',
                  gap: 1.5,
                  gridTemplateColumns: {
                    xs: '1fr',
                    md: 'repeat(auto-fit, minmax(360px, 1fr))',
                    xl: 'repeat(3, minmax(0, 1fr))',
                  },
                }}
              >
                {inventory.variants.map((variant, index) => {
                  const productVariant = productVariantsById.get(variant.variantId)
                  const variantAttributesLabel = resolveVariantAttributesLabel(productVariant?.attributes)
                  const variantAttributeEntries = resolveVariantAttributeEntries(
                    productVariant?.attributes,
                    productAttributeNamesByKey,
                  )
                  const displayName = variantAttributesLabel
                    ? `${product.name} | ${variantAttributesLabel}`
                    : product.name

                  return (
                    <Paper
                      key={`${variant.variantId}-${index}`}
                      variant="outlined"
                      sx={{
                        p: { xs: 1.5, md: 2 },
                        minHeight: 270,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        borderColor: 'divider',
                        borderLeftWidth: 3,
                        borderLeftColor: getVariantCardBorderColor(variant.stockStatus),
                        transition: 'border-color 120ms ease, transform 120ms ease',
                        '&:hover': {
                          borderColor: 'text.secondary',
                          transform: 'translateY(-1px)',
                        },
                      }}
                      data-testid={`inventory-details-page-variant-row-${index}`}
                    >
                      <Stack spacing={1.25} sx={{ height: '100%' }}>
                        <Stack
                          direction={{ xs: 'column', lg: 'row' }}
                          spacing={1}
                          alignItems={{ xs: 'flex-start', lg: 'center' }}
                          justifyContent="space-between"
                        >
                          <Stack spacing={0.5} sx={{ minWidth: 0 }}>
                            <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
                              <Typography
                                sx={{ fontWeight: 700, overflowWrap: 'anywhere' }}
                                data-testid={`inventory-details-page-variant-row-${index}-title`}
                              >
                                {displayName}
                              </Typography>
                              <Chip
                                label={variant.status}
                                color={getProductVariantStatusColor(variant.status)}
                                variant="outlined"
                                size="small"
                                data-testid={`inventory-details-page-variant-row-${index}-variant-status`}
                              />
                              <Chip
                                label={variant.stockStatus}
                                color={getInventoryStatusColor(variant.stockStatus)}
                                variant="outlined"
                                size="small"
                                data-testid={`inventory-details-page-variant-row-${index}-stock-status`}
                              />
                            </Stack>

                            <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                                data-testid={`inventory-details-page-variant-row-${index}-manufacturer`}
                              >
                                {product.manufacturer}
                              </Typography>
                              {variantAttributeEntries.length > 0 ? (
                                <Typography variant="body2" color="text.secondary">
                                  •
                                </Typography>
                              ) : null}
                              {variantAttributeEntries.map((entry) => (
                                <Chip
                                  key={`${variant.variantId}-${entry.key}`}
                                  label={entry.label}
                                  size="small"
                                  variant="outlined"
                                  data-testid={`inventory-details-page-variant-row-${index}-attribute-chip-${entry.key}`}
                                />
                              ))}
                            </Stack>
                          </Stack>

                          <Stack direction="row" spacing={1}>
                            <Button
                              variant="contained"
                              disabled
                              data-testid={`inventory-details-page-variant-row-${index}-adjust-button`}
                            >
                              {inventoryUiText.detailsPage.actions.adjust}
                            </Button>
                            <Button
                              variant="outlined"
                              disabled
                              data-testid={`inventory-details-page-variant-row-${index}-settings-button`}
                            >
                              {inventoryUiText.detailsPage.actions.settings}
                            </Button>
                          </Stack>
                        </Stack>

                        <Paper variant="outlined" sx={{ p: 1.25 }}>
                          <Stack spacing={0.5}>
                            <Typography variant="caption" color="text.secondary">
                              {inventoryUiText.detailsPage.labels.available}
                            </Typography>
                            <Stack direction="row" spacing={1.5} justifyContent="space-between" alignItems="flex-end">
                              <Typography
                                variant="h3"
                                sx={{ fontWeight: 800, lineHeight: 1 }}
                                data-testid={`inventory-details-page-variant-row-${index}-available`}
                              >
                                {variant.available}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {resolveAvailableNote(variant.stockStatus)}
                              </Typography>
                            </Stack>
                          </Stack>
                        </Paper>

                        <Box
                          sx={{
                            display: 'grid',
                            gap: 1,
                            gridTemplateColumns: {
                              xs: 'repeat(2, minmax(0, 1fr))',
                              sm: 'repeat(4, minmax(0, 1fr))',
                            },
                          }}
                          data-testid={`inventory-details-page-variant-row-${index}-metrics`}
                        >
                          <Paper variant="outlined" sx={{ p: 1.1 }}>
                            <Typography variant="caption" color="text.secondary">
                              {inventoryUiText.detailsPage.labels.quantity}
                            </Typography>
                            <Typography
                              sx={{ mt: 0.5, fontWeight: 700 }}
                              data-testid={`inventory-details-page-variant-row-${index}-quantity`}
                            >
                              {variant.quantity}
                            </Typography>
                          </Paper>

                          <Paper variant="outlined" sx={{ p: 1.1 }}>
                            <Typography variant="caption" color="text.secondary">
                              {inventoryUiText.detailsPage.labels.reserved}
                            </Typography>
                            <Typography
                              sx={{ mt: 0.5, fontWeight: 700 }}
                              data-testid={`inventory-details-page-variant-row-${index}-reserved`}
                            >
                              {variant.reserved}
                            </Typography>
                          </Paper>

                          <Paper variant="outlined" sx={{ p: 1.1 }}>
                            <Typography variant="caption" color="text.secondary">
                              {inventoryUiText.detailsPage.labels.threshold}
                            </Typography>
                            <Typography
                              sx={{ mt: 0.5, fontWeight: 700 }}
                              data-testid={`inventory-details-page-variant-row-${index}-threshold`}
                            >
                              {variant.lowStockThreshold}
                            </Typography>
                          </Paper>

                          <Paper variant="outlined" sx={{ p: 1.1 }}>
                            <Typography variant="caption" color="text.secondary">
                              {inventoryUiText.detailsPage.labels.directOrder}
                            </Typography>
                            <Typography
                              sx={{ mt: 0.5, fontWeight: 700 }}
                              data-testid={`inventory-details-page-variant-row-${index}-selling-out-of-stock`}
                            >
                              {variant.allowSellingOutOfStock
                                ? inventoryUiText.detailsPage.labels.allowed
                                : inventoryUiText.detailsPage.labels.blocked}
                            </Typography>
                          </Paper>
                        </Box>

                      </Stack>
                    </Paper>
                  )
                })}
              </Box>
            )}
          </Box>
        </Stack>
      </Paper>
    </Stack>
  )
}
