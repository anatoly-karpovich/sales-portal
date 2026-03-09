import { Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, MenuItem, Stack, TextField } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import { useMemo, useState } from 'react'
import { MANUFACTURERS } from '@/constants/dictionaries'
import type { Product, ProductUpsertPayload } from '@/api/modules/products.api'

type Props = {
  open: boolean
  mode: 'create' | 'edit'
  product: Product | null
  isSubmitting: boolean
  onClose: () => void
  onSubmit: (payload: ProductUpsertPayload) => Promise<void>
}

type ProductFormState = {
  name: string
  amount: string
  price: string
  manufacturer: string
  notes: string
}

type TouchedState = {
  name: boolean
  amount: boolean
  price: boolean
  manufacturer: boolean
  notes: boolean
}

function toTouchedState(value = false): TouchedState {
  return {
    name: value,
    amount: value,
    price: value,
    manufacturer: value,
    notes: value,
  }
}

function toInitialState(product: Product | null): ProductFormState {
  if (!product) {
    return {
      name: '',
      amount: '',
      price: '',
      manufacturer: MANUFACTURERS[0],
      notes: '',
    }
  }

  return {
    name: product.name ?? '',
    amount: String(product.amount ?? ''),
    price: String(product.price ?? ''),
    manufacturer: product.manufacturer ?? MANUFACTURERS[0],
    notes: product.notes ?? '',
  }
}

function buildPayload(state: ProductFormState): ProductUpsertPayload {
  return {
    name: state.name.trim(),
    amount: Number(state.amount),
    price: Number(state.price),
    manufacturer: state.manufacturer,
    notes: state.notes.trim(),
  }
}

