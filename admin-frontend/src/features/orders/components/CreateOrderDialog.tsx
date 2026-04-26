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
import type { Customer } from '@/api/modules/customers.api'
import type { Product } from '@/api/modules/products.api'
import type { CreateOrderPayload } from '@/api/modules/orders.api'
import { ORDER_DETAILS_SEARCH_DEBOUNCE_MS } from '@/features/orders/config/orderDetails.config'
import {
  useOrderCustomerOptionsQuery,
  useOrderProductOptionsQuery,
  useOrderProductsAvailability,
} from '@/features/orders/hooks/useOrdersQuery'
import { OrderProductQuantityControl } from '@/features/orders/components/OrderProductQuantityControl'
import { ordersUiText } from '@/features/orders/orders.ui-text'
import { useSettingsQuery } from '@/features/settings/hooks/useSettingsQuery'
import { formatPrice } from '@/utils/number'

type CustomerSummary = {
  _id: string
  name: string
  email: string
}

type ProductSummary = {
  _id: string
  name: string
  manufacturer: string
  price: number
}

type ProductRow = {
  id: number
  productId: string
  quantity: number
  summary: ProductSummary | null
}

type Props = {
  open: boolean
  isSubmitting: boolean
  onClose: () => void
  onSubmit: (payload: CreateOrderPayload) => Promise<void>
}

function toCustomerSummary(customer: Customer): CustomerSummary {
  return {
    _id: customer._id,
    name: customer.name,
    email: customer.email,
  }
}

function toProductSummary(product: Product): ProductSummary {
  return {
    _id: product._id,
    name: product.name,
    manufacturer: product.manufacturer,
    price: product.price,
  }
}

function formatCustomerSummary(customer: CustomerSummary) {
  return `${customer.name} | ${customer.email}`
}

function clampQuantity(value: number, max: number) {
  return Math.min(Math.max(value, 1), max)
}

