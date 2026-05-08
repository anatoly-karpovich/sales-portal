import AddRoundedIcon from '@mui/icons-material/AddRounded'
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { Product, ProductVariant } from '@/api/modules/products.api'
import type {
  OrderDelivery,
  OrderDetails,
  OrderDetailsProduct,
  OrderProductRequestItem,
} from '@/api/modules/orders.api'
import { ORDER_DETAILS_SEARCH_DEBOUNCE_MS } from '@/features/orders/config/orderDetails.config'
import {
  buildPickupLocationsByStateMap,
  resolvePickupLocation,
} from '@/features/orders/config/pickupLocations.config'
import { OrderProductQuantityControl } from '@/features/orders/components/OrderProductQuantityControl'
import {
  useOrderPricingMutation,
  useOrderProductDetailsQuery,
  useOrderProductsDetailsQueries,
  useOrderProductOptionsQuery,
} from '@/features/orders/hooks/useOrdersQuery'
import { ordersUiText } from '@/features/orders/orders.ui-text'
import { toVariantTitle } from '@/features/products/forms/productVariantsDraft'
import { useSettingsQuery } from '@/features/settings/hooks/useSettingsQuery'
import { formatPrice } from '@/utils/number'

export type OrderDetailsProductDisplayRow = {
  displayName: string
  manufacturer: string
  imageUrl: string
}

type ProductSummary = {
  _id: string
  name: string
  manufacturer: string
  category: string
  variantsCount: number
}

type SelectedVariantRow = {
  rowId: number
  productId: string
  productName: string
  variantId: string
  variantLabel: string
  unitPrice: number
  quantity: number
}

type OrderDetailsProductsSectionProps = {
  order: OrderDetails
  displayRows: OrderDetailsProductDisplayRow[]
  currentDelivery: OrderDelivery | null
  isProductsEditable: boolean
  isProductsEditMode: boolean
  isProductsEditSavePending: boolean
  isReceiveStartVisible: boolean
  isReceiveModeVisible: boolean
  isReceiveSavePending: boolean
  isReceiveSaveEnabled: boolean
  hasPendingProductsToReceive: boolean
  isSelectAllChecked: boolean
  isSelectAllIndeterminate: boolean
  selectedReceivePendingRowIndices: number[]
  isEmbedded?: boolean
  onStartProductsEdit: () => void
  onCancelProductsEdit: () => void
  onSaveProductsEdit: (payload: {
    products: OrderProductRequestItem[]
  }) => Promise<boolean> | boolean
  onStartReceiveMode: () => void
  onCancelReceiveMode: () => void
  onSaveReceivedProducts: () => void
  onToggleSelectAllReceive: () => void
  onToggleReceiveProduct: (index: number) => void
}

type InlineProductsEditorProps = {
  orderProducts: OrderDetailsProduct[]
  currentDelivery: OrderDelivery | null
  isSubmitting: boolean
  onCancel: () => void
  onSave: (payload: { products: OrderProductRequestItem[] }) => Promise<boolean> | boolean
}

function clampQuantity(value: number, max: number) {
  return Math.min(Math.max(value, 1), max)
}

function isVariantActive(variant: ProductVariant) {
  return variant.status === 'Active'
}

function toProductSummary(product: Product): ProductSummary {
  return {
    _id: product._id,
    name: product.name,
    manufacturer: product.manufacturer,
    category: product.category,
    variantsCount: typeof product.variantsCount === 'number' ? product.variantsCount : 0,
  }
}

function buildVariantLabel(variant: ProductVariant, product: Product) {
  const variantTitle = toVariantTitle(variant, product.attributes)
  return variantTitle || variant._id || 'Variant'
}

function buildSnapshotVariantLabel(attributes: Record<string, string>) {
  return Object.values(attributes)
    .map((value) => value.trim())
    .filter((value) => value.length > 0)
    .join(' | ')
}

function toSelectedRows(products: OrderDetailsProduct[]) {
  return products.map((product, index) => ({
    rowId: index + 1,
    productId: product.productId,
    productName: product.name,
    variantId: product.variantId,
    variantLabel: buildSnapshotVariantLabel(product.attributes),
    unitPrice: product.unitPrice,
    quantity: product.quantity,
  }))
}

