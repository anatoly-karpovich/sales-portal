import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import { memo, useCallback, useMemo, useRef, useState } from 'react'
import type { CreateOrderPayload } from '@/api/modules/orders.api'
import type { Customer } from '@/api/modules/customers.api'
import type { Product } from '@/api/modules/products.api'
import { ordersUiText } from '@/features/orders/orders.ui-text'

const MAX_PRODUCTS_ROWS = 5
const SELECT_MENU_PROPS = { transitionDuration: 0 } as const

type ProductRow = {
  id: number
  productId: string
}

type Props = {
  open: boolean
  customers: Customer[]
  products: Product[]
  isSubmitting: boolean
  onClose: () => void
  onSubmit: (payload: CreateOrderPayload) => Promise<void>
}

type ProductSelectRowProps = {
  rowId: number
  rowIndex: number
  value: string
  products: Product[]
  selectedProduct: Product | undefined
  isOpen: boolean
  canRemoveProduct: boolean
  isSubmitting: boolean
  onChange: (rowId: number, value: string) => void
  onRemove: (rowId: number) => void
  onOpen: (rowId: number) => void
  onClose: () => void
}

const ProductSelectRow = memo(function ProductSelectRow({
  rowId,
  rowIndex,
  value,
  products,
  selectedProduct,
  isOpen,
  canRemoveProduct,
  isSubmitting,
  onChange,
  onRemove,
  onOpen,
  onClose,
}: ProductSelectRowProps) {
  return (
    <Stack
      direction="row"
      spacing={1}
      alignItems="center"
      data-testid={`orders-create-product-row-${rowIndex}`}
    >
      <TextField
        select
        fullWidth
        label={ordersUiText.dialogs.createOrderProductLabel}
        value={value}
        onChange={(event) => onChange(rowId, event.target.value)}
        data-testid={`orders-create-product-select-${rowIndex}`}
        SelectProps={{
          inputProps: { 'data-testid': `orders-create-product-select-${rowIndex}-field` },
          open: isOpen,
          onOpen: () => onOpen(rowId),
          onClose,
          MenuProps: SELECT_MENU_PROPS,
        }}
      >
        <MenuItem value="" disabled id={`orders-create-product-option-${rowIndex}-placeholder`}>
          Select product
        </MenuItem>
        {!isOpen && value && selectedProduct ? (
          <MenuItem
            value={selectedProduct._id}
            id={`orders-create-product-select-${rowIndex}-selected-option`}
            data-testid={`orders-create-product-select-${rowIndex}-selected-option`}
          >
            {selectedProduct.name}
          </MenuItem>
        ) : null}
        {isOpen
          ? products.map((product) => (
              <MenuItem
                key={product._id}
                value={product._id}
                id={`orders-create-product-select-${rowIndex}-option-${product._id}`}
                data-testid={`orders-create-product-select-${rowIndex}-option-${product._id}`}
              >
                {product.name}
              </MenuItem>
            ))
          : null}
      </TextField>
      {canRemoveProduct ? (
        <IconButton
          color="error"
          onClick={() => onRemove(rowId)}
          disabled={isSubmitting}
          data-testid={`orders-create-product-remove-button-${rowIndex}`}
        >
          <DeleteOutlineOutlinedIcon fontSize="small" />
        </IconButton>
      ) : (
        <Box sx={{ width: 40 }} />
      )}
    </Stack>
  )
})

