import { Box, Button, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material'
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded'
import { Link } from 'react-router-dom'
import { useMemo, useState } from 'react'
import type { Product, ProductUpsertPayload } from '@/api/modules/products.api'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { useManufacturerOptions } from '@/features/products/hooks/useManufacturerOptions'
import {
  toProductFormInitialState,
  toProductFormTouchedState,
  toProductUpsertPayload,
} from '@/features/products/forms/productForm.mappers'
import type { ProductFormTouchedState } from '@/features/products/forms/productForm.types'
import { validateProductForm } from '@/features/products/forms/productForm.validators'
import { getDeleteProductMessage, getProductFormTitle, productsUiText } from '@/features/products/products.ui-text'

type Mode = 'create' | 'edit'

type Props = {
  mode: Mode
  product: Product | null
  isSubmitting: boolean
  isDeleting?: boolean
  onSubmit: (payload: ProductUpsertPayload) => Promise<void>
  onDelete?: () => Promise<void>
}

export function ProductForm({ mode, product, isSubmitting, isDeleting = false, onSubmit, onDelete }: Props) {
  const manufacturerOptions = useManufacturerOptions()
  const [formState, setFormState] = useState(() => toProductFormInitialState(product))
  const [touched, setTouched] = useState<ProductFormTouchedState>(toProductFormTouchedState())
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const initialState = useMemo(() => toProductFormInitialState(product), [product])
  const initialPayload = useMemo(() => toProductUpsertPayload(initialState), [initialState])
  const validation = useMemo(() => validateProductForm(formState), [formState])

  const hasAnyChanges = useMemo(() => {
    const currentPayload = toProductUpsertPayload(formState)
    return JSON.stringify(currentPayload) !== JSON.stringify(initialPayload)
  }, [formState, initialPayload])

  const canSubmit =
    !validation.nameError &&
    !validation.amountError &&
    !validation.priceError &&
    !validation.manufacturerError &&
    !validation.notesError &&
    hasAnyChanges &&
    !isSubmitting

  const markTouched = (field: keyof ProductFormTouchedState) => {
    setTouched((current) => ({ ...current, [field]: true }))
  }

  const resetToInitial = () => {
    setFormState(initialState)
    setTouched(toProductFormTouchedState())
  }

  const submit = async () => {
    await onSubmit(toProductUpsertPayload(formState))
  }

  const confirmDelete = async () => {
    if (!onDelete) return
    await onDelete()
  }

  return (
    <Paper sx={{ p: { xs: 2, md: 3 } }} data-testid={`products-upsert-form-${mode}`}>
      <Stack spacing={2.5} data-testid="products-upsert-form-content">
        <Button
          component={Link}
          to="/products"
          variant="text"
          startIcon={<ArrowBackRoundedIcon fontSize="small" />}
          sx={{ alignSelf: 'flex-start', px: 0, textTransform: 'none' }}
          data-testid="products-upsert-back-to-list-link"
        >
          {productsUiText.form.backToProducts}
        </Button>

        <Typography variant="h4" sx={{ fontWeight: 700 }} data-testid="products-upsert-form-title">
          {getProductFormTitle(mode, product?.name)}
        </Typography>

        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }} data-testid="products-upsert-form-grid-fields">
          <TextField
            label={productsUiText.form.fields.name}
            value={formState.name}
            onChange={(event) => setFormState((current) => ({ ...current, name: event.target.value }))}
            onBlur={() => markTouched('name')}
            error={touched.name && Boolean(validation.nameError)}
            helperText={touched.name ? (validation.nameError ?? ' ') : ' '}
            data-testid="products-upsert-name-input"
            inputProps={{ 'data-testid': 'products-upsert-name-input-field' }}
          />

          <TextField
            label={productsUiText.form.fields.manufacturer}
            select
            value={formState.manufacturer}
            onChange={(event) => setFormState((current) => ({ ...current, manufacturer: event.target.value }))}
            onBlur={() => markTouched('manufacturer')}
            error={touched.manufacturer && Boolean(validation.manufacturerError)}
            helperText={touched.manufacturer ? (validation.manufacturerError ?? ' ') : ' '}
            data-testid="products-upsert-manufacturer-select"
            SelectProps={{ inputProps: { 'data-testid': 'products-upsert-manufacturer-select-field' } }}
          >
            {manufacturerOptions.map((item) => (
              <MenuItem key={item} value={item} data-testid={`products-upsert-manufacturer-option-${item.toLowerCase().replace(/\s+/g, '-')}`}>
                {item}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label={productsUiText.form.fields.price}
            value={formState.price}
            type="number"
            onChange={(event) => setFormState((current) => ({ ...current, price: event.target.value }))}
            onBlur={() => markTouched('price')}
            error={touched.price && Boolean(validation.priceError)}
            helperText={touched.price ? (validation.priceError ?? ' ') : ' '}
            data-testid="products-upsert-price-input"
            inputProps={{ 'data-testid': 'products-upsert-price-input-field' }}
          />

          <TextField
            label={productsUiText.form.fields.amount}
            value={formState.amount}
            type="number"
            onChange={(event) => setFormState((current) => ({ ...current, amount: event.target.value }))}
            onBlur={() => markTouched('amount')}
            error={touched.amount && Boolean(validation.amountError)}
            helperText={touched.amount ? (validation.amountError ?? ' ') : ' '}
            data-testid="products-upsert-amount-input"
            inputProps={{ 'data-testid': 'products-upsert-amount-input-field' }}
          />
        </Box>

        <TextField
          label={productsUiText.form.fields.notes}
          value={formState.notes}
          multiline
          minRows={4}
          onChange={(event) => setFormState((current) => ({ ...current, notes: event.target.value }))}
          onBlur={() => markTouched('notes')}
          error={touched.notes && Boolean(validation.notesError)}
          helperText={touched.notes ? (validation.notesError ?? ' ') : ' '}
          data-testid="products-upsert-notes-input"
          inputProps={{ 'data-testid': 'products-upsert-notes-input-field' }}
        />

        <Stack direction="row" justifyContent="space-between" alignItems="center" data-testid="products-upsert-form-actions">
          <Button variant="contained" onClick={() => void submit()} disabled={!canSubmit} data-testid="products-upsert-save-button">
            {mode === 'create' ? productsUiText.form.actions.saveCreate : productsUiText.form.actions.saveEdit}
          </Button>
          {mode === 'create' ? (
            <Button onClick={resetToInitial} data-testid="products-upsert-clear-button">{productsUiText.form.actions.clear}</Button>
          ) : (
            <Button color="error" variant="contained" onClick={() => setDeleteDialogOpen(true)} data-testid="products-upsert-delete-button">
              {productsUiText.form.actions.delete}
            </Button>
          )}
        </Stack>
      </Stack>

      <ConfirmDialog
        open={deleteDialogOpen}
        title={productsUiText.dialogs.deleteTitle}
        message={getDeleteProductMessage(product?.name)}
        confirmLabel={productsUiText.dialogs.deleteConfirm}
        cancelLabel={productsUiText.dialogs.cancel}
        isSubmitting={isDeleting}
        onCancel={() => {
          if (isDeleting) return
          setDeleteDialogOpen(false)
        }}
        onConfirm={confirmDelete}
      />
    </Paper>
  )
}
