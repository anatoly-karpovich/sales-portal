import { Box, Button, MenuItem, Paper, Skeleton, Stack, TextField, Typography } from '@mui/material'
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { useSnackbar } from 'notistack'
import { MANUFACTURERS } from '@/constants/dictionaries'
import type { Product, ProductUpsertPayload } from '@/api/modules/products.api'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import {
  useCreateProductMutation,
  useDeleteProductMutation,
  useProductQuery,
  useUpdateProductMutation,
} from '@/features/products/hooks/useProductsQuery'

type Mode = 'create' | 'edit'

type Props = {
  mode: Mode
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

function ProductUpsertSkeleton() {
  return (
    <Paper sx={{ p: { xs: 2, md: 3 } }}>
      <Stack spacing={2}>
        <Skeleton variant="text" width={120} height={24} />
        <Skeleton variant="text" width={260} height={50} />
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
          <Skeleton variant="rounded" height={72} />
          <Skeleton variant="rounded" height={72} />
          <Skeleton variant="rounded" height={72} />
          <Skeleton variant="rounded" height={72} />
        </Box>
        <Skeleton variant="rounded" height={140} />
        <Stack direction="row" justifyContent="space-between">
          <Skeleton variant="rounded" width={140} height={36} />
          <Skeleton variant="rounded" width={140} height={36} />
        </Stack>
      </Stack>
    </Paper>
  )
}

type ProductUpsertFormProps = {
  mode: Mode
  product: Product | null
  productId: string | null
}

function ProductUpsertForm({ mode, product, productId }: ProductUpsertFormProps) {
  const navigate = useNavigate()
  const { enqueueSnackbar } = useSnackbar()
  const [formState, setFormState] = useState<ProductFormState>(() => toInitialState(product))
  const [touched, setTouched] = useState<TouchedState>(toTouchedState())
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const createMutation = useCreateProductMutation()
  const updateMutation = useUpdateProductMutation()
  const deleteMutation = useDeleteProductMutation()

  const initialState = useMemo(() => toInitialState(product), [product])
  const initialPayload = useMemo(() => buildPayload(initialState), [initialState])

  const validation = useMemo(() => {
    const name = formState.name.trim()
    const nameIsValid = /^\b(?!.*?\s{2})[A-Za-z0-9 ]{3,40}\b$/m.test(name)

    const amount = Number(formState.amount)
    const amountIsIntegerText = /^[0-9]{1,3}$/m.test(formState.amount.trim())

    const price = Number(formState.price)
    const priceIsIntegerText = /^[0-9]{1,5}$/m.test(formState.price.trim())

    const notes = formState.notes.trim()
    const notesIsValid = /^[^<>]{0,250}$/m.test(notes)
    const manufacturerIsValid = MANUFACTURERS.includes(formState.manufacturer as (typeof MANUFACTURERS)[number])

    return {
      nameError: name.length === 0 ? 'Name is required' : nameIsValid ? null : 'Name must be 3-40 alphanumeric characters with single spaces',
      amountError:
        formState.amount.trim().length === 0 ||
        Number.isNaN(amount) ||
        !Number.isFinite(amount) ||
        !amountIsIntegerText ||
        amount < 0 ||
        amount > 999
          ? 'Amount must be in range 0-999'
          : null,
      priceError:
        formState.price.trim().length === 0 ||
        Number.isNaN(price) ||
        !Number.isFinite(price) ||
        !priceIsIntegerText ||
        price < 1 ||
        price > 99999
          ? 'Price must be in range 1-99999'
          : null,
      manufacturerError: manufacturerIsValid ? null : 'Manufacturer is required',
      notesError: notesIsValid ? null : 'Notes must be up to 250 chars and cannot contain < or >',
    }
  }, [formState])

  const hasAnyChanges = useMemo(() => {
    const currentPayload = buildPayload(formState)
    return JSON.stringify(currentPayload) !== JSON.stringify(initialPayload)
  }, [formState, initialPayload])

  const isSubmitting = createMutation.isPending || updateMutation.isPending
  const canSubmit =
    !validation.nameError &&
    !validation.amountError &&
    !validation.priceError &&
    !validation.manufacturerError &&
    !validation.notesError &&
    hasAnyChanges &&
    !isSubmitting

  const markTouched = (field: keyof TouchedState) => {
    setTouched((current) => ({ ...current, [field]: true }))
  }

  const resetToInitial = () => {
    setFormState(initialState)
    setTouched(toTouchedState())
  }

  const onSave = async () => {
    const payload = buildPayload(formState)
    if (mode === 'create') {
      await createMutation.mutateAsync(payload)
      enqueueSnackbar('Product was successfully created', { variant: 'success' })
      navigate('/products')
      return
    }

    if (!productId) return
    await updateMutation.mutateAsync({ productId, payload })
    enqueueSnackbar('Product was successfully updated', { variant: 'success' })
    navigate('/products')
  }

  return (
    <Paper sx={{ p: { xs: 2, md: 3 } }}>
      <Stack spacing={2.5}>
        <Button
          component={Link}
          to="/products"
          variant="text"
          startIcon={<ArrowBackRoundedIcon fontSize="small" />}
          sx={{ alignSelf: 'flex-start', px: 0, textTransform: 'none' }}
        >
          Products
        </Button>

        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          {mode === 'create' ? 'Add New Product' : `Edit ${product?.name ?? ''}`}
        </Typography>

        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
          <TextField
            label="Name*"
            value={formState.name}
            onChange={(event) => setFormState((current) => ({ ...current, name: event.target.value }))}
            onBlur={() => markTouched('name')}
            error={touched.name && Boolean(validation.nameError)}
            helperText={touched.name ? (validation.nameError ?? ' ') : ' '}
          />

          <TextField
            label="Manufacturer*"
            select
            value={formState.manufacturer}
            onChange={(event) => setFormState((current) => ({ ...current, manufacturer: event.target.value }))}
            onBlur={() => markTouched('manufacturer')}
            error={touched.manufacturer && Boolean(validation.manufacturerError)}
            helperText={touched.manufacturer ? (validation.manufacturerError ?? ' ') : ' '}
          >
            {MANUFACTURERS.map((item) => (
              <MenuItem key={item} value={item}>
                {item}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="Price*"
            value={formState.price}
            type="number"
            onChange={(event) => setFormState((current) => ({ ...current, price: event.target.value }))}
            onBlur={() => markTouched('price')}
            error={touched.price && Boolean(validation.priceError)}
            helperText={touched.price ? (validation.priceError ?? ' ') : ' '}
          />

          <TextField
            label="Amount*"
            value={formState.amount}
            type="number"
            onChange={(event) => setFormState((current) => ({ ...current, amount: event.target.value }))}
            onBlur={() => markTouched('amount')}
            error={touched.amount && Boolean(validation.amountError)}
            helperText={touched.amount ? (validation.amountError ?? ' ') : ' '}
          />
        </Box>

        <TextField
          label="Notes"
          value={formState.notes}
          multiline
          minRows={4}
          onChange={(event) => setFormState((current) => ({ ...current, notes: event.target.value }))}
          onBlur={() => markTouched('notes')}
          error={touched.notes && Boolean(validation.notesError)}
          helperText={touched.notes ? (validation.notesError ?? ' ') : ' '}
        />

        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Button variant="contained" onClick={() => void onSave()} disabled={!canSubmit}>
            {mode === 'create' ? 'Save New Product' : 'Save Changes'}
          </Button>
          {mode === 'create' ? (
            <Button onClick={resetToInitial}>Clear all</Button>
          ) : (
            <Button color="error" variant="contained" onClick={() => setDeleteDialogOpen(true)}>
              Delete Product
            </Button>
          )}
        </Stack>
      </Stack>

      <ConfirmDialog
        open={deleteDialogOpen}
        title="Delete Product"
        message={`Are you sure you want to delete "${product?.name ?? 'this product'}"?`}
        confirmLabel="Yes, Delete"
        cancelLabel="Cancel"
        isSubmitting={deleteMutation.isPending}
        onCancel={() => {
          if (deleteMutation.isPending) return
          setDeleteDialogOpen(false)
        }}
        onConfirm={async () => {
          if (!productId) return
          await deleteMutation.mutateAsync(productId)
          enqueueSnackbar('Product was successfully deleted', { variant: 'success' })
          navigate('/products')
        }}
      />
    </Paper>
  )
}

export function ProductUpsertPage({ mode }: Props) {
  const { productId } = useParams<{ productId: string }>()
  const shouldLoadProduct = mode === 'edit' && Boolean(productId)
  const { data: product, isLoading } = useProductQuery(productId ?? '', shouldLoadProduct)

  if (mode === 'create') {
    return <ProductUpsertForm mode="create" product={null} productId={null} />
  }

  if (!productId) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography color="error">Product id is missing.</Typography>
      </Paper>
    )
  }

  if (isLoading || !product) {
    return <ProductUpsertSkeleton />
  }

  return <ProductUpsertForm key={product._id} mode="edit" product={product} productId={productId} />
}
