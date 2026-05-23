import AddRoundedIcon from '@mui/icons-material/AddRounded'
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded'
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined'
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded'
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useSnackbar } from 'notistack'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { Customer } from '@/api/modules/customers.api'
import type { Product, ProductVariant } from '@/api/modules/products.api'
import type { OrderDeliveryPricingTier, OrderPricingPayload } from '@/api/modules/orders.api'
import { ORDER_DETAILS_SEARCH_DEBOUNCE_MS } from '@/features/orders/config/orderDetails.config'
import { OrderProductQuantityControl } from '@/features/orders/components/OrderProductQuantityControl'
import {
  isInventoryVariantOrderable,
  useOrderInventoryValidation,
  type OrderInventoryValidationWarningCode,
} from '@/features/orders/hooks/useOrderInventoryValidation'
import {
  useCreateOrderMutation,
  useOrderCustomerOptionsQuery,
  useOrderPricingMutation,
  useOrderProductDetailsQuery,
  useOrderProductsDetailsQueries,
  useOrderProductOptionsQuery,
} from '@/features/orders/hooks/useOrdersQuery'
import { useUnsavedChangesGuard } from '@/features/orders/hooks/useUnsavedChangesGuard'
import { ordersUiText } from '@/features/orders/orders.ui-text'
import { buildVariantDisplayName } from '@/features/products/utils/buildVariantDisplayName'
import { useSettingsQuery } from '@/features/settings/hooks/useSettingsQuery'
import { formatDate } from '@/utils/date'
import { formatPrice } from '@/utils/number'

type CustomerSummary = {
  _id: string
  name: string
  email: string
  state: string
  city: string
  street: string
  house: number
  apartment?: number
  zipCode: string
}

type ProductSummary = {
  _id: string
  name: string
  manufacturer: string
  categoryPath: string
  variantsCount: number
}

type SelectedVariantRow = {
  rowId: number
  productId: string
  variantId: string
  variantLabel: string
  unitPrice: number
  quantity: number
}

function toCustomerSummary(customer: Customer): CustomerSummary {
  return {
    _id: customer._id,
    name: customer.name,
    email: customer.email,
    state: customer.state,
    city: customer.city,
    street: customer.street,
    house: customer.house,
    apartment: customer.apartment,
    zipCode: customer.zipCode,
  }
}

function toProductSummary(product: Product): ProductSummary {
  return {
    _id: product._id,
    name: product.name,
    manufacturer: product.manufacturer,
    categoryPath: product.categoryPath,
    variantsCount: typeof product.variantsCount === 'number' ? product.variantsCount : 0,
  }
}

function formatCustomerOption(customer: CustomerSummary) {
  return `${customer.name} | ${customer.email}`
}

function clampQuantity(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function isVariantActive(variant: ProductVariant) {
  return variant.status === 'Active'
}

function buildVariantLabel(variant: ProductVariant, product: Product) {
  return buildVariantDisplayName(product, variant) || variant._id || 'Variant'
}

function resolveCustomerAddressPrimaryLine(customer: CustomerSummary) {
  const apartmentPart = typeof customer.apartment === 'number' ? `, Apt ${customer.apartment}` : ''
  return `${customer.house} ${customer.street}${apartmentPart}`
}

function resolveCustomerAddressSecondaryLine(customer: CustomerSummary) {
  return `${customer.city}, ${customer.state} ${customer.zipCode}`
}

function resolvePricingTierLabel(value: OrderDeliveryPricingTier | null) {
  switch (value) {
    case 'local_city':
      return 'Local City'
    case 'same_state':
      return 'Same State'
    case 'out_of_state':
      return 'Out Of State'
    case 'pickup':
      return 'Pickup'
    default:
      return '-'
  }
}

function resolveDirectOrderLabel(isAllowed: boolean | null) {
  if (isAllowed === null) return '-'
  return isAllowed ? 'Allowed' : 'Blocked'
}

function resolveInventoryWarningMessage(code: OrderInventoryValidationWarningCode | null) {
  switch (code) {
    case 'variant_unavailable_create':
      return ordersUiText.validation.inventoryVariantUnavailable
    case 'out_of_stock_blocked':
      return ordersUiText.validation.inventoryOutOfStockBlocked
    case 'quantity_exceeds_available':
      return ordersUiText.validation.inventoryQuantityExceedsAvailable
    case 'missing_inventory_snapshot':
      return ordersUiText.validation.inventoryMissingSnapshot
    case 'missing_catalog_snapshot':
      return ordersUiText.validation.catalogMissingSnapshot
    case 'inactive_snapshot':
      return ordersUiText.validation.inactiveSnapshot
    default:
      return null
  }
}

function useAnimatedAmount(target: number, durationMs = 360) {
  const [animatedValue, setAnimatedValue] = useState(target)
  const frameRef = useRef<number | null>(null)
  const startTimeRef = useRef<number | null>(null)
  const startValueRef = useRef(target)
  const lastValueRef = useRef(target)

  useEffect(() => {
    if (Math.abs(target - lastValueRef.current) < 0.005) {
      return
    }

    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current)
    }

    startTimeRef.current = null
    startValueRef.current = lastValueRef.current

    const tick = (now: number) => {
      if (startTimeRef.current === null) {
        startTimeRef.current = now
      }

      const elapsed = now - startTimeRef.current
      const progress = Math.min(elapsed / durationMs, 1)
      const easedProgress = 1 - Math.pow(1 - progress, 3)
      const nextValue = startValueRef.current + (target - startValueRef.current) * easedProgress

      lastValueRef.current = nextValue
      setAnimatedValue(nextValue)

      if (progress < 1) {
        frameRef.current = window.requestAnimationFrame(tick)
        return
      }

      frameRef.current = null
      lastValueRef.current = target
      setAnimatedValue(target)
    }

    frameRef.current = window.requestAnimationFrame(tick)

    return () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current)
        frameRef.current = null
      }
    }
  }, [durationMs, target])

  return animatedValue
}