export function CreateOrderDialog({
  open,
  customers,
  products,
  isSubmitting,
  onClose,
  onSubmit,
}: Props) {
  const [customerId, setCustomerId] = useState('')
  const [productRows, setProductRows] = useState<ProductRow[]>([{ id: 1, productId: '' }])
  const [isCustomerMenuOpen, setIsCustomerMenuOpen] = useState(false)
  const [openProductMenuRowId, setOpenProductMenuRowId] = useState<number | null>(null)
  const nextRowId = useRef(2)

  const productsById = useMemo(() => {
    return new Map(products.map((product) => [product._id, product]))
  }, [products])

  const selectedProductIds = useMemo(() => productRows.map((row) => row.productId), [productRows])
  const customersById = useMemo(
    () => new Map(customers.map((customer) => [customer._id, customer])),
    [customers],
  )
  const selectedCustomer = customerId ? customersById.get(customerId) : undefined

  const totalPrice = useMemo(() => {
    return selectedProductIds.reduce((sum, productId) => {
      const selectedProduct = productsById.get(productId)
      return selectedProduct ? sum + selectedProduct.price : sum
    }, 0)
  }, [productsById, selectedProductIds])

  const canAddProduct = productRows.length < MAX_PRODUCTS_ROWS
  const canRemoveProduct = productRows.length > 1
  const hasValidCustomer = Boolean(customerId)
  const hasSelectedProducts =
    productRows.length > 0 && productRows.every((row) => Boolean(row.productId))
  const canSubmit = hasValidCustomer && hasSelectedProducts && !isSubmitting

  const addProductRow = useCallback(() => {
    setProductRows((current) => {
      if (current.length >= MAX_PRODUCTS_ROWS) return current
      const newRow = { id: nextRowId.current, productId: '' }
      nextRowId.current += 1
      return [...current, newRow]
    })
  }, [])

  const removeProductRow = useCallback((rowId: number) => {
    setProductRows((current) => {
      if (current.length <= 1) return current
      return current.filter((row) => row.id !== rowId)
    })
    setOpenProductMenuRowId((current) => (current === rowId ? null : current))
  }, [])

  const updateProduct = useCallback((rowId: number, value: string) => {
    setProductRows((current) =>
      current.map((row) => (row.id === rowId ? { ...row, productId: value } : row)),
    )
  }, [])

  const submit = async () => {
    if (!canSubmit) return
    await onSubmit({
      customer: customerId,
      products: selectedProductIds,
    })
    setCustomerId('')
    setProductRows([{ id: nextRowId.current, productId: '' }])
    setIsCustomerMenuOpen(false)
    setOpenProductMenuRowId(null)
    nextRowId.current += 1
  }

  const openProductMenu = useCallback((rowId: number) => {
    setOpenProductMenuRowId(rowId)
  }, [])

  const closeProductMenu = useCallback(() => {
    setOpenProductMenuRowId(null)
  }, [])

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
          <TextField
            select
            label={ordersUiText.dialogs.createOrderCustomerLabel}
            value={customerId}
            onChange={(event) => setCustomerId(event.target.value)}
            data-testid="orders-create-customer-select"
            SelectProps={{
              inputProps: { 'data-testid': 'orders-create-customer-select-field' },
              open: isCustomerMenuOpen,
              onOpen: () => setIsCustomerMenuOpen(true),
              onClose: () => setIsCustomerMenuOpen(false),
              MenuProps: SELECT_MENU_PROPS,
            }}
          >
            <MenuItem value="" disabled id="orders-create-customer-option-placeholder">
              Select customer
            </MenuItem>
            {!isCustomerMenuOpen && customerId && selectedCustomer ? (
              <MenuItem
                value={selectedCustomer._id}
                title={selectedCustomer.email}
                id="orders-create-customer-selected-option"
                data-testid="orders-create-customer-selected-option"
              >
                {selectedCustomer.name}
              </MenuItem>
            ) : null}
            {isCustomerMenuOpen
              ? customers.map((customer) => (
                  <MenuItem
                    key={customer._id}
                    value={customer._id}
                    title={customer.email}
                    id={`orders-create-customer-option-${customer._id}`}
                    data-testid={`orders-create-customer-option-${customer._id}`}
                  >
                    {customer.name}
                  </MenuItem>
                ))
              : null}
          </TextField>

          <Stack spacing={1.25} data-testid="orders-create-products-section">
            <Typography variant="subtitle2">
              {ordersUiText.dialogs.createOrderProductsTitle}
            </Typography>
            {productRows.map((row, index) => (
              <ProductSelectRow
                key={row.id}
                rowId={row.id}
                rowIndex={index}
                value={row.productId}
                products={products}
                selectedProduct={productsById.get(row.productId)}
                isOpen={openProductMenuRowId === row.id}
                canRemoveProduct={canRemoveProduct}
                isSubmitting={isSubmitting}
                onChange={updateProduct}
                onRemove={removeProductRow}
                onOpen={openProductMenu}
                onClose={closeProductMenu}
              />
            ))}

            {canAddProduct ? (
              <Button
                variant="outlined"
                startIcon={<AddRoundedIcon />}
                onClick={addProductRow}
                disabled={isSubmitting}
                sx={{ alignSelf: 'flex-start' }}
                data-testid="orders-create-add-product-button"
              >
                {ordersUiText.dialogs.createOrderAddProductButton}
              </Button>
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
            ${totalPrice}
          </Typography>
        </Stack>
        <Button
          variant="contained"
          onClick={() => void submit()}
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
