import { Box, Button, MenuItem, Stack, TextField } from '@mui/material'
import type { ProductAttribute } from '@/api/modules/products.api'
import { productsUiText } from '@/features/products/products.ui-text'

type Props = {
  attributes: ProductAttribute[]
  isAttributesEditable: boolean
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
  isAttributesEditable,
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
    error === productsUiText.detailsPage.validation.priceGreaterThanZero ||
    error === productsUiText.detailsPage.validation.priceMaxDecimals
  const isDuplicateCombinationError =
    error === productsUiText.detailsPage.validation.duplicateVariantCombination

  return (
    <Stack spacing={1.25}>
      <Box
        sx={{
          display: 'grid',
          gap: 1.25,
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
        }}
      >
        {isAttributesEditable
          ? attributes.map((attribute) => (
              <TextField
                key={attribute.key}
                label={`${attribute.name}*`}
                select
                error={isDuplicateCombinationError}
                value={draft.attributes[attribute.key] ?? ''}
                onChange={(event) => onChangeAttribute(attribute.key, event.target.value)}
              >
                <MenuItem value="">{productsUiText.detailsPage.labels.selectValue}</MenuItem>
                {attribute.values.map((value) => (
                  <MenuItem key={`${attribute.key}-${value}`} value={value}>
                    {value}
                  </MenuItem>
                ))}
              </TextField>
            ))
          : null}

        <TextField
          label={productsUiText.detailsPage.labels.price}
          value={draft.price}
          error={isPriceError}
          onChange={(event) => onChangePrice(event.target.value)}
          inputProps={{ inputMode: 'decimal' }}
        />

        <TextField
          label={productsUiText.detailsPage.labels.variantImageUrl}
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