export function OrderCreatePage() {
  const navigate = useNavigate()
  const { enqueueSnackbar } = useSnackbar()
  const createMutation = useCreateOrderMutation()
  const { mutateAsync: calculatePricingAsync } = useOrderPricingMutation()
  const {
    data: settings,
    isLoading: isSettingsLoading,
    isFetching: isSettingsFetching,
    refetch: refetchSettings,
  } = useSettingsQuery(true)

  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSummary | null>(null)
  const [isCustomerPickerOpen, setIsCustomerPickerOpen] = useState(false)
  const [customerSearch, setCustomerSearch] = useState('')
  const [debouncedCustomerSearch, setDebouncedCustomerSearch] = useState('')
  const [parentProductSearch, setParentProductSearch] = useState('')
  const [debouncedParentProductSearch, setDebouncedParentProductSearch] = useState('')
  const [selectedParentProduct, setSelectedParentProduct] = useState<ProductSummary | null>(null)
  const [selectedVariantIds, setSelectedVariantIds] = useState<string[]>([])
  const [selectedRows, setSelectedRows] = useState<SelectedVariantRow[]>([])
  const [, setIsPricingPreviewLoading] = useState(false)
  const [isPricingPreviewUnavailable, setIsPricingPreviewUnavailable] = useState(false)
  const [pricingTotal, setPricingTotal] = useState<number | null>(null)
  const [pricingProductsSubtotal, setPricingProductsSubtotal] = useState<number | null>(null)
  const [pricingDeliveryPrice, setPricingDeliveryPrice] = useState<number | null>(null)
  const [pricingDeliveryTier, setPricingDeliveryTier] = useState<OrderDeliveryPricingTier | null>(
    null,
  )
  const [pricingEstimatedDate, setPricingEstimatedDate] = useState<string | null>(null)
  const nextRowIdRef = useRef(1)
  const pricingRequestIdRef = useRef(0)

  const maxProductsInOrder = settings?.order.maxProductsInOrder
  const maxProductQuantityInOrder = settings?.order.maxProductQuantityInOrder
  const hasValidSettings =
    typeof maxProductsInOrder === 'number' &&
    maxProductsInOrder >= 1 &&
    typeof maxProductQuantityInOrder === 'number' &&
    maxProductQuantityInOrder >= 1
  const isSettingsPending = isSettingsLoading || (!settings && isSettingsFetching)
  const isSettingsUnavailable = !isSettingsPending && !hasValidSettings

  useUnsavedChangesGuard({
    when: !createMutation.isPending && (Boolean(selectedCustomer) || selectedRows.length > 0),
    message: ordersUiText.dialogs.createPageLeaveMessage,
  })

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedCustomerSearch(customerSearch.trim())
    }, ORDER_DETAILS_SEARCH_DEBOUNCE_MS)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [customerSearch])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedParentProductSearch(parentProductSearch.trim())
    }, ORDER_DETAILS_SEARCH_DEBOUNCE_MS)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [parentProductSearch])

  const customerOptionsQuery = useOrderCustomerOptionsQuery(
    debouncedCustomerSearch,
    isCustomerPickerOpen,
  )
  const customerOptions = useMemo(
    () => (customerOptionsQuery.data?.Customers ?? []).map(toCustomerSummary),
    [customerOptionsQuery.data?.Customers],
  )

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
      if (!productId) return
      if (!query.data) return

      hasActiveVariantById.set(productId, query.data.variants.some(isVariantActive))
    })

    return parentProductOptions.filter((product) => hasActiveVariantById.get(product._id) !== false)
  }, [parentProductDetailsQueries, parentProductOptionIds, parentProductOptions])

  const parentProductDetailsQuery = useOrderProductDetailsQuery(
    selectedParentProduct?._id ?? '',
    Boolean(selectedParentProduct),
  )
  const {
    isReferenceDataLoading,
    inventoryById,
    productById,
    validatedRows,
  } = useOrderInventoryValidation({
    rows: selectedRows.map((row) => ({
      rowId: row.rowId,
      productId: row.productId,
      variantId: row.variantId,
      quantity: row.quantity,
    })),
    mode: 'create',
    maxProductQuantityInOrder: maxProductQuantityInOrder ?? null,
    enabled: hasValidSettings,
    includeProductIds: selectedParentProduct?._id ? [selectedParentProduct._id] : [],
  })
  const selectedRowsValidationById = useMemo(
    () => new Map(validatedRows.map((row) => [row.rowId, row])),
    [validatedRows],
  )
  const selectedParentInventory = useMemo(
    () => (selectedParentProduct ? (inventoryById.get(selectedParentProduct._id) ?? null) : null),
    [inventoryById, selectedParentProduct],
  )
  const selectedParentProductData = useMemo(
    () =>
      selectedParentProduct
        ? (productById.get(selectedParentProduct._id) ?? parentProductDetailsQuery.data ?? null)
        : null,
    [parentProductDetailsQuery.data, productById, selectedParentProduct],
  )
  const variantOptions = useMemo(() => {
    const product = parentProductDetailsQuery.data
    if (!product) return []
    return product.variants.filter(isVariantActive)
  }, [parentProductDetailsQuery.data])
  const orderableVariantOptions = useMemo(() => {
    if (!selectedParentProductData || !selectedParentInventory) return []
    return variantOptions.filter((variant) => {
      if (!variant._id) return false
      return isInventoryVariantOrderable({
        product: selectedParentProductData,
        inventory: selectedParentInventory,
        variantId: variant._id,
      })
    })
  }, [selectedParentInventory, selectedParentProductData, variantOptions])
  const orderableVariantIdsSet = useMemo(
    () => new Set(orderableVariantOptions.map((variant) => variant._id).filter(Boolean) as string[]),
    [orderableVariantOptions],
  )
  const selectedOrderableVariantIds = useMemo(
    () => selectedVariantIds.filter((variantId) => orderableVariantIdsSet.has(variantId)),
    [orderableVariantIdsSet, selectedVariantIds],
  )
  const normalizedRows = useMemo(() => {
    if (!hasValidSettings) return []
    return selectedRows.map((row) => ({
      productId: row.productId,
      variantId: row.variantId,
      quantity: row.quantity,
    }))
  }, [hasValidSettings, selectedRows])
  const hasInventoryValidationErrors = validatedRows.some((row) => row.isSubmitBlocked)

  const canRequestPricingPreview =
    hasValidSettings &&
    normalizedRows.length > 0 &&
    !hasInventoryValidationErrors &&
    !isReferenceDataLoading

  useEffect(() => {
    if (!canRequestPricingPreview) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      const requestId = pricingRequestIdRef.current + 1
      pricingRequestIdRef.current = requestId
      setIsPricingPreviewLoading(true)

      const payload: OrderPricingPayload = selectedCustomer
        ? {
            products: normalizedRows,
            delivery: {
              express: false,
              address: {
                state: selectedCustomer.state,
                city: selectedCustomer.city,
                street: selectedCustomer.street,
                house: selectedCustomer.house,
                ...(typeof selectedCustomer.apartment === 'number'
                  ? { apartment: selectedCustomer.apartment }
                  : {}),
                zipCode: selectedCustomer.zipCode,
              },
            },
          }
        : {
            products: normalizedRows,
          }

      void calculatePricingAsync({
        payload,
        requestConfig: { skipErrorToast: true },
      })
        .then((pricing) => {
          if (pricingRequestIdRef.current !== requestId) return
          setPricingTotal(pricing.totalPrice)
          setPricingProductsSubtotal(pricing.products.subtotal)
          setPricingDeliveryPrice(pricing.delivery.price)
          setPricingDeliveryTier(pricing.delivery.pricingTier)
          setPricingEstimatedDate(pricing.delivery.estimatedDate)
          setIsPricingPreviewUnavailable(false)
        })
        .catch(() => {
          if (pricingRequestIdRef.current !== requestId) return
          setPricingTotal(null)
          setPricingProductsSubtotal(null)
          setPricingDeliveryPrice(null)
          setPricingDeliveryTier(null)
          setPricingEstimatedDate(null)
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
  }, [calculatePricingAsync, canRequestPricingPreview, normalizedRows, selectedCustomer])

  const selectedProductsSubtotal = useMemo(
    () =>
      selectedRows.reduce((sum, row) => {
        return sum + row.unitPrice * row.quantity
      }, 0),
    [selectedRows],
  )
  const selectedProductsQuantity = useMemo(
    () => selectedRows.reduce((sum, row) => sum + row.quantity, 0),
    [selectedRows],
  )
  const isEffectivePricingPreviewUnavailable =
    canRequestPricingPreview && isPricingPreviewUnavailable
  const effectivePricingProductsSubtotal = canRequestPricingPreview ? pricingProductsSubtotal : null
  const effectivePricingDeliveryPrice = canRequestPricingPreview ? pricingDeliveryPrice : null
  const effectivePricingTotal = canRequestPricingPreview ? pricingTotal : null
  const summarySubtotalTarget = effectivePricingProductsSubtotal ?? selectedProductsSubtotal
  const summaryDeliveryTarget = selectedCustomer ? (effectivePricingDeliveryPrice ?? 0) : 0
  const summaryTotalTarget = effectivePricingTotal ?? summarySubtotalTarget + summaryDeliveryTarget
  const deliveryTierValue = canRequestPricingPreview
    ? resolvePricingTierLabel(pricingDeliveryTier)
    : '-'
  const deliveryEstimatedValue = canRequestPricingPreview
    ? pricingEstimatedDate
      ? formatDate(pricingEstimatedDate)
      : '-'
    : '-'
  const animatedSubtotal = useAnimatedAmount(summarySubtotalTarget)
  const animatedDelivery = useAnimatedAmount(summaryDeliveryTarget)
  const animatedTotal = useAnimatedAmount(summaryTotalTarget)

  const hasSelectedRows = selectedRows.length > 0
  const canAddMoreRows =
    hasValidSettings && Boolean(maxProductsInOrder) && selectedRows.length < maxProductsInOrder
  const canAddSelectedVariantsCount = useMemo(() => {
    if (!selectedParentProduct) return 0
    const rowsLeft = (maxProductsInOrder ?? 0) - selectedRows.length
    if (rowsLeft <= 0) return 0

    const selectedIdsSet = new Set(selectedOrderableVariantIds)
    const existingIdsSet = new Set(
      selectedRows
        .filter((row) => row.productId === selectedParentProduct._id)
        .map((row) => row.variantId),
    )

    let count = 0
    for (const variant of orderableVariantOptions) {
      if (!variant._id) continue
      if (!selectedIdsSet.has(variant._id)) continue
      if (existingIdsSet.has(variant._id)) continue
      count += 1
      if (count >= rowsLeft) break
    }

    return count
  }, [
    maxProductsInOrder,
    orderableVariantOptions,
    selectedParentProduct,
    selectedRows,
    selectedOrderableVariantIds,
  ])
  const canAddSelectedVariant =
    Boolean(selectedParentProduct) &&
    selectedOrderableVariantIds.length > 0 &&
    canAddSelectedVariantsCount > 0 &&
    canAddMoreRows &&
    !isReferenceDataLoading &&
    !createMutation.isPending

  const canSubmit =
    !createMutation.isPending &&
    hasValidSettings &&
    Boolean(selectedCustomer) &&
    selectedRows.length > 0 &&
    !hasInventoryValidationErrors &&
    !isReferenceDataLoading

  const handleOpenCustomerPicker = () => {
    if (createMutation.isPending) return
    setIsCustomerPickerOpen(true)
    setCustomerSearch('')
    setDebouncedCustomerSearch('')
  }

  const handleCloseCustomerPicker = () => {
    setIsCustomerPickerOpen(false)
    setCustomerSearch('')
    setDebouncedCustomerSearch('')
  }

  const handleSelectCustomer = (customer: CustomerSummary | null) => {
    if (!customer) return
    setSelectedCustomer(customer)
    handleCloseCustomerPicker()
  }

  const handleParentProductSelect = (product: ProductSummary) => {
    setSelectedParentProduct(product)
    setSelectedVariantIds([])
  }

  const handleAddSelectedVariant = () => {
    if (!selectedParentProduct || !parentProductDetailsQuery.data) return
    if (!canAddMoreRows) return
    const selectedIdsSet = new Set(selectedOrderableVariantIds)
    if (selectedIdsSet.size === 0) return

    const existingIdsSet = new Set(
      selectedRows
        .filter((row) => row.productId === selectedParentProduct._id)
        .map((row) => row.variantId),
    )

    const rowsLeft = (maxProductsInOrder ?? 0) - selectedRows.length
    if (rowsLeft <= 0) return

    const variantsToAdd = orderableVariantOptions
      .filter(
        (variant) =>
          typeof variant._id === 'string' &&
          selectedIdsSet.has(variant._id) &&
          !existingIdsSet.has(variant._id),
      )
      .slice(0, rowsLeft)

    if (variantsToAdd.length === 0) return

    setSelectedRows((current) => {
      const appended = variantsToAdd.map((variant) => {
        const variantId = variant._id as string
        const rowId = nextRowIdRef.current
        nextRowIdRef.current += 1
        return {
          rowId,
          productId: selectedParentProduct._id,
          variantId,
          variantLabel: buildVariantLabel(variant, parentProductDetailsQuery.data),
          unitPrice: variant.price,
          quantity: 1,
        }
      })
      return [...current, ...appended]
    })
    setSelectedVariantIds([])
  }

  const handleRemoveRow = (rowId: number) => {
    if (createMutation.isPending) return
    setSelectedRows((current) => current.filter((row) => row.rowId !== rowId))
  }

  const handleQuantityChange = (rowId: number, quantity: number) => {
    if (!hasValidSettings || !maxProductQuantityInOrder) return
    const rowValidation = selectedRowsValidationById.get(rowId)
    const rowMax = Math.max(rowValidation?.maxQuantity ?? maxProductQuantityInOrder, 1)

    setSelectedRows((current) =>
      current.map((row) =>
        row.rowId === rowId
          ? { ...row, quantity: clampQuantity(quantity, 1, rowMax) }
          : row,
      ),
    )
  }

  const handleCreateOrder = useCallback(async () => {
    if (!canSubmit || !selectedCustomer || !hasValidSettings) return

      const payload = {
        customer: selectedCustomer._id,
        products: selectedRows.map((row) => ({
          quantity: row.quantity,
          productId: row.productId,
          variantId: row.variantId,
        })),
      }

    const createdOrder = await createMutation.mutateAsync(payload)
    enqueueSnackbar(ordersUiText.toasts.created, { variant: 'success' })
    navigate(`/orders/${createdOrder._id}`)
  }, [
    canSubmit,
    createMutation,
    enqueueSnackbar,
    hasValidSettings,
    navigate,
    selectedCustomer,
    selectedRows,
  ])

  return (
    <Stack spacing={2.5} data-testid="orders-create-page">
      <Stack spacing={0.75} data-testid="orders-create-page-header">
        <Button
          component={Link}
          to="/orders"
          variant="text"
          startIcon={<ArrowBackRoundedIcon fontSize="small" />}
          sx={{ alignSelf: 'flex-start', px: 0, textTransform: 'none' }}
          data-testid="orders-create-page-back-link"
        >
          {ordersUiText.createPage.backToOrders}
        </Button>

        <Stack
          direction={{ xs: 'column', md: 'row' }}
          alignItems={{ xs: 'stretch', md: 'center' }}
          justifyContent="space-between"
          gap={1.5}
        >
          <Box>
            <Typography
              variant="h4"
              sx={{ fontWeight: 700 }}
              data-testid="orders-create-page-title"
            >
              {ordersUiText.createPage.title}
            </Typography>
            <Typography color="text.secondary" data-testid="orders-create-page-subtitle">
              {ordersUiText.createPage.subtitle}
            </Typography>
          </Box>

          <Stack direction="row" spacing={1}>
            <Button
              component={Link}
              to="/orders"
              variant="outlined"
              disabled={createMutation.isPending}
              data-testid="orders-create-page-cancel-button"
            >
              {ordersUiText.createPage.actions.cancel}
            </Button>
          </Stack>
        </Stack>
      </Stack>

      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: '1fr', xl: 'minmax(0, 1fr) 320px' },
          alignItems: 'start',
        }}
      >
        <Stack spacing={2}>
          <Paper
            variant="outlined"
            sx={{ borderColor: 'divider', overflow: 'hidden' }}
            data-testid="orders-create-page-main-form-card"
          >
            <Box sx={{ p: { xs: 2, md: 2.5 } }}>
              <Stack spacing={1.25}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  {ordersUiText.createPage.sections.customer}
                </Typography>

                <Autocomplete
                  options={customerOptions}
                  value={selectedCustomer}
                  open={isCustomerPickerOpen}
                  disableClearable
                  forcePopupIcon={false}
                  loading={customerOptionsQuery.isLoading || customerOptionsQuery.isFetching}
                  inputValue={
                    isCustomerPickerOpen
                      ? customerSearch
                      : selectedCustomer
                        ? formatCustomerOption(selectedCustomer)
                        : ''
                  }
                  filterOptions={(options) => options}
                  getOptionLabel={formatCustomerOption}
                  isOptionEqualToValue={(option, value) => option._id === value._id}
                  onOpen={handleOpenCustomerPicker}
                  onClose={(_, reason) => {
                    if (reason === 'selectOption') return
                    handleCloseCustomerPicker()
                  }}
                  onChange={(_, customer) => handleSelectCustomer(customer)}
                  onInputChange={(_, value, reason) => {
                    if (!isCustomerPickerOpen) return
                    if (reason === 'reset') return
                    setCustomerSearch(value)
                  }}
                  noOptionsText={ordersUiText.dialogs.details.editCustomerNoResults}
                  loadingText={ordersUiText.dialogs.details.editCustomerLoading}
                  renderOption={(props, option, state) => {
                    const { key, ...optionProps } = props
                    return (
                      <li
                        key={key}
                        {...optionProps}
                        data-testid={`orders-create-page-customer-item-${state.index}`}
                      >
                        <Stack spacing={0.25}>
                          <Typography
                            sx={{ whiteSpace: 'normal', wordBreak: 'break-word' }}
                            data-testid={`orders-create-page-customer-item-${state.index}-name`}
                          >
                            {option.name}
                          </Typography>
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ whiteSpace: 'normal', wordBreak: 'break-word' }}
                            data-testid={`orders-create-page-customer-item-${state.index}-email`}
                          >
                            {option.email}
                          </Typography>
                        </Stack>
                      </li>
                    )
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label={ordersUiText.createPage.labels.customer}
                      placeholder={ordersUiText.createPage.placeholders.customerSearch}
                      disabled={createMutation.isPending}
                      data-testid="orders-create-page-customer-search-input"
                      inputProps={{
                        ...params.inputProps,
                        'data-testid': 'orders-create-page-customer-search-input-field',
                        readOnly: !isCustomerPickerOpen,
                      }}
                    />
                  )}
                />
              </Stack>
            </Box>

            <Box
              sx={{
                p: { xs: 2, md: 2.5 },
                borderTop: 1,
                borderColor: 'divider',
              }}
            >
              <Stack spacing={1.5}>
                <Stack
                  direction={{ xs: 'column', md: 'row' }}
                  alignItems={{ xs: 'flex-start', md: 'center' }}
                  justifyContent="space-between"
                  gap={1.25}
                >
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    {ordersUiText.createPage.sections.products}
                  </Typography>
                  <Button
                    variant="outlined"
                    startIcon={<AddRoundedIcon />}
                    onClick={handleAddSelectedVariant}
                    disabled={!canAddSelectedVariant}
                    data-testid="orders-create-page-add-variant-button"
                  >
                    {ordersUiText.createPage.actions.addVariant}
                  </Button>
                </Stack>

                {isSettingsPending ? (
                  <Alert severity="info" data-testid="orders-create-page-settings-loading-alert">
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
                        data-testid="orders-create-page-settings-retry-button"
                      >
                        {ordersUiText.dialogs.details.editProductsRetry}
                      </Button>
                    }
                    data-testid="orders-create-page-settings-error-alert"
                  >
                    {ordersUiText.errors.settingsNotFound}
                  </Alert>
                ) : null}

                <Box
                  sx={{
                    display: 'grid',
                    gap: 1.5,
                    gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' },
                  }}
                >
                  <Paper variant="outlined" sx={{ p: 1.25 }}>
                    <Stack spacing={1}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        {ordersUiText.createPage.sections.parentProducts}
                      </Typography>
                      <TextField
                        value={parentProductSearch}
                        onChange={(event) => setParentProductSearch(event.target.value)}
                        placeholder={ordersUiText.createPage.placeholders.productSearch}
                        data-testid="orders-create-page-parent-search-input"
                        inputProps={{
                          'data-testid': 'orders-create-page-parent-search-input-field',
                        }}
                      />
                      <Stack
                        spacing={0.75}
                        sx={{ maxHeight: 320, overflowY: 'auto' }}
                        data-testid="orders-create-page-parent-products-list"
                      >
                        {parentProductsQuery.isFetching ? (
                          <Stack
                            direction="row"
                            spacing={1}
                            alignItems="center"
                            data-testid="orders-create-page-parent-products-loading"
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
                            data-testid="orders-create-page-parent-products-empty"
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
                                cursor: createMutation.isPending ? 'default' : 'pointer',
                                '&:hover': {
                                  borderColor: isSelected ? 'primary.main' : 'text.primary',
                                },
                              }}
                              data-testid={`orders-create-page-parent-product-item-${index}`}
                            >
                              <Stack spacing={0.25}>
                                <Typography variant="subtitle2">{product.name}</Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {product.manufacturer} | {product.categoryPath}
                                </Typography>
                              </Stack>
                            </Paper>
                          )
                        })}
                      </Stack>
                    </Stack>
                  </Paper>

                  <Paper variant="outlined" sx={{ p: 1.25 }}>
                    <Stack spacing={1} data-testid="orders-create-page-variants-section">
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        {ordersUiText.createPage.sections.variants}
                      </Typography>

                      {!selectedParentProduct ? (
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          data-testid="orders-create-page-variants-no-parent-selected"
                        >
                          {ordersUiText.createPage.placeholders.noParentSelected}
                        </Typography>
                      ) : null}

                      {selectedParentProduct &&
                      (parentProductDetailsQuery.isLoading || isReferenceDataLoading) ? (
                        <Stack
                          direction="row"
                          spacing={1}
                          alignItems="center"
                          data-testid="orders-create-page-variants-loading"
                        >
                          <CircularProgress size={14} />
                          <Typography variant="body2" color="text.secondary">
                            {ordersUiText.dialogs.details.editProductsLoading}
                          </Typography>
                        </Stack>
                      ) : null}

                      {selectedParentProduct &&
                      !parentProductDetailsQuery.isLoading &&
                      !isReferenceDataLoading &&
                      orderableVariantOptions.length === 0 ? (
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          data-testid="orders-create-page-variants-empty"
                        >
                          {ordersUiText.createPage.placeholders.noVariants}
                        </Typography>
                      ) : null}

                      <Stack
                        spacing={0.75}
                        sx={{ maxHeight: 320, overflowY: 'auto' }}
                        data-testid="orders-create-page-variants-list"
                      >
                        {orderableVariantOptions.map((variant, index) => {
                          const product = parentProductDetailsQuery.data
                          const variantId = variant._id
                          if (!variantId || !product) return null
                          const inventoryVariant = selectedParentInventory?.variants.find(
                            (candidate) => candidate.variantId === variantId,
                          )
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
                                cursor: createMutation.isPending ? 'default' : 'pointer',
                                '&:hover': {
                                  borderColor: isSelected
                                    ? 'primary.main'
                                    : isAlreadyAdded
                                      ? 'success.main'
                                      : 'text.primary',
                                },
                              }}
                              data-testid={`orders-create-page-variant-item-${index}`}
                            >
                              <Stack spacing={0.25}>
                                <Typography variant="subtitle2">
                                  {buildVariantLabel(variant, product)}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {formatPrice(variant.price)} • {ordersUiText.createPage.labels.available}:{' '}
                                  {inventoryVariant?.available ?? '-'} •{' '}
                                  {ordersUiText.createPage.labels.directOrder}:{' '}
                                  {resolveDirectOrderLabel(
                                    inventoryVariant?.allowSellingOutOfStock ?? null,
                                  )}
                                </Typography>
                              </Stack>
                            </Paper>
                          )
                        })}
                      </Stack>
                    </Stack>
                  </Paper>
                </Box>

                <Paper
                  variant="outlined"
                  sx={{ p: 1.25 }}
                  data-testid="orders-create-page-selected-products-section"
                >
                  <Stack spacing={1}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      {ordersUiText.createPage.sections.selectedProducts}
                    </Typography>

                    {!hasSelectedRows ? (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        data-testid="orders-create-page-selected-products-empty"
                      >
                        {ordersUiText.createPage.placeholders.noSelectedProducts}
                      </Typography>
                    ) : null}

                    <Stack spacing={0.75}>
                      {selectedRows.map((row, index) => {
                        const rowValidation = selectedRowsValidationById.get(row.rowId)
                        const rowMax = Math.max(rowValidation?.maxQuantity ?? maxProductQuantityInOrder ?? 1, 1)
                        const warningMessage = resolveInventoryWarningMessage(
                          rowValidation?.warningCode ?? null,
                        )
                        const hasWarning = Boolean(warningMessage)

                        return (
                          <Paper
                            key={row.rowId}
                            variant="outlined"
                            sx={{ p: 1, borderColor: hasWarning ? 'warning.main' : 'divider' }}
                            data-testid={`orders-create-page-selected-row-${index}`}
                          >
                            <Stack spacing={0.75}>
                              <Stack direction="row" spacing={1} alignItems="center">
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                  <Typography
                                    sx={{ whiteSpace: 'normal', wordBreak: 'break-word' }}
                                    data-testid={`orders-create-page-selected-row-${index}-summary`}
                                  >
                                  {row.variantLabel}
                                  </Typography>
                                  <Typography
                                    variant="body2"
                                    color="text.secondary"
                                    data-testid={`orders-create-page-selected-row-${index}-price`}
                                  >
                                    {formatPrice(row.unitPrice)} •{' '}
                                    {ordersUiText.createPage.labels.availableInStock}:{' '}
                                    {rowValidation?.available ?? '-'} |{' '}
                                    {ordersUiText.createPage.labels.reservedFromStock}:{' '}
                                    {rowValidation?.reservedFromStock ?? '-'} |{' '}
                                    {ordersUiText.createPage.labels.directOrder}:{' '}
                                    {rowValidation?.directOrder ?? '-'}
                                  </Typography>
                                </Box>

                                <OrderProductQuantityControl
                                  value={row.quantity}
                                  min={1}
                                  max={rowMax}
                                  disabled={
                                    !hasValidSettings ||
                                    createMutation.isPending ||
                                    isReferenceDataLoading
                                  }
                                  onChange={(nextValue) => handleQuantityChange(row.rowId, nextValue)}
                                  testIdPrefix={`orders-create-page-selected-row-${index}`}
                                />

                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => handleRemoveRow(row.rowId)}
                                  disabled={createMutation.isPending}
                                  data-testid={`orders-create-page-selected-row-${index}-delete-button`}
                                >
                                  <DeleteOutlineOutlinedIcon fontSize="small" />
                                </IconButton>
                              </Stack>

                              {hasWarning ? (
                                <Stack
                                  direction="row"
                                  spacing={0.75}
                                  alignItems="center"
                                  sx={{ color: 'warning.main' }}
                                  data-testid={`orders-create-page-selected-row-${index}-warning`}
                                >
                                  <WarningAmberRoundedIcon fontSize="small" />
                                  <Typography variant="caption" color="inherit">
                                    {warningMessage}
                                  </Typography>
                                </Stack>
                              ) : null}
                            </Stack>
                          </Paper>
                        )
                      })}
                    </Stack>
                  </Stack>
                </Paper>
              </Stack>
            </Box>

            <Box
              sx={{
                p: { xs: 2, md: 2.5 },
                borderTop: 1,
                borderColor: 'divider',
              }}
            >
              <Stack spacing={1.25}>
                <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap">
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    {ordersUiText.createPage.sections.delivery}
                  </Typography>
                  <Chip
                    label={ordersUiText.createPage.labels.deliveryStatus}
                    color="warning"
                    variant="outlined"
                    data-testid="orders-create-page-delivery-status-chip"
                  />
                </Stack>

                {!selectedCustomer ? (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    data-testid="orders-create-page-delivery-empty-placeholder"
                  >
                    {ordersUiText.createPage.placeholders.noDeliveryAddress}
                  </Typography>
                ) : (
                  <Box
                    sx={{
                      display: 'grid',
                      gap: 1.25,
                      gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) minmax(0, 1fr)' },
                    }}
                  >
                    <Paper variant="outlined" sx={{ p: { xs: 2, md: 2.25 } }}>
                      <Stack spacing={0.75}>
                        <Typography fontWeight={700}>Delivery Address</Typography>
                        <Chip
                          size="small"
                          color="primary"
                          variant="outlined"
                          label={
                            ordersUiText.detailsPage.placeholders.deliveryAddressSourceCustomer
                          }
                          sx={{ alignSelf: 'flex-start' }}
                        />
                        <Typography>
                          {resolveCustomerAddressPrimaryLine(selectedCustomer)}
                        </Typography>
                        <Typography>
                          {resolveCustomerAddressSecondaryLine(selectedCustomer)}
                        </Typography>
                      </Stack>
                    </Paper>

                    <Paper variant="outlined" sx={{ p: { xs: 2, md: 2.25 } }}>
                      <Stack spacing={1}>
                        <Typography fontWeight={700}>Delivery Details</Typography>
                        <Box
                          sx={{
                            display: 'grid',
                            gap: 0.75,
                            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
                          }}
                        >
                          <Stack spacing={0.25}>
                            <Typography variant="caption" color="text.secondary">
                              Tier
                            </Typography>
                            <Typography data-testid="orders-create-page-delivery-tier-value">
                              {deliveryTierValue}
                            </Typography>
                          </Stack>

                          <Stack spacing={0.25}>
                            <Typography variant="caption" color="text.secondary">
                              Estimated
                            </Typography>
                            <Typography data-testid="orders-create-page-delivery-estimated-value">
                              {deliveryEstimatedValue}
                            </Typography>
                          </Stack>
                        </Box>
                      </Stack>
                    </Paper>
                  </Box>
                )}
              </Stack>
            </Box>
          </Paper>
        </Stack>

        <Paper
          sx={{
            p: 2,
            position: { xs: 'static', xl: 'sticky' },
            top: { xl: 88 },
          }}
          data-testid="orders-create-page-summary-card"
        >
          <Stack spacing={1.25}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {ordersUiText.createPage.sections.summary}
            </Typography>

            <Stack spacing={1}>
              <Stack direction="row" justifyContent="space-between" gap={1}>
                <Typography color="text.secondary">
                  {ordersUiText.createPage.labels.customer}
                </Typography>
                <Typography
                  sx={{ textAlign: 'right' }}
                  data-testid="orders-create-page-summary-customer-value"
                >
                  {selectedCustomer ? selectedCustomer.name : '-'}
                </Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between" gap={1}>
                <Typography color="text.secondary">
                  {ordersUiText.createPage.labels.productsCount}
                </Typography>
                <Typography data-testid="orders-create-page-summary-products-value">
                  {selectedProductsQuantity}
                </Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between" gap={1}>
                <Typography color="text.secondary">
                  {ordersUiText.createPage.labels.productsSubtotal}
                </Typography>
                <Typography data-testid="orders-create-page-summary-subtotal-value">
                  {formatPrice(animatedSubtotal)}
                </Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between" gap={1}>
                <Typography color="text.secondary">
                  {ordersUiText.createPage.labels.deliveryPrice}
                </Typography>
                <Typography data-testid="orders-create-page-summary-delivery-value">
                  {formatPrice(animatedDelivery)}
                </Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between" gap={1}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  {ordersUiText.createPage.labels.totalPrice}
                </Typography>
                <Typography
                  variant="subtitle1"
                  sx={{ fontWeight: 700 }}
                  data-testid="orders-create-page-summary-total-value"
                >
                  {formatPrice(animatedTotal)}
                </Typography>
              </Stack>
            </Stack>

            {isEffectivePricingPreviewUnavailable ? (
              <Alert severity="warning" data-testid="orders-create-page-summary-pricing-warning">
                {ordersUiText.errors.pricingPreviewUnavailable}
              </Alert>
            ) : null}

            <Button
              fullWidth
              variant="contained"
              onClick={() => void handleCreateOrder()}
              disabled={!canSubmit}
              data-testid="orders-create-page-summary-create-button"
            >
              {createMutation.isPending ? (
                <CircularProgress size={18} color="inherit" />
              ) : (
                ordersUiText.createPage.actions.create
              )}
            </Button>
          </Stack>
        </Paper>
      </Box>
    </Stack>
  )
}