export function CreateOrderDialog({ open, isSubmitting, onClose, onSubmit }: Props) {
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSummary | null>(null)
  const [isCustomerPickerOpen, setIsCustomerPickerOpen] = useState(false)
  const [customerSearch, setCustomerSearch] = useState('')
  const [debouncedCustomerSearch, setDebouncedCustomerSearch] = useState('')
  const [productRows, setProductRows] = useState<ProductRow[]>([
    { id: 1, productId: '', quantity: 1, summary: null },
  ])
  const [editingRowId, setEditingRowId] = useState<number | null>(null)
  const [productSearch, setProductSearch] = useState('')
  const [debouncedProductSearch, setDebouncedProductSearch] = useState('')
  const nextRowId = useRef(2)

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

  useEffect(() => {
    if (!open) return
    const timeoutId = window.setTimeout(() => {
      setDebouncedCustomerSearch(customerSearch.trim())
    }, ORDER_DETAILS_SEARCH_DEBOUNCE_MS)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [customerSearch, open])

  useEffect(() => {
    if (!open) return
    const timeoutId = window.setTimeout(() => {
      setDebouncedProductSearch(productSearch.trim())
    }, ORDER_DETAILS_SEARCH_DEBOUNCE_MS)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [open, productSearch])

  const customerOptionsQuery = useOrderCustomerOptionsQuery(
    debouncedCustomerSearch,
    open && isCustomerPickerOpen,
  )
  const customerOptions = useMemo(
    () => (customerOptionsQuery.data?.Customers ?? []).map(toCustomerSummary),
    [customerOptionsQuery.data?.Customers],
  )

  const activeRow = editingRowId ? productRows.find((row) => row.id === editingRowId) : null
  const selectedProductIdsOutsideActive = useMemo(() => {
    return new Set(
      productRows
        .filter((row) => row.id !== editingRowId)
        .map((row) => row.productId)
        .filter(Boolean),
    )
  }, [editingRowId, productRows])

  const productOptionsQuery = useOrderProductOptionsQuery(
    debouncedProductSearch,
    open && editingRowId !== null && hasQuantityLimit,
  )
  const productOptions = useMemo(
    () =>
      (productOptionsQuery.data?.Products ?? [])
        .map(toProductSummary)
        .filter((product) => !selectedProductIdsOutsideActive.has(product._id)),
    [productOptionsQuery.data?.Products, selectedProductIdsOutsideActive],
  )

  const selectedProducts = useMemo(
    () =>
      productRows
        .filter((row) => row.productId)
        .map((row) => ({
          id: row.productId,
          quantity:
            hasQuantityLimit && maxProductQuantityInOrder
              ? clampQuantity(row.quantity, maxProductQuantityInOrder)
              : row.quantity,
        })),
    [hasQuantityLimit, maxProductQuantityInOrder, productRows],
  )
  const selectedProductIds = useMemo(
    () => selectedProducts.map((item) => item.id),
    [selectedProducts],
  )
  const hasDuplicateRows = new Set(selectedProductIds).size !== selectedProductIds.length
  const { unavailableIds, isLoading: isAvailabilityLoading } = useOrderProductsAvailability(
    selectedProductIds,
    open && selectedProductIds.length > 0,
  )

  const hasValidCustomer = Boolean(selectedCustomer)
  const hasEmptyRows = productRows.some((row) => !row.productId)
  const hasUnavailableRows = productRows.some(
    (row) => row.productId && unavailableIds.has(row.productId),
  )
  const canRemoveRow = productRows.length > 1 && hasQuantityLimit
  const canAddRow = !isSubmitting && hasQuantityLimit
  const canSubmit =
    hasValidCustomer &&
    hasQuantityLimit &&
    !hasEmptyRows &&
    !hasDuplicateRows &&
    !hasUnavailableRows &&
    !isAvailabilityLoading &&
    !isSubmitting

  const totalPrice = useMemo(() => {
    return productRows.reduce((sum, row) => {
      if (!row.summary) return sum
      return sum + row.summary.price * row.quantity
    }, 0)
  }, [productRows])

  const handleOpenCustomerPicker = () => {
    if (isSubmitting) return
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

  const handleAddProductRow = () => {
    if (!canAddRow) return
    const nextId = nextRowId.current
    nextRowId.current += 1
    setProductRows((current) => [
      ...current,
      { id: nextId, productId: '', quantity: 1, summary: null },
    ])
    setEditingRowId(nextId)
    setProductSearch('')
    setDebouncedProductSearch('')
  }

  const handleRemoveProductRow = (rowId: number) => {
    if (!canRemoveRow || isSubmitting) return
    setProductRows((current) => {
      if (current.length <= 1) return current
      return current.filter((row) => row.id !== rowId)
    })
    setEditingRowId((current) => (current === rowId ? null : current))
  }

  const handleActivateProductRow = (rowId: number) => {
    if (isSubmitting || !hasQuantityLimit) return
    setEditingRowId((current) => (current === rowId ? null : rowId))
    setProductSearch('')
    setDebouncedProductSearch('')
  }

  const handleCloseProductPicker = () => {
    setEditingRowId(null)
    setProductSearch('')
    setDebouncedProductSearch('')
  }

  const handleSelectProduct = (product: ProductSummary | null) => {
    if (!editingRowId || isSubmitting || !product) return
    if (productRows.some((row) => row.id !== editingRowId && row.productId === product._id)) return
    setProductRows((current) =>
      current.map((row) =>
        row.id === editingRowId ? { ...row, productId: product._id, summary: product } : row,
      ),
    )
    handleCloseProductPicker()
  }

  const handleRowQuantityChange = (rowId: number, quantity: number) => {
    if (!hasQuantityLimit || !maxProductQuantityInOrder) return
    setProductRows((current) =>
      current.map((row) =>
        row.id === rowId
          ? { ...row, quantity: clampQuantity(quantity, maxProductQuantityInOrder) }
          : row,
      ),
    )
  }

  const resolveProductRowSummary = (row: ProductRow) => {
    if (!row.productId) {
      return ordersUiText.dialogs.details.editProductsSelectProduct
    }
    if (!row.summary) return row.productId
    return `${row.summary.name} | ${row.summary.manufacturer} | ${formatPrice(row.summary.price)}`
  }

  const handleSubmit = async () => {
    if (!canSubmit || !selectedCustomer) return
    await onSubmit({
      customer: selectedCustomer._id,
      products: selectedProducts,
    })
  }

  return (
    <Dialog
      open={open}
      onClose={isSubmitting ? undefined : onClose}
      fullWidth
      maxWidth="sm"
      data-testid="orders-create-dialog"
    >
      <DialogTitle sx={{ pr: 6 }} data-testid="orders-create-dialog-title">
        {ordersUiText.dialogs.createOrderTitle}
        <IconButton
          aria-label="close"
          onClick={onClose}
          disabled={isSubmitting}
          sx={{ position: 'absolute', right: 16, top: 12 }}
          data-testid="orders-create-close-button"
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ px: 3, py: 2.5 }}>
        <Stack spacing={2.25}>
          <Stack spacing={1.25} data-testid="orders-create-customer-section">
            <Typography variant="subtitle2">
              {ordersUiText.dialogs.createOrderCustomerLabel}
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
                    ? formatCustomerSummary(selectedCustomer)
                    : ''
              }
              filterOptions={(options) => options}
              getOptionLabel={formatCustomerSummary}
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
              slotProps={{
                popper: {
                  sx: { zIndex: (theme) => theme.zIndex.modal + 1 },
                },
              }}
              renderOption={(props, option, state) => {
                const { key, ...optionProps } = props
                return (
                  <li
                    key={key}
                    {...optionProps}
                    data-testid={`orders-create-customer-item-${state.index}`}
                  >
                    <Stack spacing={0.25}>
                      <Typography
                        sx={{ whiteSpace: 'normal', wordBreak: 'break-word' }}
                        data-testid={`orders-create-customer-item-${state.index}-name`}
                      >
                        {option.name}
                      </Typography>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ whiteSpace: 'normal', wordBreak: 'break-word' }}
                        data-testid={`orders-create-customer-item-${state.index}-email`}
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
                  placeholder={ordersUiText.dialogs.createOrderCustomerPlaceholder}
                  onClick={handleOpenCustomerPicker}
                  disabled={isSubmitting}
                  data-testid="orders-create-customer-search-input"
                  inputProps={{
                    ...params.inputProps,
                    'data-testid': 'orders-create-customer-search-input-field',
                    readOnly: !isCustomerPickerOpen,
                  }}
                />
              )}
            />
          </Stack>

          <Stack spacing={1.25} data-testid="orders-create-products-section">
            <Typography variant="subtitle2">
              {ordersUiText.dialogs.createOrderProductsTitle}
            </Typography>

            {isSettingsPending ? (
              <Alert severity="info" data-testid="orders-create-settings-loading-alert">
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
                    data-testid="orders-create-settings-retry-button"
                  >
                    {ordersUiText.dialogs.details.editProductsRetry}
                  </Button>
                }
                data-testid="orders-create-settings-error-alert"
              >
                {ordersUiText.errors.settingsNotFound}
              </Alert>
            ) : null}

            {productRows.map((row, index) => {
              const isActive = editingRowId === row.id
              const isUnavailable = Boolean(row.productId) && unavailableIds.has(row.productId)
              const quantityMax =
                hasQuantityLimit && maxProductQuantityInOrder ? maxProductQuantityInOrder : 1
              const quantityValue =
                hasQuantityLimit && maxProductQuantityInOrder
                  ? clampQuantity(row.quantity, maxProductQuantityInOrder)
                  : row.quantity

              return (
                <Paper
                  key={row.id}
                  variant="outlined"
                  onClick={() => handleActivateProductRow(row.id)}
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
                  data-testid={`orders-create-product-row-${index}`}
                >
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography
                        sx={{ whiteSpace: 'normal', wordBreak: 'break-word' }}
                        color={row.productId ? 'text.primary' : 'text.secondary'}
                        data-testid={`orders-create-product-row-${index}-summary`}
                      >
                        {resolveProductRowSummary(row)}
                      </Typography>

                      {isUnavailable ? (
                        <Typography
                          variant="body2"
                          color="error.main"
                          sx={{ mt: 0.75 }}
                          data-testid={`orders-create-product-row-${index}-unavailable`}
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
                        testIdPrefix={`orders-create-product-row-${index}`}
                      />
                    </Box>

                    <IconButton
                      size="small"
                      color="error"
                      onClick={(event) => {
                        event.stopPropagation()
                        handleRemoveProductRow(row.id)
                      }}
                      disabled={!canRemoveRow || isSubmitting}
                      data-testid={`orders-create-product-row-${index}-delete-button`}
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
              onClick={handleAddProductRow}
              disabled={!canAddRow}
              sx={{ alignSelf: 'flex-start' }}
              data-testid="orders-create-add-product-button"
            >
              {ordersUiText.dialogs.createOrderAddProductButton}
            </Button>
          </Stack>

          {activeRow && hasQuantityLimit ? (
            <Stack spacing={1.25} data-testid="orders-create-product-search-section">
              <Autocomplete
                options={productOptions}
                value={null}
                open={Boolean(activeRow)}
                loading={productOptionsQuery.isLoading || productOptionsQuery.isFetching}
                inputValue={productSearch}
                filterOptions={(options) => options}
                getOptionLabel={(option) => option.name}
                isOptionEqualToValue={(option, value) => option._id === value._id}
                onClose={(_, reason) => {
                  if (reason === 'selectOption') return
                  handleCloseProductPicker()
                }}
                onChange={(_, product) => handleSelectProduct(product)}
                onInputChange={(_, value, reason) => {
                  if (reason === 'reset') return
                  setProductSearch(value)
                }}
                noOptionsText={ordersUiText.dialogs.details.editProductsNoResults}
                loadingText={ordersUiText.dialogs.details.editProductsLoading}
                slotProps={{
                  popper: {
                    sx: { zIndex: (theme) => theme.zIndex.modal + 1 },
                  },
                }}
                renderOption={(props, option, state) => {
                  const { key, ...optionProps } = props
                  return (
                    <li
                      key={key}
                      {...optionProps}
                      data-testid={`orders-create-product-search-item-${state.index}`}
                    >
                      <Stack spacing={0.25}>
                        <Typography
                          sx={{ whiteSpace: 'normal', wordBreak: 'break-word' }}
                          data-testid={`orders-create-product-search-item-${state.index}-name`}
                        >
                          {option.name}
                        </Typography>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ whiteSpace: 'normal', wordBreak: 'break-word' }}
                          data-testid={`orders-create-product-search-item-${state.index}-meta`}
                        >
                          {option.manufacturer} | {formatPrice(option.price)}
                        </Typography>
                      </Stack>
                    </li>
                  )
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder={ordersUiText.dialogs.details.editProductsSearchPlaceholder}
                    disabled={isSubmitting}
                    data-testid="orders-create-product-search-input"
                    inputProps={{
                      ...params.inputProps,
                      'data-testid': 'orders-create-product-search-input-field',
                    }}
                  />
                )}
              />
            </Stack>
          ) : null}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          sx={{ mr: 'auto' }}
          data-testid="orders-create-total-price-section"
        >
          <Typography variant="body2">{ordersUiText.dialogs.createOrderTotalPriceLabel}</Typography>
          <Typography
            variant="body1"
            sx={{ fontWeight: 700, color: 'primary.main' }}
            data-testid="orders-create-total-price-value"
          >
            {formatPrice(totalPrice)}
          </Typography>
        </Stack>

        <Button
          variant="contained"
          onClick={() => void handleSubmit()}
          disabled={!canSubmit}
          data-testid="orders-create-submit-button"
        >
          {isSubmitting ? (
            <CircularProgress size={18} color="inherit" />
          ) : (
            ordersUiText.dialogs.createOrderSubmitButton
          )}
        </Button>
        <Button onClick={onClose} disabled={isSubmitting} data-testid="orders-create-cancel-button">
          {ordersUiText.dialogs.cancel}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
