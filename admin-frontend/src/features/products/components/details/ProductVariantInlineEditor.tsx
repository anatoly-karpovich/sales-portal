import { Box, Button, MenuItem, Stack, TextField } from '@mui/material'
import type { ProductAttribute } from '@/api/modules/products.api'
import { productsUiText } from '@/features/products/products.ui-text'

type Props = {
  attributes: ProductAttribute[]
  isAttributesEditable: boolean
  testIdPrefix: string
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
  testIdPrefix,
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
  const testId = (suffix: string) => `${testIdPrefix}-${suffix}`

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
                data-testid={testId(`attribute-${attribute.key}-select`)}
                SelectProps={{
                  inputProps: {
                    'data-testid': testId(`attribute-${attribute.key}-select-field`),
                  },
                }}
              >
                <MenuItem
                  value=""
                  data-testid={testId(`attribute-${attribute.key}-option-empty`)}
                >
                  {productsUiText.detailsPage.labels.selectValue}
                </MenuItem>
                {attribute.values.map((value) => (
                  <MenuItem
                    key={`${attribute.key}-${value}`}
                    value={value}
                    data-testid={testId(`attribute-${attribute.key}-option-${value}`)}
                  >
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
          data-testid={testId('price-input')}
          inputProps={{
            inputMode: 'decimal',
            'data-testid': testId('price-input-field'),
          }}
        />

        <TextField
          label={productsUiText.detailsPage.labels.variantImageUrl}
          value={draft.imageUrl}
          onChange={(event) => onChangeImageUrl(event.target.value)}
          data-testid={testId('image-url-input')}
          inputProps={{
            'data-testid': testId('image-url-input-field'),
          }}
        />
      </Box>

      <Stack direction="row" spacing={1}>
        <Button
          variant="contained"
          disabled={!canSave}
          onClick={onSave}
          data-testid={testId('save-button')}
        >
          {productsUiText.detailsPage.actions.saveVariant}
        </Button>
        <Button
          disabled={isInteractionsLocked}
          onClick={onCancel}
          data-testid={testId('cancel-button')}
        >
          {productsUiText.detailsPage.actions.cancel}
        </Button>
      </Stack>
    </Stack>
  )
}