export function ProductFormDialog({ open, mode, product, isSubmitting, onClose, onSubmit }: Props) {
  const [state, setState] = useState<ProductFormState>(toInitialState(product))
  const [touched, setTouched] = useState<TouchedState>(toTouchedState())

  const initialState = useMemo(() => toInitialState(product), [product])
  const initialPayload = useMemo(() => buildPayload(initialState), [initialState])

  const validation = useMemo(() => {
    const name = state.name.trim()
    const nameIsValid = /^\b(?!.*?\s{2})[A-Za-z0-9 ]{3,40}\b$/m.test(name)

    const amount = Number(state.amount)
    const amountIsIntegerText = /^[0-9]{1,3}$/m.test(state.amount.trim())

    const price = Number(state.price)
    const priceIsIntegerText = /^[0-9]{1,5}$/m.test(state.price.trim())

    const notes = state.notes.trim()
    const notesIsValid = /^[^<>]{0,250}$/m.test(notes)

    const manufacturerIsValid = MANUFACTURERS.includes(state.manufacturer as (typeof MANUFACTURERS)[number])

    return {
      nameError: name.length === 0 ? 'Name is required' : nameIsValid ? null : 'Name must be 3-40 alphanumeric characters with single spaces',
      amountError:
        state.amount.trim().length === 0 || Number.isNaN(amount) || !Number.isFinite(amount) || !amountIsIntegerText || amount < 0 || amount > 999
          ? 'Amount must be in range 0-999'
          : null,
      priceError:
        state.price.trim().length === 0 || Number.isNaN(price) || !Number.isFinite(price) || !priceIsIntegerText || price < 1 || price > 99999
          ? 'Price must be in range 1-99999'
          : null,
      manufacturerError: manufacturerIsValid ? null : 'Manufacturer is required',
      notesError: notesIsValid ? null : 'Notes must be up to 250 chars and cannot contain < or >',
    }
  }, [state.amount, state.manufacturer, state.name, state.notes, state.price])

  const hasAnyChanges = useMemo(() => {
    const currentPayload = buildPayload(state)
    return JSON.stringify(currentPayload) !== JSON.stringify(initialPayload)
  }, [initialPayload, state])

  const canSubmit =
    !validation.nameError &&
    !validation.amountError &&
    !validation.priceError &&
    !validation.manufacturerError &&
    !validation.notesError &&
    hasAnyChanges

  const title = mode === 'create' ? 'Add New Product' : `Edit: ${product?.name ?? 'Product'}`

  const markTouched = (field: keyof TouchedState) => {
    setTouched((current) => ({ ...current, [field]: true }))
  }

  const resetToInitial = () => {
    setState(initialState)
    setTouched(toTouchedState())
  }

  return (
    <Dialog
      open={open}
      onClose={isSubmitting ? undefined : onClose}
      fullWidth
      maxWidth="sm"
      TransitionProps={{
        onEnter: () => {
          setState(initialState)
          setTouched(toTouchedState())
        },
      }}
    >
      <DialogTitle sx={{ pr: 6 }}>
        {title}
        <IconButton
          aria-label="close"
          onClick={onClose}
          disabled={isSubmitting}
          sx={{ position: 'absolute', right: 16, top: 12 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ px: 3 }}>
        <Stack spacing={2}>
          <TextField
            label="Name"
            value={state.name}
            onChange={(event) => {
              const nextValue = event.target.value
              setState((current) => ({ ...current, name: nextValue }))
              if (state.name.trim().length > 0 && nextValue.trim().length === 0) {
                markTouched('name')
              }
            }}
            onBlur={() => markTouched('name')}
            error={touched.name && Boolean(validation.nameError)}
            helperText={touched.name ? (validation.nameError ?? ' ') : ' '}
            required
            autoFocus
          />

          <TextField
            label="Manufacturer"
            select
            value={state.manufacturer}
            onChange={(event) => {
              markTouched('manufacturer')
              setState((current) => ({ ...current, manufacturer: event.target.value }))
            }}
            onBlur={() => markTouched('manufacturer')}
            error={touched.manufacturer && Boolean(validation.manufacturerError)}
            helperText={touched.manufacturer ? (validation.manufacturerError ?? ' ') : ' '}
            required
          >
            {MANUFACTURERS.map((item) => (
              <MenuItem key={item} value={item}>
                {item}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="Price"
            type="number"
            value={state.price}
            onChange={(event) => {
              const nextValue = event.target.value
              setState((current) => ({ ...current, price: nextValue }))
              if (state.price.trim().length > 0 && nextValue.trim().length === 0) {
                markTouched('price')
              }
            }}
            onBlur={() => markTouched('price')}
            error={touched.price && Boolean(validation.priceError)}
            helperText={touched.price ? (validation.priceError ?? ' ') : ' '}
            required
            inputProps={{ min: 0, step: 1 }}
          />

          <TextField
            label="Amount"
            type="number"
            value={state.amount}
            onChange={(event) => {
              const nextValue = event.target.value
              setState((current) => ({ ...current, amount: nextValue }))
              if (state.amount.trim().length > 0 && nextValue.trim().length === 0) {
                markTouched('amount')
              }
            }}
            onBlur={() => markTouched('amount')}
            error={touched.amount && Boolean(validation.amountError)}
            helperText={touched.amount ? (validation.amountError ?? ' ') : ' '}
            required
            inputProps={{ min: 0, step: 1 }}
          />

          <TextField
            label="Notes"
            value={state.notes}
            onChange={(event) => {
              markTouched('notes')
              setState((current) => ({ ...current, notes: event.target.value }))
            }}
            onBlur={() => markTouched('notes')}
            error={touched.notes && Boolean(validation.notesError)}
            helperText={touched.notes ? (validation.notesError ?? ' ') : ' '}
            multiline
            minRows={3}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        {mode === 'create' ? (
          <Button onClick={resetToInitial} disabled={isSubmitting}>
            Clear all
          </Button>
        ) : null}
        <Box sx={{ flexGrow: 1 }} />
        <Button
          variant="contained"
          disabled={!canSubmit || isSubmitting}
          onClick={() => {
            void onSubmit(buildPayload(state))
          }}
        >
          {isSubmitting ? <CircularProgress size={18} color="inherit" /> : mode === 'create' ? 'Save New Product' : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
