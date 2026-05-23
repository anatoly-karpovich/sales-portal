import { Box, Button, MenuItem, Stack, TextField } from '@mui/material'
import {
  getProductImageUrlError,
  getProductNameError,
} from '@/features/products/forms/productParentValidation'
import type { ProductVariantsDraft } from '@/features/products/forms/productVariantsDraft'
import { isValidHttpUrl } from '@/features/products/forms/productVariantsDraft'
import { productsUiText } from '@/features/products/products.ui-text'

type Props = {
  draft: ProductVariantsDraft
  manufacturerOptions: string[]
  isParentIdentityEditable: boolean
  isParentImageValid: boolean
  canSaveInfo: boolean
  isInteractionsLocked: boolean
  onChangeField: (
    field: 'name' | 'manufacturer' | 'description' | 'imageUrl',
    value: string,
  ) => void
  onSave: () => void
  onCancel: () => void
}

export function ProductInfoEditForm({
  draft,
  manufacturerOptions,
  isParentIdentityEditable,
  isParentImageValid,
  canSaveInfo,
  isInteractionsLocked,
  onChangeField,
  onSave,
  onCancel,
}: Props) {
  const nameError = getProductNameError(draft.name)
  const imageUrlError = getProductImageUrlError(draft.imageUrl, isValidHttpUrl)

  return (
    <Stack spacing={1.5}>
      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
        }}
      >
        <TextField
          label={productsUiText.detailsPage.labels.name}
          value={draft.name}
          error={Boolean(nameError)}
          helperText={nameError || ' '}
          disabled={!isParentIdentityEditable}
          slotProps={{ input: { readOnly: !isParentIdentityEditable } }}
          onChange={(event) => onChangeField('name', event.target.value)}
        />
        <TextField
          label={productsUiText.detailsPage.labels.manufacturer}
          select
          value={draft.manufacturer}
          disabled={!isParentIdentityEditable}
          onChange={(event) => onChangeField('manufacturer', event.target.value)}
        >
          {manufacturerOptions.map((item) => (
            <MenuItem key={item} value={item}>
              {item}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          label={productsUiText.detailsPage.labels.parentImageUrl}
          value={draft.imageUrl}
          error={Boolean(imageUrlError) || !isParentImageValid}
          helperText={
            imageUrlError ||
            (!isParentImageValid ? productsUiText.detailsPage.validation.parentImageUrlInvalid : ' ')
          }
          onChange={(event) => onChangeField('imageUrl', event.target.value)}
        />
      </Box>

      <TextField
        label={productsUiText.detailsPage.labels.description}
        value={draft.description}
        multiline
        minRows={3}
        onChange={(event) => onChangeField('description', event.target.value)}
      />

      <Stack direction="row" spacing={1}>
        <Button
          variant="contained"
          disabled={!canSaveInfo}
          onClick={onSave}
          data-testid="product-details-page-save-product-button"
        >
          {productsUiText.detailsPage.actions.saveProduct}
        </Button>
        <Button
          onClick={onCancel}
          disabled={isInteractionsLocked}
          data-testid="product-details-page-cancel-product-edit-button"
        >
          {productsUiText.detailsPage.actions.cancel}
        </Button>
      </Stack>
    </Stack>
  )
}
