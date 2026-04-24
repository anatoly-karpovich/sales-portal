import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  LinearProgress,
  List,
  ListItemButton,
  ListItemText,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import CloseIcon from '@mui/icons-material/Close'
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { Customer } from '@/api/modules/customers.api'
import type { Product } from '@/api/modules/products.api'
import type { CreateOrderPayload } from '@/api/modules/orders.api'
import {
  ORDER_DETAILS_EDIT_PRODUCTS_MAX_ROWS,
  ORDER_DETAILS_SEARCH_DEBOUNCE_MS,
} from '@/features/orders/config/orderDetails.config'
import {
  useOrderCustomerOptionsQuery,
  useOrderProductOptionsQuery,
  useOrderProductsAvailability,
} from '@/features/orders/hooks/useOrdersQuery'
import { ordersUiText } from '@/features/orders/orders.ui-text'
import { formatPrice } from '@/utils/number'

type ProductRow = {
  id: number
  productId: string
  summary: ProductSummary | null
}

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

export function CreateOrderDialog({ open, isSubmitting, onClose, onSubmit }: Props) {
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSummary | null>(null)
  const [isCustomerPickerOpen, setIsCustomerPickerOpen] = useState(false)
  const [customerSearch, setCustomerSearch] = useState('')
  const [debouncedCustomerSearch, setDebouncedCustomerSearch] = useState('')
  const [productRows, setProductRows] = useState<ProductRow[]>([
    { id: 1, productId: '', summary: null },
  ])
  const [editingRowId, setEditingRowId] = useState<number | null>(null)
  const [productSearch, setProductSearch] = useState('')
  const [debouncedProductSearch, setDebouncedProductSearch] = useState('')
  const nextRowId = useRef(2)

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
  const customerOptions = customerOptionsQuery.data?.Customers ?? []
  const isCustomerInitialLoading = customerOptionsQuery.isLoading && customerOptions.length === 0
  const isCustomerUpdating = customerOptionsQuery.isFetching && customerOptions.length > 0

  const activeRow = editingRowId ? productRows.find((row) => row.id === editingRowId) : null
  const productOptionsQuery = useOrderProductOptionsQuery(
    debouncedProductSearch,
    open && editingRowId !== null,
  )
  const productOptions = productOptionsQuery.data?.Products ?? []
  const isProductInitialLoading = productOptionsQuery.isLoading && productOptions.length === 0
  const isProductUpdating = productOptionsQuery.isFetching && productOptions.length > 0

  const selectedProductIds = useMemo(
    () => productRows.map((row) => row.productId).filter(Boolean),
    [productRows],
  )
  const { unavailableIds, isLoading: isAvailabilityLoading } = useOrderProductsAvailability(
    selectedProductIds,
    open && selectedProductIds.length > 0,
  )

  const hasValidCustomer = Boolean(selectedCustomer)
  const hasEmptyRows = productRows.some((row) => !row.productId)
  const hasUnavailableRows = productRows.some(
    (row) => row.productId && unavailableIds.has(row.productId),
  )
  const canRemoveRow = productRows.length > 1
  const canAddRow = productRows.length < ORDER_DETAILS_EDIT_PRODUCTS_MAX_ROWS && !isSubmitting
  const canSubmit =
    hasValidCustomer &&
    !hasEmptyRows &&
    !hasUnavailableRows &&
    !isAvailabilityLoading &&
    !isSubmitting

  const totalPrice = useMemo(() => {
    return productRows.reduce((sum, row) => {
      if (!row.summary) return sum
      return sum + row.summary.price
    }, 0)
  }, [productRows])

  const handleOpenCustomerPicker = () => {
    if (isSubmitting) return
    setIsCustomerPickerOpen(true)
    setCustomerSearch('')
    setDebouncedCustomerSearch('')
  }

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(toCustomerSummary(customer))
    setIsCustomerPickerOpen(false)
    setCustomerSearch('')
    setDebouncedCustomerSearch('')
  }

  const handleAddProductRow = () => {
    if (!canAddRow) return
    const nextId = nextRowId.current
    nextRowId.current += 1
    setProductRows((current) => [...current, { id: nextId, productId: '', summary: null }])
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
    if (isSubmitting) return
    setEditingRowId((current) => (current === rowId ? null : rowId))
    setProductSearch('')
    setDebouncedProductSearch('')
  }

  const handleSelectProduct = (product: Product) => {
    if (!editingRowId || isSubmitting) return
    setProductRows((current) =>
      current.map((row) =>
        row.id === editingRowId
          ? { ...row, productId: product._id, summary: toProductSummary(product) }
          : row,
      ),
    )
    setProductSearch('')
    setDebouncedProductSearch('')
    setEditingRowId(null)
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
      products: selectedProductIds,
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
            <Typography variant="subtitle2">{ordersUiText.dialogs.createOrderCustomerLabel}</Typography>
            <TextField
              placeholder={ordersUiText.dialogs.createOrderCustomerPlaceholder}
              value={
                isCustomerPickerOpen
                  ? customerSearch
                  : selectedCustomer
                    ? `${selectedCustomer.name} | ${selectedCustomer.email}`
                    : ''
              }
              onChange={(event) => {
                if (!isCustomerPickerOpen) return
                setCustomerSearch(event.target.value)
              }}
              onClick={() => {
                if (!selectedCustomer) {
                  handleOpenCustomerPicker()
                }
              }}
              disabled={isSubmitting}
              data-testid="orders-create-customer-search-input"
              inputProps={{
                'data-testid': 'orders-create-customer-search-input-field',
                readOnly: !isCustomerPickerOpen,
              }}
              InputProps={{
                endAdornment: selectedCustomer ? (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={handleOpenCustomerPicker}
                      disabled={isSubmitting}
                      data-testid="orders-create-customer-edit-button"
                    >
                      <EditOutlinedIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ) : null,
              }}
            />

            {isCustomerPickerOpen ? (
              <Paper
                variant="outlined"
                sx={{ maxHeight: 220, overflowY: 'auto', position: 'relative' }}
                data-testid="orders-create-customer-list"
              >
                {isCustomerUpdating ? (
                  <LinearProgress
                    sx={{ position: 'sticky', top: 0, left: 0, right: 0, zIndex: 1 }}
                    data-testid="orders-create-customer-list-updating"
                  />
                ) : null}

                {isCustomerInitialLoading ? (
                  <Stack
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    justifyContent="center"
                    sx={{ py: 4 }}
                    data-testid="orders-create-customer-list-loading"
                  >
                    <CircularProgress size={18} />
                    <Typography color="text.secondary">
                      {ordersUiText.dialogs.details.editCustomerLoading}
                    </Typography>
                  </Stack>
                ) : customerOptions.length === 0 ? (
                  <Typography
                    sx={{ py: 3, px: 2 }}
                    color="text.secondary"
                    data-testid="orders-create-customer-list-empty"
                  >
                    {ordersUiText.dialogs.details.editCustomerNoResults}
                  </Typography>
                ) : (
                  <List disablePadding>
                    {customerOptions.map((customer, index) => (
                      <ListItemButton
                        key={customer._id}
                        selected={selectedCustomer?._id === customer._id}
                        onClick={() => handleSelectCustomer(customer)}
                        disabled={isSubmitting}
                        data-testid={`orders-create-customer-item-${index}`}
                      >
                        <ListItemText
                          primary={
                            <Typography
                              sx={{ whiteSpace: 'normal', wordBreak: 'break-word' }}
                              data-testid={`orders-create-customer-item-${index}-name`}
                            >
                              {customer.name}
                            </Typography>
                          }
                          secondary={
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{ whiteSpace: 'normal', wordBreak: 'break-word' }}
                              data-testid={`orders-create-customer-item-${index}-email`}
                            >
                              {customer.email}
                            </Typography>
                          }
                        />
                      </ListItemButton>
                    ))}
                  </List>
                )}
              </Paper>
            ) : null}
          </Stack>

          <Stack spacing={1.25} data-testid="orders-create-products-section">
            <Typography variant="subtitle2">
              {ordersUiText.dialogs.createOrderProductsTitle}
            </Typography>

            {productRows.map((row, index) => {
              const isActive = editingRowId === row.id
              const isUnavailable = Boolean(row.productId) && unavailableIds.has(row.productId)
              return (
                <Paper
                  key={row.id}
                  variant="outlined"
                  sx={{
                    p: 1.25,
                    borderColor: isUnavailable
                      ? 'error.main'
                      : isActive
                        ? 'primary.main'
                        : 'divider',
                  }}
                  data-testid={`orders-create-product-row-${index}`}
                >
                  <Stack direction="row" spacing={1} alignItems="flex-start">
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
                          data-testid={`orders-create-product-row-${index}-unavailable`}
                        >
                          {ordersUiText.dialogs.details.editProductsUnavailable}
                        </Typography>
                      ) : null}
                    </Box>

                    <IconButton
                      size="small"
                      onClick={() => handleActivateProductRow(row.id)}
                      disabled={isSubmitting}
                      color={isActive ? 'primary' : 'default'}
                      data-testid={`orders-create-product-row-${index}-edit-button`}
                    >
                      <EditOutlinedIcon fontSize="small" />
                    </IconButton>

                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleRemoveProductRow(row.id)}
                      disabled={!canRemoveRow || isSubmitting}
                      data-testid={`orders-create-product-row-${index}-delete-button`}
                    >
                      <DeleteOutlineOutlinedIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                </Paper>
              )
            })}

            {canAddRow ? (
              <Button
                variant="outlined"
                startIcon={<AddRoundedIcon />}
                onClick={handleAddProductRow}
                disabled={isSubmitting}
                sx={{ alignSelf: 'flex-start' }}
                data-testid="orders-create-add-product-button"
              >
                {ordersUiText.dialogs.createOrderAddProductButton}
              </Button>
            ) : null}
          </Stack>

          <Stack spacing={1.25} data-testid="orders-create-product-search-section">
            {activeRow ? (
              <>
                <TextField
                  label={ordersUiText.dialogs.createOrderProductLabel}
                  placeholder={ordersUiText.dialogs.details.editProductsSearchPlaceholder}
                  value={productSearch}
                  onChange={(event) => setProductSearch(event.target.value)}
                  disabled={isSubmitting}
                  data-testid="orders-create-product-search-input"
                  inputProps={{ 'data-testid': 'orders-create-product-search-input-field' }}
                />

                <Paper
                  variant="outlined"
                  sx={{ maxHeight: 260, overflowY: 'auto', position: 'relative' }}
                  data-testid="orders-create-product-search-list"
                >
                  {isProductUpdating ? (
                    <LinearProgress
                      sx={{ position: 'sticky', top: 0, left: 0, right: 0, zIndex: 1 }}
                      data-testid="orders-create-product-search-list-updating"
                    />
                  ) : null}

                  {isProductInitialLoading ? (
                    <Stack
                      direction="row"
                      spacing={1}
                      alignItems="center"
                      justifyContent="center"
                      sx={{ py: 4 }}
                      data-testid="orders-create-product-search-list-loading"
                    >
                      <CircularProgress size={18} />
                      <Typography color="text.secondary">
                        {ordersUiText.dialogs.details.editProductsLoading}
                      </Typography>
                    </Stack>
                  ) : productOptions.length === 0 ? (
                    <Typography
                      sx={{ py: 3, px: 2 }}
                      color="text.secondary"
                      data-testid="orders-create-product-search-list-empty"
                    >
                      {ordersUiText.dialogs.details.editProductsNoResults}
                    </Typography>
                  ) : (
                    <List disablePadding>
                      {productOptions.map((product, index) => (
                        <ListItemButton
                          key={product._id}
                          selected={activeRow.productId === product._id}
                          onClick={() => handleSelectProduct(product)}
                          disabled={isSubmitting}
                          data-testid={`orders-create-product-search-item-${index}`}
                        >
                          <ListItemText
                            primary={
                              <Typography
                                sx={{ whiteSpace: 'normal', wordBreak: 'break-word' }}
                                data-testid={`orders-create-product-search-item-${index}-name`}
                              >
                                {product.name}
                              </Typography>
                            }
                            secondary={
                              <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{ whiteSpace: 'normal', wordBreak: 'break-word' }}
                                data-testid={`orders-create-product-search-item-${index}-meta`}
                              >
                                {product.manufacturer} | {formatPrice(product.price)}
                              </Typography>
                            }
                          />
                        </ListItemButton>
                      ))}
                    </List>
                  )}
                </Paper>
              </>
            ) : null}
          </Stack>
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
