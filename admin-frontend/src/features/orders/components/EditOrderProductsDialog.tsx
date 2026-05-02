import {
  Alert,
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import CloseIcon from '@mui/icons-material/Close'
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { Product } from '@/api/modules/products.api'
import type {
  OrderDelivery,
  OrderDeliveryPayload,
  OrderProduct,
  OrderProductRequestItem,
} from '@/api/modules/orders.api'
import { ORDER_DETAILS_SEARCH_DEBOUNCE_MS } from '@/features/orders/config/orderDetails.config'
import {
  useOrderPricingMutation,
  useOrderProductOptionsQuery,
  useOrderProductsAvailability,
} from '@/features/orders/hooks/useOrdersQuery'
import { ordersUiText } from '@/features/orders/orders.ui-text'
import { formatPrice } from '@/utils/number'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { OrderProductQuantityControl } from '@/features/orders/components/OrderProductQuantityControl'
import { useSettingsQuery } from '@/features/settings/hooks/useSettingsQuery'

type ProductRow = {
  id: number
  productId: string
  quantity: number
}

type ProductSummary = {
  _id: string
  name: string
  manufacturer: string
  price: number
}

type Props = {
  open: boolean
  initialProducts: OrderProduct[]
  currentDelivery: OrderDelivery | null
  isSubmitting: boolean
  onClose: () => void
  onSave: (payload: { products: OrderProductRequestItem[] }) => Promise<void> | void
}

function normalizeRequestedProducts(items: OrderProductRequestItem[]) {
  return [...items].sort((left, right) => left.id.localeCompare(right.id))
}

function areEqualRequestedProducts(a: OrderProductRequestItem[], b: OrderProductRequestItem[]) {
  if (a.length !== b.length) return false
  const normalizedA = normalizeRequestedProducts(a)
  const normalizedB = normalizeRequestedProducts(b)
  return normalizedA.every(
    (item, index) =>
      item.id === normalizedB[index].id && item.quantity === normalizedB[index].quantity,
  )
}

function clampQuantity(value: number, max: number) {
  return Math.min(Math.max(value, 1), max)
}

function buildSummaryFromOrderProduct(product: OrderProduct): ProductSummary {
  return {
    _id: product.product._id,
    name: product.product.name,
    manufacturer: product.product.manufacturer,
    price: product.unitPrice,
  }
}

function buildSummaryFromProduct(product: Product): ProductSummary {
  return {
    _id: product._id,
    name: product.name,
    manufacturer: product.manufacturer,
    price: product.price,
  }
}

function toOrderDeliveryPayload(delivery: OrderDelivery | null): OrderDeliveryPayload | undefined {
  if (!delivery) return undefined

  if (delivery.condition === 'Delivery') {
    return {
      condition: 'Delivery',
      express: 'express' in delivery.schedule ? delivery.schedule.express : false,
      address: delivery.address,
    }
  }

  return {
    condition: 'Pickup',
    address: delivery.address,
  }
}

export function EditOrderProductsDialog({
  open,
  initialProducts,
  currentDelivery,
  isSubmitting,
  onClose,
  onSave,
}: Props) {
  const [rows, setRows] = useState<ProductRow[]>(() =>
    initialProducts.length
      ? initialProducts.map((product, index) => ({
          id: index + 1,
          productId: product.product._id,
          quantity: product.quantity,
        }))
      : [{ id: 1, productId: '', quantity: 1 }],
  )
  const [editingRowId, setEditingRowId] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [isDiscardConfirmOpen, setIsDiscardConfirmOpen] = useState(false)
  const [pricingPreviewTotal, setPricingPreviewTotal] = useState<number | null>(null)
  const [isPricingPreviewUnavailable, setIsPricingPreviewUnavailable] = useState(false)
  const [isPricingPreviewLoading, setIsPricingPreviewLoading] = useState(false)
  const [knownProductsById, setKnownProductsById] = useState<Map<string, ProductSummary>>(
    () =>
      new Map(
        initialProducts.map((product) => [product.product._id, buildSummaryFromOrderProduct(product)]),
      ),
  )
  const nextRowId = useRef(initialProducts.length > 0 ? initialProducts.length + 1 : 2)
  const pricingRequestIdRef = useRef(0)

  const {
    data: settings,
    isLoading: isSettingsLoading,
    isFetching: isSettingsFetching,
    refetch: refetchSettings,
  } = useSettingsQuery(open)
  const maxProductQuantityInOrder = settings?.order.maxProductQuantityInOrder
  const hasQuantityLimit =
    typeof maxProductQuantityInOrder === 'number' && maxProductQuantityInOrder >= 1
  const isSettingsPending = isSettingsLoading || (!settings && isSettingsFetching)
  const isSettingsUnavailable = !isSettingsPending && !hasQuantityLimit

  const initialProductsById = useMemo(
    () =>
      new Map(
        initialProducts.map((product) => [product.product._id, buildSummaryFromOrderProduct(product)]),
      ),
    [initialProducts],
  )

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearch(search.trim())
    }, ORDER_DETAILS_SEARCH_DEBOUNCE_MS)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [open, search])

  const currentProducts = useMemo(
    () =>
      rows
        .filter((row) => row.productId)
        .map((row) => ({
          id: row.productId,
          quantity:
            hasQuantityLimit && maxProductQuantityInOrder
              ? clampQuantity(row.quantity, maxProductQuantityInOrder)
              : row.quantity,
        })),
    [hasQuantityLimit, maxProductQuantityInOrder, rows],
  )
  const currentProductIds = useMemo(() => currentProducts.map((product) => product.id), [currentProducts])
  const initialRequestedProducts = useMemo(
    () => initialProducts.map((product) => ({ id: product.product._id, quantity: product.quantity })),
    [initialProducts],
  )
  const hasDuplicateRows = new Set(currentProductIds).size !== currentProductIds.length

  const selectedProductIdsOutsideActive = useMemo(() => {
    return new Set(
      rows
        .filter((row) => row.id !== editingRowId)
        .map((row) => row.productId)
        .filter(Boolean),
    )
  }, [editingRowId, rows])
  const optionsQuery = useOrderProductOptionsQuery(
    debouncedSearch,
    editingRowId !== null && hasQuantityLimit,
  )
  const options = useMemo(
    () =>
      (optionsQuery.data?.Products ?? []).filter(
        (option) => !selectedProductIdsOutsideActive.has(option._id),
      ),
    [optionsQuery.data?.Products, selectedProductIdsOutsideActive],
  )
  const { mutateAsync: calculatePricingAsync } = useOrderPricingMutation()

  const { unavailableIds, isLoading: isAvailabilityLoading } = useOrderProductsAvailability(
    currentProductIds,
    true,
  )

  const canRemoveRow = rows.length > 1 && hasQuantityLimit
  const hasEmptyRows = rows.some((row) => !row.productId)
  const hasUnavailableRows = rows.some((row) => row.productId && unavailableIds.has(row.productId))
  const hasChanges = !areEqualRequestedProducts(initialRequestedProducts, currentProducts)
  const canAddRow = hasQuantityLimit && !isSubmitting
  const isSaveDisabled =
    isSubmitting ||
    isSettingsPending ||
    !hasQuantityLimit ||
    isAvailabilityLoading ||
    hasEmptyRows ||
    hasDuplicateRows ||
    hasUnavailableRows ||
    !hasChanges
  const canRequestPricingPreview =
    open && hasQuantityLimit && !hasEmptyRows && !hasDuplicateRows && currentProducts.length > 0
  const saveDisabledReason = isSubmitting
    ? null
    : isSettingsPending
      ? ordersUiText.dialogs.details.editProductsSettingsLoading
      : !hasQuantityLimit
        ? ordersUiText.errors.settingsNotFound
        : isAvailabilityLoading
          ? ordersUiText.dialogs.details.editProductsDisabledReasonCheckingAvailability
          : hasDuplicateRows
            ? ordersUiText.dialogs.details.editProductsDisabledReasonDuplicates
            : hasUnavailableRows
              ? ordersUiText.dialogs.details.editProductsDisabledReasonUnavailable
              : hasEmptyRows
                ? ordersUiText.dialogs.details.editProductsDisabledReasonEmptyRows
                : !hasChanges
                  ? ordersUiText.dialogs.details.editProductsDisabledReasonNoChanges
                  : null

  useEffect(() => {
    if (!canRequestPricingPreview) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      const requestId = pricingRequestIdRef.current + 1
      pricingRequestIdRef.current = requestId
      setIsPricingPreviewLoading(true)

      void calculatePricingAsync({
          payload: {
            products: currentProducts,
            delivery: toOrderDeliveryPayload(currentDelivery),
          },
          requestConfig: { skipErrorToast: true },
        })
        .then((pricing) => {
          if (pricingRequestIdRef.current !== requestId) return
          setPricingPreviewTotal(pricing.totalPrice)
          setIsPricingPreviewUnavailable(false)
        })
        .catch(() => {
          if (pricingRequestIdRef.current !== requestId) return
          setPricingPreviewTotal(null)
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
    canRequestPricingPreview,
    currentDelivery,
    currentProducts,
    hasDuplicateRows,
    hasEmptyRows,
    hasQuantityLimit,
    open,
    calculatePricingAsync,
  ])

  const handleAddRow = () => {
    if (!canAddRow || isSubmitting) return
    const nextId = nextRowId.current
    nextRowId.current += 1

    setRows((current) => [...current, { id: nextId, productId: '', quantity: 1 }])
    setEditingRowId(nextId)
    setSearch('')
    setDebouncedSearch('')
  }

  const handleRemoveRow = (rowId: number) => {
    if (!canRemoveRow || isSubmitting) return
    setRows((current) => {
      if (current.length <= 1) return current
      const next = current.filter((row) => row.id !== rowId)
      if (editingRowId === rowId) {
        setEditingRowId(null)
      }
      return next
    })
  }

  const handleActivateRow = (rowId: number) => {
    if (isSubmitting || !hasQuantityLimit) return
    setEditingRowId((current) => (current === rowId ? null : rowId))
    setSearch('')
    setDebouncedSearch('')
  }

  const handleClosePicker = () => {
    setEditingRowId(null)
    setSearch('')
    setDebouncedSearch('')
  }

  const handleSelectProduct = (product: Product | null) => {
    if (!editingRowId || isSubmitting || !product) return
    if (rows.some((row) => row.id !== editingRowId && row.productId === product._id)) return
    setRows((current) =>
      current.map((row) => (row.id === editingRowId ? { ...row, productId: product._id } : row)),
    )
    setKnownProductsById((current) => {
      const next = new Map(current)
      next.set(product._id, buildSummaryFromProduct(product))
      return next
    })
    handleClosePicker()
  }

  const handleRowQuantityChange = (rowId: number, quantity: number) => {
    if (!hasQuantityLimit || !maxProductQuantityInOrder) return
    setRows((current) =>
      current.map((row) =>
        row.id === rowId ? { ...row, quantity: clampQuantity(quantity, maxProductQuantityInOrder) } : row,
      ),
    )
  }

  const resolveRowSummary = (row: ProductRow) => {
    if (!row.productId) {
      return ordersUiText.dialogs.details.editProductsSelectProduct
    }
    const product = knownProductsById.get(row.productId) ?? initialProductsById.get(row.productId)
    if (!product) {
      return row.productId
    }
    return `${product.name} | ${product.manufacturer} | ${formatPrice(product.price)}`
  }

  const activeRow = editingRowId ? rows.find((row) => row.id === editingRowId) : null

  const requestClose = () => {
    handleClosePicker()
    if (hasChanges && !isSubmitting) {
      setIsDiscardConfirmOpen(true)
      return
    }
    onClose()
  }

  const handleDiscardConfirm = () => {
    setIsDiscardConfirmOpen(false)
    onClose()
  }

  return (
    <>
      <Dialog
        open={open}
        onClose={isSubmitting ? undefined : requestClose}
        fullWidth
        maxWidth="sm"
        data-testid="order-details-products-edit-dialog"
      >
        <DialogTitle sx={{ pr: 6 }} data-testid="order-details-products-edit-dialog-title">
          <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="space-between">
            <Typography variant="h6" component="span" sx={{ fontWeight: 700 }}>
              {ordersUiText.dialogs.details.editProductsTitle}
            </Typography>
            {saveDisabledReason ? (
              <Typography
                variant="body2"
                color="warning.main"
                sx={{ textAlign: 'right', maxWidth: 320, mr: 4.5 }}
                data-testid="order-details-products-edit-save-disabled-reason"
              >
                {saveDisabledReason}
              </Typography>
            ) : null}
          </Stack>
          <IconButton
            aria-label="close"
            onClick={requestClose}
            disabled={isSubmitting}
            sx={{ position: 'absolute', right: 16, top: 12 }}
            data-testid="order-details-products-edit-dialog-close-button"
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers>
          <Stack spacing={2.25}>
            {isSettingsPending ? (
              <Alert severity="info" data-testid="order-details-products-edit-settings-loading-alert">
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
                    data-testid="order-details-products-edit-settings-retry-button"
                  >
                    {ordersUiText.dialogs.details.editProductsRetry}
                  </Button>
                }
                data-testid="order-details-products-edit-settings-error-alert"
              >
                {ordersUiText.errors.settingsNotFound}
              </Alert>
            ) : null}

            <Stack spacing={1.25} data-testid="order-details-products-edit-selected-rows-section">
              <Typography variant="subtitle2">
                {ordersUiText.dialogs.details.editProductsLabel}
              </Typography>

              {rows.map((row, index) => {
                const isActive = editingRowId === row.id
                const isUnavailable = Boolean(row.productId) && unavailableIds.has(row.productId)
                const quantityMax = hasQuantityLimit && maxProductQuantityInOrder ? maxProductQuantityInOrder : 1
                const quantityValue =
                  hasQuantityLimit && maxProductQuantityInOrder
                    ? clampQuantity(row.quantity, maxProductQuantityInOrder)
                    : row.quantity
                return (
                  <Paper
                    key={row.id}
                    variant="outlined"
                    onClick={() => handleActivateRow(row.id)}
                    sx={{
                      p: 1.25,
                      cursor: isSubmitting || !hasQuantityLimit ? 'default' : 'pointer',
                      transition: (theme) =>
                        theme.transitions.create('border-color', {
                          duration: theme.transitions.duration.shortest,
                        }),
                      borderColor: isUnavailable
                        ? 'error.main'
                        : isActive
                          ? 'primary.main'
                          : 'action.disabled',
                      '&:hover': {
                        borderColor: isUnavailable
                          ? 'error.main'
                          : isActive
                            ? 'primary.main'
                            : 'text.primary',
                      },
                    }}
                    data-testid={`order-details-products-edit-row-${index}`}
                  >
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography
                          sx={{ whiteSpace: 'normal', wordBreak: 'break-word' }}
                          color={row.productId ? 'text.primary' : 'text.secondary'}
                          data-testid={`order-details-products-edit-row-${index}-summary`}
                        >
                          {resolveRowSummary(row)}
                        </Typography>

                        {isUnavailable ? (
                          <Typography
                            variant="body2"
                            color="error.main"
                            sx={{ mt: 0.75 }}
                            data-testid={`order-details-products-edit-row-${index}-unavailable`}
                          >
                            {ordersUiText.dialogs.details.editProductsUnavailable}
                          </Typography>
                        ) : null}
                      </Box>

                      <Box sx={{ flexShrink: 0 }}>
                        <OrderProductQuantityControl
                          value={quantityValue}
                          min={1}
                          max={quantityMax}
                          disabled={isSubmitting || !row.productId || !hasQuantityLimit}
                          onChange={(nextValue) => handleRowQuantityChange(row.id, nextValue)}
                          testIdPrefix={`order-details-products-edit-row-${index}`}
                        />
                      </Box>

                      <IconButton
                        size="small"
                        color="error"
                        onClick={(event) => {
                          event.stopPropagation()
                          handleRemoveRow(row.id)
                        }}
                        disabled={!canRemoveRow || isSubmitting}
                        data-testid={`order-details-products-edit-row-${index}-delete-button`}
                      >
                        <DeleteOutlineOutlinedIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </Paper>
                )
              })}

              <Button
                variant="outlined"
                startIcon={<AddRoundedIcon />}
                onClick={handleAddRow}
                disabled={!canAddRow}
                sx={{ alignSelf: 'flex-start' }}
                data-testid="order-details-products-edit-add-product-button"
              >
                {ordersUiText.dialogs.details.editProductsAdd}
              </Button>
            </Stack>

            <Stack spacing={1.25}>
              {activeRow && hasQuantityLimit ? (
                <Autocomplete
                  options={options}
                  value={null}
                  open={Boolean(activeRow)}
                  loading={optionsQuery.isLoading || optionsQuery.isFetching}
                  inputValue={search}
                  filterOptions={(availableOptions) => availableOptions}
                  getOptionLabel={(option) => option.name}
                  isOptionEqualToValue={(option, value) => option._id === value._id}
                  onClose={(_, reason) => {
                    if (reason === 'selectOption') return
                    handleClosePicker()
                  }}
                  onChange={(_, product) => handleSelectProduct(product)}
                  onInputChange={(_, value, reason) => {
                    if (reason === 'reset') return
                    setSearch(value)
                  }}
                  noOptionsText={
                    <Typography
                      color="text.secondary"
                      data-testid="order-details-products-edit-search-list-empty"
                    >
                      {ordersUiText.dialogs.details.editProductsNoResults}
                    </Typography>
                  }
                  loadingText={
                    <Stack
                      direction="row"
                      spacing={1}
                      alignItems="center"
                      data-testid="order-details-products-edit-search-list-loading"
                    >
                      <CircularProgress size={16} />
                      <Typography color="text.secondary">
                        {ordersUiText.dialogs.details.editProductsLoading}
                      </Typography>
                    </Stack>
                  }
                  slotProps={{
                    popper: {
                      sx: { zIndex: (theme) => theme.zIndex.modal + 1 },
                    },
                  }}
                  renderOption={(props, product, state) => {
                    const { key, ...optionProps } = props
                    return (
                      <li key={key} {...optionProps} data-testid={`order-details-products-edit-search-item-${state.index}`}>
                        <Stack spacing={0.25}>
                          <Typography
                            sx={{ whiteSpace: 'normal', wordBreak: 'break-word' }}
                            data-testid={`order-details-products-edit-search-item-${state.index}-name`}
                          >
                            {product.name}
                          </Typography>
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ whiteSpace: 'normal', wordBreak: 'break-word' }}
                            data-testid={`order-details-products-edit-search-item-${state.index}-meta`}
                          >
                            {product.manufacturer} | {formatPrice(product.price)}
                          </Typography>
                        </Stack>
                      </li>
                    )
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label={ordersUiText.dialogs.details.editProductsSearchLabel}
                      placeholder={ordersUiText.dialogs.details.editProductsSearchPlaceholder}
                      disabled={isSubmitting}
                      data-testid="order-details-products-edit-search-input"
                      inputProps={{
                        ...params.inputProps,
                        'data-testid': 'order-details-products-edit-search-input-field',
                      }}
                    />
                  )}
                />
              ) : (
                <Typography
                  sx={{ py: 0.5 }}
                  color="text.secondary"
                  data-testid="order-details-products-edit-search-list-no-active-row"
                >
                  {ordersUiText.dialogs.details.editProductsSelectRowHint}
                </Typography>
              )}
            </Stack>

            {canRequestPricingPreview && isPricingPreviewUnavailable ? (
              <Alert
                severity="warning"
                data-testid="order-details-products-edit-pricing-preview-unavailable-alert"
              >
                {ordersUiText.errors.pricingPreviewUnavailable}
              </Alert>
            ) : null}
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            sx={{ mr: 'auto' }}
            data-testid="order-details-products-edit-total-price-section"
          >
            <Typography variant="body2">{ordersUiText.dialogs.createOrderTotalPriceLabel}</Typography>
            <Typography
              variant="body1"
              sx={{ fontWeight: 700, color: 'primary.main' }}
              data-testid="order-details-products-edit-total-price-value"
            >
              {canRequestPricingPreview && isPricingPreviewLoading ? (
                <CircularProgress size={16} />
              ) : (
                formatPrice(canRequestPricingPreview ? pricingPreviewTotal : null)
              )}
            </Typography>
          </Stack>

          <Stack direction="row" spacing={1}>
            <Button
              variant="contained"
              onClick={() => void onSave({ products: currentProducts })}
              disabled={isSaveDisabled}
              data-testid="order-details-products-edit-save-button"
            >
              {isSubmitting ? (
                <CircularProgress size={18} color="inherit" />
              ) : (
                ordersUiText.dialogs.details.editProductsSave
              )}
            </Button>
            <Button
              onClick={requestClose}
              disabled={isSubmitting}
              data-testid="order-details-products-edit-cancel-button"
            >
              {ordersUiText.dialogs.cancel}
            </Button>
          </Stack>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={isDiscardConfirmOpen}
        title={ordersUiText.dialogs.details.editProductsDiscardTitle}
        message={ordersUiText.dialogs.details.editProductsDiscardMessage}
        confirmLabel={ordersUiText.dialogs.details.editProductsDiscardConfirm}
        confirmColor="warning"
        cancelLabel={ordersUiText.dialogs.details.editProductsDiscardCancel}
        onCancel={() => setIsDiscardConfirmOpen(false)}
        onConfirm={handleDiscardConfirm}
      />
    </>
  )
}
