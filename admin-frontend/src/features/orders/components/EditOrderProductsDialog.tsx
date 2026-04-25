import {
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
import type { OrderProduct } from '@/api/modules/orders.api'
import {
  ORDER_DETAILS_EDIT_PRODUCTS_MAX_ROWS,
  ORDER_DETAILS_SEARCH_DEBOUNCE_MS,
} from '@/features/orders/config/orderDetails.config'
import {
  useOrderProductOptionsQuery,
  useOrderProductsAvailability,
} from '@/features/orders/hooks/useOrdersQuery'
import { ordersUiText } from '@/features/orders/orders.ui-text'
import { formatPrice } from '@/utils/number'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'

type ProductRow = {
  id: number
  productId: string
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
  isSubmitting: boolean
  onClose: () => void
  onSave: (productIds: string[]) => Promise<void> | void
}

function areEqualProductMultiset(a: string[], b: string[]) {
  if (a.length !== b.length) return false
  const sortedA = [...a].sort()
  const sortedB = [...b].sort()
  return sortedA.every((value, index) => value === sortedB[index])
}

function buildSummaryFromOrderProduct(product: OrderProduct): ProductSummary {
  return {
    _id: product._id,
    name: product.name,
    manufacturer: product.manufacturer,
    price: product.price,
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

export function EditOrderProductsDialog({
  open,
  initialProducts,
  isSubmitting,
  onClose,
  onSave,
}: Props) {
  const [rows, setRows] = useState<ProductRow[]>(() =>
    initialProducts.length
      ? initialProducts.map((product, index) => ({
          id: index + 1,
          productId: product._id,
        }))
      : [{ id: 1, productId: '' }],
  )
  const [editingRowId, setEditingRowId] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [isDiscardConfirmOpen, setIsDiscardConfirmOpen] = useState(false)
  const [knownProductsById, setKnownProductsById] = useState<Map<string, ProductSummary>>(
    () =>
      new Map(
        initialProducts.map((product) => [product._id, buildSummaryFromOrderProduct(product)]),
      ),
  )
  const nextRowId = useRef(initialProducts.length > 0 ? initialProducts.length + 1 : 2)

  const initialProductsById = useMemo(
    () =>
      new Map(
        initialProducts.map((product) => [product._id, buildSummaryFromOrderProduct(product)]),
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

  const currentProductIds = useMemo(
    () => rows.map((row) => row.productId).filter(Boolean),
    [rows],
  )
  const initialProductIds = useMemo(
    () => initialProducts.map((product) => product._id),
    [initialProducts],
  )

  const optionsQuery = useOrderProductOptionsQuery(debouncedSearch, editingRowId !== null)
  const options = optionsQuery.data?.Products ?? []

  const { unavailableIds, isLoading: isAvailabilityLoading } = useOrderProductsAvailability(
    currentProductIds,
    true,
  )

  const canRemoveRow = rows.length > 1
  const hasEmptyRows = rows.some((row) => !row.productId)
  const hasUnavailableRows = rows.some((row) => row.productId && unavailableIds.has(row.productId))
  const hasChanges = !areEqualProductMultiset(initialProductIds, currentProductIds)
  const canAddRow = rows.length < ORDER_DETAILS_EDIT_PRODUCTS_MAX_ROWS && !hasEmptyRows
  const isSaveDisabled =
    isSubmitting || isAvailabilityLoading || hasEmptyRows || hasUnavailableRows || !hasChanges
  const saveDisabledReason = isSubmitting
    ? null
    : isAvailabilityLoading
      ? ordersUiText.dialogs.details.editProductsDisabledReasonCheckingAvailability
      : hasUnavailableRows
        ? ordersUiText.dialogs.details.editProductsDisabledReasonUnavailable
        : hasEmptyRows
          ? ordersUiText.dialogs.details.editProductsDisabledReasonEmptyRows
          : !hasChanges
            ? ordersUiText.dialogs.details.editProductsDisabledReasonNoChanges
            : null

  const totalPrice = useMemo(() => {
    return rows.reduce((sum, row) => {
      if (!row.productId) return sum
      const known = knownProductsById.get(row.productId) ?? initialProductsById.get(row.productId)
      return known ? sum + known.price : sum
    }, 0)
  }, [initialProductsById, knownProductsById, rows])

  const handleAddRow = () => {
    if (!canAddRow || isSubmitting) return
    const nextId = nextRowId.current
    nextRowId.current += 1

    setRows((current) => [...current, { id: nextId, productId: '' }])
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
    if (isSubmitting) return
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
            <Stack spacing={1.25} data-testid="order-details-products-edit-selected-rows-section">
              <Typography variant="subtitle2">
                {ordersUiText.dialogs.details.editProductsLabel}
              </Typography>

              {rows.map((row, index) => {
                const isActive = editingRowId === row.id
                const isUnavailable = Boolean(row.productId) && unavailableIds.has(row.productId)
                return (
                  <Paper
                    key={row.id}
                    variant="outlined"
                    onClick={() => handleActivateRow(row.id)}
                    sx={{
                      p: 1.25,
                      cursor: isSubmitting ? 'default' : 'pointer',
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
                    <Stack direction="row" spacing={1} alignItems="flex-start">
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
                            data-testid={`order-details-products-edit-row-${index}-unavailable`}
                          >
                            {ordersUiText.dialogs.details.editProductsUnavailable}
                          </Typography>
                        ) : null}
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

              {canAddRow ? (
                <Button
                  variant="outlined"
                  startIcon={<AddRoundedIcon />}
                  onClick={handleAddRow}
                  disabled={isSubmitting}
                  sx={{ alignSelf: 'flex-start' }}
                  data-testid="order-details-products-edit-add-product-button"
                >
                  {ordersUiText.dialogs.details.editProductsAdd}
                </Button>
              ) : null}
            </Stack>

            <Stack spacing={1.25}>
              {activeRow ? (
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
              {formatPrice(totalPrice)}
            </Typography>
          </Stack>

          <Stack direction="row" spacing={1}>
            <Button
              variant="contained"
              onClick={() => void onSave(currentProductIds)}
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