function normalizeRequestedProducts(items: OrderProductRequestItem[]) {
  return [...items].sort((left, right) =>
    `${left.productId}|${left.variantId}`.localeCompare(`${right.productId}|${right.variantId}`),
  )
}

function areEqualRequestedProducts(a: OrderProductRequestItem[], b: OrderProductRequestItem[]) {
  if (a.length !== b.length) return false
  const normalizedA = normalizeRequestedProducts(a)
  const normalizedB = normalizeRequestedProducts(b)
  return normalizedA.every(
    (item, index) =>
      item.productId === normalizedB[index].productId &&
      item.variantId === normalizedB[index].variantId &&
      item.quantity === normalizedB[index].quantity,
  )
}

function toOrderPricingContext(
  delivery: OrderDelivery | null,
  pickupLocationsMap: ReturnType<typeof buildPickupLocationsByStateMap>,
):
  | {
      delivery: {
        express: boolean
        address: OrderDelivery['address']
      }
      pickup?: never
    }
  | {
      pickup: {
        pickupLocationId: string
      }
      delivery?: never
    }
  | null {
  if (!delivery) return null

  if (delivery.condition === 'Delivery') {
    return {
      delivery: {
        express: 'express' in delivery.schedule ? delivery.schedule.express : false,
        address: delivery.address,
      },
    }
  }

  const pickupLocation = resolvePickupLocation(
    pickupLocationsMap,
    delivery.address.state,
    delivery.address.city,
  )

  if (!pickupLocation) return null
  return { pickup: { pickupLocationId: pickupLocation.id } }
}

