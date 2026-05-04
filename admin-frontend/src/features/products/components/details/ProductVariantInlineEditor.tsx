import { Box, Button, MenuItem, Stack, TextField } from '@mui/material'
import type { ProductAttribute } from '@/api/modules/products.api'
import { productsUiText } from '@/features/products/products.ui-text'

type Props = {
  attributes: ProductAttribute[]
  draft: {
    price: string
    imageUrl: string
    attributes: Record<string, string>
  }
  error: string
  isInteractionsLocked: boolean
  canSave: boolean
  onChangeAttribute: (attributeKey: string, value: string) => void
  onChangePrice: (value: string) => void
  onChangeImageUrl: (value: string) => void
  onSave: () => void
  onCancel: () => void
}

export function ProductVariantInlineEditor({
  attributes,
  draft,
  error,
  isInteractionsLocked,
  canSave,
  onChangeAttribute,
  onChangePrice,
  onChangeImageUrl,
  onSave,
  onCancel,
}: Props) {
  const isPriceError =
    error === 'Price should be greater than 0.' || error === 'Price can have max 2 decimal places.'
  const isDuplicateCombinationError =
    error === 'Variant with this attribute combination already exists.'

  return (
    <Stack spacing={1.25}>
      <Box
        sx={{
          display: 'grid',
          gap: 1.25,
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
        }}
      >
        {attributes.map((attribute) => (
          <TextField
            key={attribute.key}
            label={`${attribute.name}*`}
            select
            error={isDuplicateCombinationError}
            value={draft.attributes[attribute.key] ?? ''}
            onChange={(event) => onChangeAttribute(attribute.key, event.target.value)}
          >
            <MenuItem value="">Select value</MenuItem>
            {attribute.values.map((value) => (
              <MenuItem key={`${attribute.key}-${value}`} value={value}>
                {value}
              </MenuItem>
            ))}
          </TextField>
        ))}

        <TextField
          label="Price"
          value={draft.price}
          error={isPriceError}
          onChange={(event) => onChangePrice(event.target.value)}
          inputProps={{ inputMode: 'decimal' }}
        />

        <TextField
          label="Variant image URL"
          value={draft.imageUrl}
          onChange={(event) => onChangeImageUrl(event.target.value)}
        />
      </Box>

      <Stack direction="row" spacing={1}>
        <Button variant="contained" disabled={!canSave} onClick={onSave}>
          {productsUiText.detailsPage.actions.saveVariant}
        </Button>
        <Button disabled={isInteractionsLocked} onClick={onCancel}>
          {productsUiText.detailsPage.actions.cancel}
        </Button>
      </Stack>
    </Stack>
  )
}
