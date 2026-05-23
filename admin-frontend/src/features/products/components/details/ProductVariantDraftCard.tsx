import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined'
import ErrorOutlineOutlinedIcon from '@mui/icons-material/ErrorOutlineOutlined'
import { Box, Chip, IconButton, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material'
import { memo, useState } from 'react'
import type { AttributeDraft, VariantDraft } from '@/features/products/forms/productVariantsDraft'
import { validatePrice } from '@/features/products/forms/productVariantsDraft'
import { productsUiText } from '@/features/products/products.ui-text'

type Props = {
  index: number
  variant: VariantDraft
  attributes: AttributeDraft[]
  combinationError: string
  committedPriceError: string
  isInteractionsLocked: boolean
  canDelete: boolean
  onDelete: (variantDraftId: string) => void
  onChangeAttribute: (variantDraftId: string, attributeId: string, value: string) => void
  onChangeImageUrl: (variantDraftId: string, imageUrl: string) => void
  onCommitPrice: (variantDraftId: string, price: string) => void
}

export const ProductVariantDraftCard = memo(function ProductVariantDraftCard({
  index,
  variant,
  attributes,
  combinationError,
  committedPriceError,
  isInteractionsLocked,
  canDelete,
  onDelete,
  onChangeAttribute,
  onChangeImageUrl,
  onCommitPrice,
}: Props) {
  const [localPrice, setLocalPrice] = useState(() => variant.price)

  const localPriceError = validatePrice(localPrice)
  const finalPriceError = localPriceError || committedPriceError
  const isPriceError =
    finalPriceError === productsUiText.detailsPage.validation.priceGreaterThanZero ||
    finalPriceError === productsUiText.detailsPage.validation.priceMaxDecimals
  const isDuplicateCombinationError =
    combinationError === productsUiText.detailsPage.validation.duplicateVariantCombination

  const commitPrice = () => {
    if (localPrice === variant.price) return
    onCommitPrice(variant.id, localPrice)
  }

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 1.5,
        borderColor: combinationError || finalPriceError ? 'error.main' : 'divider',
      }}
    >
      <Stack spacing={1.25}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Variant #{index + 1}
            </Typography>
            <Chip size="small" label={variant.status} variant="outlined" />
          </Stack>
          <Stack direction="row" spacing={0.75} alignItems="center" sx={{ flex: 1, minWidth: 0 }}>
            <Box
              sx={{
                flex: 1,
                minWidth: 0,
                display: 'flex',
                justifyContent: 'flex-start',
                alignItems: 'center',
                minHeight: 20,
              }}
            >
              {combinationError ? (
                <Stack direction="row" spacing={0.5} alignItems="center" sx={{ minWidth: 0 }}>
                  <Box sx={{ width: 4, flexShrink: 0 }} />
                  <ErrorOutlineOutlinedIcon sx={{ color: 'error.main', fontSize: 18 }} />
                  <Typography variant="body2" color="error.main" noWrap title={combinationError}>
                    {combinationError}
                  </Typography>
                </Stack>
              ) : null}
            </Box>
            <IconButton
              color="error"
              disabled={!canDelete || isInteractionsLocked}
              onClick={() => onDelete(variant.id)}
            >
              <DeleteOutlineOutlinedIcon fontSize="small" />
            </IconButton>
          </Stack>
        </Stack>

        <Box
          sx={{
            display: 'grid',
            gap: 1.25,
            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          }}
        >
          {attributes.map((attribute) => (
            <TextField
              key={`${variant.id}-${attribute.id}`}
              label={`${attribute.name.trim() || productsUiText.detailsPage.labels.attributeFallback}*`}
              select
              error={isDuplicateCombinationError}
              value={variant.attributesByAttributeId[attribute.id] ?? ''}
              onChange={(event) => onChangeAttribute(variant.id, attribute.id, event.target.value)}
            >
              <MenuItem value="">{productsUiText.detailsPage.labels.selectValue}</MenuItem>
              {attribute.values.map((value) => (
                <MenuItem key={`${attribute.id}-${value}`} value={value}>
                  {value}
                </MenuItem>
              ))}
            </TextField>
          ))}

          <TextField
            label={productsUiText.detailsPage.labels.price}
            value={localPrice}
            error={isPriceError}
            onChange={(event) => setLocalPrice(event.target.value)}
            onBlur={commitPrice}
            onKeyDown={(event) => {
              if (event.key !== 'Enter') return
              event.preventDefault()
              commitPrice()
            }}
            inputProps={{ inputMode: 'decimal' }}
          />

          <TextField
            label={productsUiText.detailsPage.labels.variantImageUrl}
            value={variant.imageUrl}
            onChange={(event) => onChangeImageUrl(variant.id, event.target.value)}
          />
        </Box>
      </Stack>
    </Paper>
  )
})