function InlineProductsEditor({
  orderProducts,
  currentDelivery,
  isSubmitting,
  onCancel,
  onSave,
}: InlineProductsEditorProps) {
  const [parentProductSearch, setParentProductSearch] = useState('')
  const [debouncedParentProductSearch, setDebouncedParentProductSearch] = useState('')
  const [selectedParentProduct, setSelectedParentProduct] = useState<ProductSummary | null>(null)
  const [selectedVariantIds, setSelectedVariantIds] = useState<string[]>([])
  const [selectedRows, setSelectedRows] = useState<SelectedVariantRow[]>(() =>
    toSelectedRows(orderProducts),
  )
  const [isPricingPreviewUnavailable, setIsPricingPreviewUnavailable] = useState(false)
  const [isPricingPreviewLoading, setIsPricingPreviewLoading] = useState(false)
  const [pricingPreviewTotal, setPricingPreviewTotal] = useState<number | null>(null)
  const [pricingPreviewProductsSubtotal, setPricingPreviewProductsSubtotal] = useState<
    number | null
  >(null)
  const [pricingPreviewDeliveryPrice, setPricingPreviewDeliveryPrice] = useState<number | null>(
    null,
  )
  const nextRowIdRef = useRef(selectedRows.length > 0 ? selectedRows.length + 1 : 1)
  const pricingRequestIdRef = useRef(0)

  const {
    data: settings,
    isLoading: isSettingsLoading,
    isFetching: isSettingsFetching,
    refetch: refetchSettings,
  } = useSettingsQuery(true)
  const { mutateAsync: calculatePricingAsync } = useOrderPricingMutation()
  const pickupLocationsMap = useMemo(
    () => buildPickupLocationsByStateMap(settings?.shipping.pickup.locations),
    [settings?.shipping.pickup.locations],
  )
  const maxProductsInOrder = settings?.order.maxProductsInOrder
  const maxProductQuantityInOrder = settings?.order.maxProductQuantityInOrder
  const hasValidSettings =
    typeof maxProductsInOrder === 'number' &&
    maxProductsInOrder >= 1 &&
    typeof maxProductQuantityInOrder === 'number' &&
    maxProductQuantityInOrder >= 1
  const isSettingsPending = isSettingsLoading || (!settings && isSettingsFetching)
  const isSettingsUnavailable = !isSettingsPending && !hasValidSettings

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedParentProductSearch(parentProductSearch.trim())
    }, ORDER_DETAILS_SEARCH_DEBOUNCE_MS)
    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [parentProductSearch])

  const parentProductsQuery = useOrderProductOptionsQuery(
    debouncedParentProductSearch,
    hasValidSettings,
  )
  const parentProductOptions = useMemo(
    () =>
      (parentProductsQuery.data?.Products ?? [])
        .filter((product) => product.status === 'Active' && (product.variantsCount ?? 0) > 0)
        .map(toProductSummary),
    [parentProductsQuery.data?.Products],
  )
  const parentProductOptionIds = useMemo(
    () => parentProductOptions.map((product) => product._id),
    [parentProductOptions],
  )
  const parentProductDetailsQueries = useOrderProductsDetailsQueries(
    parentProductOptionIds,
    hasValidSettings,
  )
  const parentProductsWithActiveVariants = useMemo(() => {
    const hasActiveVariantById = new Map<string, boolean>()
    parentProductDetailsQueries.forEach((query, index) => {
      const productId = parentProductOptionIds[index]
      if (!productId || !query.data) return
      hasActiveVariantById.set(productId, query.data.variants.some(isVariantActive))
    })
    return parentProductOptions.filter((product) => hasActiveVariantById.get(product._id) !== false)
  }, [parentProductDetailsQueries, parentProductOptionIds, parentProductOptions])
  const parentProductDetailsQuery = useOrderProductDetailsQuery(
    selectedParentProduct?._id ?? '',
    Boolean(selectedParentProduct),
  )
  const variantOptions = useMemo(() => {
    const product = parentProductDetailsQuery.data
    if (!product) return []
    return product.variants.filter(isVariantActive)
  }, [parentProductDetailsQuery.data])

  const normalizedRows = useMemo(() => {
    if (!hasValidSettings || !maxProductQuantityInOrder) return []
    return selectedRows.map((row) => ({
      productId: row.productId,
      variantId: row.variantId,
      quantity: clampQuantity(row.quantity, maxProductQuantityInOrder),
    }))
  }, [hasValidSettings, maxProductQuantityInOrder, selectedRows])
  const initialRequestedProducts = useMemo(
    () =>
      orderProducts.map((product) => ({
        productId: product.productId,
        variantId: product.variantId,
        quantity: product.quantity,
      })),
    [orderProducts],
  )
  const hasDuplicateRows = useMemo(
    () =>
      new Set(normalizedRows.map((row) => `${row.productId}|${row.variantId}`)).size !==
      normalizedRows.length,
    [normalizedRows],
  )
  const hasChanges = useMemo(
    () => !areEqualRequestedProducts(initialRequestedProducts, normalizedRows),
    [initialRequestedProducts, normalizedRows],
  )
  const canAddMoreRows =
    hasValidSettings && Boolean(maxProductsInOrder) && selectedRows.length < maxProductsInOrder
  const canAddSelectedVariantsCount = useMemo(() => {
    if (!selectedParentProduct) return 0
    const rowsLeft = (maxProductsInOrder ?? 0) - selectedRows.length
    if (rowsLeft <= 0) return 0

    const selectedIdsSet = new Set(selectedVariantIds)
    const existingIdsSet = new Set(
      selectedRows
        .filter((row) => row.productId === selectedParentProduct._id)
        .map((row) => row.variantId),
    )

    let count = 0
    for (const variant of variantOptions) {
      if (!variant._id) continue
      if (!selectedIdsSet.has(variant._id)) continue
      if (existingIdsSet.has(variant._id)) continue
      count += 1
      if (count >= rowsLeft) break
    }
    return count
  }, [maxProductsInOrder, selectedParentProduct, selectedRows, selectedVariantIds, variantOptions])
  const canAddSelectedVariant =
    Boolean(selectedParentProduct) &&
    selectedVariantIds.length > 0 &&
    canAddSelectedVariantsCount > 0 &&
    canAddMoreRows &&
    !isSubmitting
  const canRequestPricingPreview =
    hasValidSettings && normalizedRows.length > 0 && !hasDuplicateRows

  useEffect(() => {
    if (!canRequestPricingPreview) return

    const timeoutId = window.setTimeout(() => {
      const requestId = pricingRequestIdRef.current + 1
      pricingRequestIdRef.current = requestId
      setIsPricingPreviewLoading(true)

      const pricingContext = toOrderPricingContext(currentDelivery, pickupLocationsMap)
      if (currentDelivery?.condition === 'Pickup' && !pricingContext) {
        setPricingPreviewTotal(null)
        setPricingPreviewProductsSubtotal(null)
        setPricingPreviewDeliveryPrice(null)
        setIsPricingPreviewUnavailable(true)
        setIsPricingPreviewLoading(false)
        return
      }

      void calculatePricingAsync({
        payload: {
          products: normalizedRows,
          ...(pricingContext ?? {}),
        },
        requestConfig: { skipErrorToast: true },
      })
        .then((pricing) => {
          if (pricingRequestIdRef.current !== requestId) return
          setPricingPreviewTotal(pricing.totalPrice)
          setPricingPreviewProductsSubtotal(pricing.products.subtotal)
          setPricingPreviewDeliveryPrice(pricing.delivery.price)
          setIsPricingPreviewUnavailable(false)
        })
        .catch(() => {
          if (pricingRequestIdRef.current !== requestId) return
          setPricingPreviewTotal(null)
          setPricingPreviewProductsSubtotal(null)
          setPricingPreviewDeliveryPrice(null)
          setIsPricingPreviewUnavailable(true)
        })
        .finally(() => {
          if (pricingRequestIdRef.current !== requestId) return
          setIsPricingPreviewLoading(false)
        })
    }, ORDER_DETAILS_SEARCH_DEBOUNCE_MS)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [
    calculatePricingAsync,
    canRequestPricingPreview,
    currentDelivery,
    normalizedRows,
    pickupLocationsMap,
  ])

  const selectedProductsSubtotal = useMemo(
    () => selectedRows.reduce((sum, row) => sum + row.unitPrice * row.quantity, 0),
    [selectedRows],
  )
  const selectedProductsQuantity = useMemo(
    () => selectedRows.reduce((sum, row) => sum + row.quantity, 0),
    [selectedRows],
  )
  const summarySubtotal = canRequestPricingPreview
    ? (pricingPreviewProductsSubtotal ?? selectedProductsSubtotal)
    : selectedProductsSubtotal
  const summaryDelivery = canRequestPricingPreview
    ? (pricingPreviewDeliveryPrice ?? currentDelivery?.price ?? 0)
    : (currentDelivery?.price ?? 0)
  const summaryTotal = canRequestPricingPreview
    ? (pricingPreviewTotal ?? summarySubtotal + summaryDelivery)
    : summarySubtotal + summaryDelivery

  const saveDisabledReason = isSubmitting
    ? null
    : isSettingsPending
      ? ordersUiText.dialogs.details.editProductsSettingsLoading
      : !hasValidSettings
        ? ordersUiText.errors.settingsNotFound
        : normalizedRows.length === 0
          ? ordersUiText.dialogs.details.editProductsDisabledReasonEmptyRows
          : hasDuplicateRows
            ? ordersUiText.dialogs.details.editProductsDisabledReasonDuplicates
            : !hasChanges
              ? ordersUiText.dialogs.details.editProductsDisabledReasonNoChanges
              : null
  const isSaveDisabled =
    isSubmitting ||
    isSettingsPending ||
    !hasValidSettings ||
    normalizedRows.length === 0 ||
    hasDuplicateRows ||
    !hasChanges

  const handleParentProductSelect = (product: ProductSummary) => {
    setSelectedParentProduct(product)
    setSelectedVariantIds([])
  }

  const handleAddSelectedVariant = () => {
    if (!selectedParentProduct || !parentProductDetailsQuery.data || !canAddMoreRows) return
    const selectedIdsSet = new Set(selectedVariantIds)
    if (!selectedIdsSet.size) return

    const existingIdsSet = new Set(
      selectedRows
        .filter((row) => row.productId === selectedParentProduct._id)
        .map((row) => row.variantId),
    )
    const rowsLeft = (maxProductsInOrder ?? 0) - selectedRows.length
    if (rowsLeft <= 0) return

    const variantsToAdd = variantOptions
      .filter(
        (variant) =>
          typeof variant._id === 'string' &&
          selectedIdsSet.has(variant._id) &&
          !existingIdsSet.has(variant._id),
      )
      .slice(0, rowsLeft)

    if (!variantsToAdd.length) return

    setSelectedRows((current) => [
      ...current,
      ...variantsToAdd.map((variant) => {
        const rowId = nextRowIdRef.current
        nextRowIdRef.current += 1
        return {
          rowId,
          productId: selectedParentProduct._id,
          productName: selectedParentProduct.name,
          variantId: variant._id as string,
          variantLabel: buildVariantLabel(variant, parentProductDetailsQuery.data),
          unitPrice: variant.price,
          quantity: 1,
        }
      }),
    ])
    setSelectedVariantIds([])
  }

  const handleRemoveRow = (rowId: number) => {
    if (isSubmitting) return
    setSelectedRows((current) => current.filter((row) => row.rowId !== rowId))
  }

  const handleQuantityChange = (rowId: number, quantity: number) => {
    if (!hasValidSettings || !maxProductQuantityInOrder) return
    setSelectedRows((current) =>
      current.map((row) =>
        row.rowId === rowId
          ? { ...row, quantity: clampQuantity(quantity, maxProductQuantityInOrder) }
          : row,
      ),
    )
  }

  const handleSave = async () => {
    if (isSaveDisabled) return
    await onSave({ products: normalizedRows })
  }

  return (
    <Box
      sx={{
        p: { xs: 1.5, md: 2 },
        borderTop: 1,
        borderColor: 'divider',
        backgroundColor: 'background.default',
      }}
      data-testid="order-details-products-inline-edit-mode"
    >
      <Stack spacing={1.5}>
        <Stack direction="row" spacing={1} justifyContent="flex-end">
          <Button
            variant="contained"
            onClick={() => void handleSave()}
            disabled={isSaveDisabled}
            data-testid="order-details-products-inline-save-button"
          >
            {isSubmitting ? (
              <CircularProgress size={18} color="inherit" />
            ) : (
              ordersUiText.dialogs.details.editProductsSave
            )}
          </Button>
          <Button
            variant="outlined"
            onClick={onCancel}
            disabled={isSubmitting}
            data-testid="order-details-products-inline-cancel-button"
          >
            {ordersUiText.dialogs.cancel}
          </Button>
        </Stack>

        {isSettingsPending ? (
          <Alert severity="info" data-testid="order-details-products-inline-settings-loading-alert">
            <Stack direction="row" spacing={1} alignItems="center">
              <CircularProgress size={16} />
              <Typography variant="body2">
                {ordersUiText.dialogs.details.editProductsSettingsLoading}
              </Typography>
            </Stack>
          </Alert>
        ) : null}

        {isSettingsUnavailable ? (
          <Alert
            severity="warning"
            action={
              <Button
                size="small"
                onClick={() => {
                  void refetchSettings()
                }}
                data-testid="order-details-products-inline-settings-retry-button"
              >
                {ordersUiText.dialogs.details.editProductsRetry}
              </Button>
            }
            data-testid="order-details-products-inline-settings-error-alert"
          >
            {ordersUiText.errors.settingsNotFound}
          </Alert>
        ) : null}

        <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' } }}>
          <Paper variant="outlined" sx={{ p: 1.25, borderColor: 'divider' }}>
            <Stack spacing={1} data-testid="order-details-products-inline-parent-products-section">
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                {ordersUiText.createPage.sections.parentProducts}
              </Typography>
              <TextField
                value={parentProductSearch}
                onChange={(event) => setParentProductSearch(event.target.value)}
                placeholder={ordersUiText.createPage.placeholders.productSearch}
                disabled={isSubmitting || !hasValidSettings}
                data-testid="order-details-products-inline-parent-search-input"
                inputProps={{
                  'data-testid': 'order-details-products-inline-parent-search-input-field',
                }}
              />
              <Stack
                spacing={0.75}
                sx={{ maxHeight: 280, overflowY: 'auto' }}
                data-testid="order-details-products-inline-parent-products-list"
              >
                {parentProductsQuery.isFetching ? (
                  <Stack
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    data-testid="order-details-products-inline-parent-products-loading"
                  >
                    <CircularProgress size={14} />
                    <Typography variant="body2" color="text.secondary">
                      {ordersUiText.dialogs.details.editProductsLoading}
                    </Typography>
                  </Stack>
                ) : null}
                {!parentProductsQuery.isFetching &&
                parentProductsWithActiveVariants.length === 0 ? (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    data-testid="order-details-products-inline-parent-products-empty"
                  >
                    {ordersUiText.createPage.placeholders.noParentProducts}
                  </Typography>
                ) : null}
                {parentProductsWithActiveVariants.map((product, index) => {
                  const isSelected = selectedParentProduct?._id === product._id
                  return (
                    <Paper
                      key={product._id}
                      variant="outlined"
                      onClick={() => handleParentProductSelect(product)}
                      sx={{
                        p: 1,
                        borderColor: isSelected ? 'primary.main' : 'divider',
                        cursor: isSubmitting ? 'default' : 'pointer',
                        '&:hover': { borderColor: isSelected ? 'primary.main' : 'text.primary' },
                      }}
                      data-testid={`order-details-products-inline-parent-product-item-${index}`}
                    >
                      <Stack spacing={0.25}>
                        <Typography variant="subtitle2">{product.name}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {product.manufacturer} | {product.category}
                        </Typography>
                      </Stack>
                    </Paper>
                  )
                })}
              </Stack>
            </Stack>
          </Paper>

          <Paper variant="outlined" sx={{ p: 1.25, borderColor: 'divider' }}>
            <Stack spacing={1} data-testid="order-details-products-inline-variants-section">
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                {ordersUiText.createPage.sections.variants}
              </Typography>
              {!selectedParentProduct ? (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  data-testid="order-details-products-inline-variants-no-parent-selected"
                >
                  {ordersUiText.createPage.placeholders.noParentSelected}
                </Typography>
              ) : null}
              {selectedParentProduct && parentProductDetailsQuery.isLoading ? (
                <Stack
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  data-testid="order-details-products-inline-variants-loading"
                >
                  <CircularProgress size={14} />
                  <Typography variant="body2" color="text.secondary">
                    {ordersUiText.dialogs.details.editProductsLoading}
                  </Typography>
                </Stack>
              ) : null}
              {selectedParentProduct &&
              !parentProductDetailsQuery.isLoading &&
              variantOptions.length === 0 ? (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  data-testid="order-details-products-inline-variants-empty"
                >
                  {ordersUiText.createPage.placeholders.noVariants}
                </Typography>
              ) : null}
              <Stack
                spacing={0.75}
                sx={{ maxHeight: 280, overflowY: 'auto' }}
                data-testid="order-details-products-inline-variants-list"
              >
                {variantOptions.map((variant, index) => {
                  const product = parentProductDetailsQuery.data
                  const variantId = variant._id
                  if (!variantId || !product) return null
                  const isSelected = selectedVariantIds.includes(variantId)
                  const isAlreadyAdded = selectedRows.some(
                    (row) => row.productId === product._id && row.variantId === variantId,
                  )
                  return (
                    <Paper
                      key={variantId}
                      variant="outlined"
                      onClick={() =>
                        setSelectedVariantIds((current) =>
                          current.includes(variantId)
                            ? current.filter((id) => id !== variantId)
                            : [...current, variantId],
                        )
                      }
                      sx={{
                        p: 1,
                        borderColor: isSelected
                          ? 'primary.main'
                          : isAlreadyAdded
                            ? 'success.main'
                            : 'divider',
                        cursor: isSubmitting ? 'default' : 'pointer',
                        '&:hover': {
                          borderColor: isSelected
                            ? 'primary.main'
                            : isAlreadyAdded
                              ? 'success.main'
                              : 'text.primary',
                        },
                      }}
                      data-testid={`order-details-products-inline-variant-item-${index}`}
                    >
                      <Stack spacing={0.25}>
                        <Typography variant="subtitle2">
                          {buildVariantLabel(variant, product)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {formatPrice(variant.price)}
                        </Typography>
                      </Stack>
                    </Paper>
                  )
                })}
              </Stack>
            </Stack>
          </Paper>
        </Box>

        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          flexWrap="wrap"
          gap={1}
        >
          <Button
            variant="outlined"
            startIcon={<AddRoundedIcon />}
            onClick={handleAddSelectedVariant}
            disabled={!canAddSelectedVariant}
            data-testid="order-details-products-inline-add-selected-variants-button"
          >
            {ordersUiText.createPage.actions.addVariant}
          </Button>
          <Typography
            variant="body2"
            color={saveDisabledReason ? 'warning.main' : 'text.secondary'}
            data-testid="order-details-products-inline-save-disabled-reason"
          >
            {saveDisabledReason ?? ' '}
          </Typography>
        </Stack>

        <Paper variant="outlined" sx={{ p: 1.25, borderColor: 'divider' }}>
          <Stack spacing={1} data-testid="order-details-products-inline-selected-products-section">
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              {ordersUiText.createPage.sections.selectedProducts}
            </Typography>
            {!selectedRows.length ? (
              <Typography
                variant="body2"
                color="text.secondary"
                data-testid="order-details-products-inline-selected-products-empty"
              >
                {ordersUiText.createPage.placeholders.noSelectedProducts}
              </Typography>
            ) : null}
            <Stack spacing={0.75}>
              {selectedRows.map((row, index) => (
                <Paper
                  key={row.rowId}
                  variant="outlined"
                  sx={{ p: 1, borderColor: 'divider' }}
                  data-testid={`order-details-products-inline-selected-row-${index}`}
                >
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography
                        sx={{ whiteSpace: 'normal', wordBreak: 'break-word' }}
                        data-testid={`order-details-products-inline-selected-row-${index}-summary`}
                      >
                        {row.productName} | {row.variantLabel}
                      </Typography>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        data-testid={`order-details-products-inline-selected-row-${index}-price`}
                      >
                        {formatPrice(row.unitPrice)}
                      </Typography>
                    </Box>
                    <OrderProductQuantityControl
                      value={row.quantity}
                      min={1}
                      max={maxProductQuantityInOrder ?? 1}
                      disabled={!hasValidSettings || isSubmitting}
                      onChange={(nextValue) => handleQuantityChange(row.rowId, nextValue)}
                      testIdPrefix={`order-details-products-inline-selected-row-${index}`}
                    />
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleRemoveRow(row.rowId)}
                      disabled={isSubmitting}
                      data-testid={`order-details-products-inline-selected-row-${index}-delete-button`}
                    >
                      <DeleteOutlineOutlinedIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          </Stack>
        </Paper>

        <Paper
          variant="outlined"
          sx={{ p: 1.25, borderColor: 'divider' }}
          data-testid="order-details-products-inline-summary-section"
        >
          <Stack spacing={1}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              {ordersUiText.createPage.sections.summary}
            </Typography>
            <Stack direction="row" justifyContent="space-between" gap={1}>
              <Typography color="text.secondary">
                {ordersUiText.createPage.labels.productsCount}
              </Typography>
              <Typography data-testid="order-details-products-inline-summary-products-value">
                {selectedProductsQuantity}
              </Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between" gap={1}>
              <Typography color="text.secondary">
                {ordersUiText.createPage.labels.productsSubtotal}
              </Typography>
              <Typography data-testid="order-details-products-inline-summary-subtotal-value">
                {isPricingPreviewLoading ? (
                  <CircularProgress size={14} />
                ) : (
                  formatPrice(summarySubtotal)
                )}
              </Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between" gap={1}>
              <Typography color="text.secondary">
                {ordersUiText.createPage.labels.deliveryPrice}
              </Typography>
              <Typography data-testid="order-details-products-inline-summary-delivery-value">
                {isPricingPreviewLoading ? (
                  <CircularProgress size={14} />
                ) : (
                  formatPrice(summaryDelivery)
                )}
              </Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between" gap={1}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                {ordersUiText.createPage.labels.totalPrice}
              </Typography>
              <Typography
                variant="subtitle2"
                sx={{ fontWeight: 700 }}
                data-testid="order-details-products-inline-summary-total-value"
              >
                {isPricingPreviewLoading ? (
                  <CircularProgress size={14} />
                ) : (
                  formatPrice(summaryTotal)
                )}
              </Typography>
            </Stack>
            {canRequestPricingPreview && isPricingPreviewUnavailable ? (
              <Alert
                severity="warning"
                data-testid="order-details-products-inline-summary-pricing-warning"
              >
                {ordersUiText.errors.pricingPreviewUnavailable}
              </Alert>
            ) : null}
          </Stack>
        </Paper>
      </Stack>
    </Box>
  )
}

export function OrderDetailsProductsSection({
  order,
  displayRows,
  currentDelivery,
  isProductsEditable,
  isProductsEditMode,
  isProductsEditSavePending,
  isReceiveStartVisible,
  isReceiveModeVisible,
  isReceiveSavePending,
  isReceiveSaveEnabled,
  hasPendingProductsToReceive,
  isSelectAllChecked,
  isSelectAllIndeterminate,
  selectedReceivePendingRowIndices,
  isEmbedded = false,
  onStartProductsEdit,
  onCancelProductsEdit,
  onSaveProductsEdit,
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
              {isProductsEditable && !isProductsEditMode ? (
                <IconButton
                  size="small"
                  onClick={onStartProductsEdit}
                  data-testid="order-details-products-edit-trigger"
                  aria-label="edit products"
                >
                  <EditOutlinedIcon fontSize="small" />
                </IconButton>
              ) : null}
            </Box>
          </Stack>

          {!isProductsEditMode && isReceiveStartVisible ? (
            <Button
              variant="contained"
              onClick={onStartReceiveMode}
              disabled={isReceiveSavePending}
              data-testid="order-details-products-receive-start-button"
            >
              {ordersUiText.detailsPage.actions.receive}
            </Button>
          ) : null}

          {!isProductsEditMode && isReceiveModeVisible ? (
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
          <Stack direction="row" spacing={0.5} justifyContent="flex-start" alignItems="center">
            {!isProductsEditMode && isReceiveModeVisible ? (
              <Checkbox
                size="small"
                checked={isSelectAllChecked}
                indeterminate={isSelectAllIndeterminate}
                disabled={!hasPendingProductsToReceive || isReceiveSavePending}
                onChange={onToggleSelectAllReceive}
                data-testid="order-details-products-receive-select-all-checkbox"
              />
            ) : null}
            <Typography color="text.secondary">Status</Typography>
          </Stack>
        </Box>

        {!isProductsEditMode && order.products.length
          ? order.products.map((product, index) => {
              const displayRow = displayRows[index]
              return (
                <Box
                  key={`${product.productId}-${product.variantId}-${index}`}
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
                      alt={displayRow?.displayName ?? product.name}
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
                        {displayRow?.displayName ?? product.name}
                      </Typography>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ overflowWrap: 'anywhere' }}
                        data-testid={`order-details-products-row-${index}-manufacturer`}
                      >
                        {displayRow?.manufacturer ?? product.manufacturer ?? '-'}
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

                  <Typography
                    sx={{ display: { xs: 'none', md: 'block' } }}
                    data-testid={`order-details-products-row-${index}-amount`}
                  >
                    {product.quantity}
                  </Typography>
                  <Typography
                    sx={{ display: { xs: 'none', md: 'block' } }}
                    data-testid={`order-details-products-row-${index}-price`}
                  >
                    {formatPrice(product.unitPrice)}
                  </Typography>

                  <Stack
                    direction="row"
                    spacing={0.5}
                    alignItems="center"
                    justifyContent="flex-start"
                  >
                    {isReceiveModeVisible ? (
                      <Checkbox
                        size="small"
                        checked={
                          product.received || selectedReceivePendingRowIndices.includes(index)
                        }
                        disabled={product.received || isReceiveSavePending}
                        onChange={() => onToggleReceiveProduct(index)}
                        data-testid={`order-details-products-row-${index}-receive-checkbox`}
                      />
                    ) : null}
                    <Chip
                      label={product.received ? 'Received' : 'Not Received'}
                      color={product.received ? 'success' : 'default'}
                      variant="outlined"
                      sx={{
                        display: { xs: 'none', md: 'inline-flex' },
                        '& .MuiChip-label': { fontSize: '0.95rem' },
                      }}
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
          : null}

        {!isProductsEditMode && !order.products.length ? (
          <Box sx={{ p: 2.5 }}>
            <Typography color="text.secondary" data-testid="order-details-products-empty">
              -
            </Typography>
          </Box>
        ) : null}
      </Box>

      {isProductsEditMode ? (
        <InlineProductsEditor
          orderProducts={order.products}
          currentDelivery={currentDelivery}
          isSubmitting={isProductsEditSavePending}
          onCancel={onCancelProductsEdit}
          onSave={onSaveProductsEdit}
        />
      ) : null}
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
