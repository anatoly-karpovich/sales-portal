import AddRoundedIcon from '@mui/icons-material/AddRounded'
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined'
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import type { ProductVariantsDraft } from '@/features/products/forms/productVariantsDraft'
import { productsUiText } from '@/features/products/products.ui-text'
import { ProductVariantDraftCard } from '@/features/products/components/details/ProductVariantDraftCard'

type Props = {
  draft: ProductVariantsDraft
  attributeErrors: Map<string, string>
  invalidVariantsCount: number
  hasReachedMaxVariants: boolean
  possibleCombinationsCount: number
  variantCombinationErrors: Map<string, string>
  variantPriceErrors: Map<string, string>
  isInteractionsLocked: boolean
  canSaveVariants: boolean
  onAddVariant: () => void
  onGenerateAllCombinations: () => void
  onRemoveInvalidVariants: () => void
  onAddAttribute: () => void
  onSetAttributeName: (attributeId: string, name: string) => void
  onSetAttributeInputValue: (attributeId: string, inputValue: string) => void
  onCommitAttributeValues: (attributeId: string, values: string[]) => void
  onCommitAttributeInput: (attributeId: string) => void
  onRemoveAttribute: (attributeId: string) => void
  onRemoveVariant: (variantDraftId: string) => void
  onUpdateVariantAttribute: (variantDraftId: string, attributeId: string, value: string) => void
  onUpdateVariantImageUrl: (variantDraftId: string, imageUrl: string) => void
  onCommitVariantPrice: (variantDraftId: string, price: string) => void
  onSaveVariants: () => void
  onCancelVariants: () => void
}

export function ProductVariantsBulkEditor({
  draft,
  attributeErrors,
  invalidVariantsCount,
  hasReachedMaxVariants,
  possibleCombinationsCount,
  variantCombinationErrors,
  variantPriceErrors,
  isInteractionsLocked,
  canSaveVariants,
  onAddVariant,
  onGenerateAllCombinations,
  onRemoveInvalidVariants,
  onAddAttribute,
  onSetAttributeName,
  onSetAttributeInputValue,
  onCommitAttributeValues,
  onCommitAttributeInput,
  onRemoveAttribute,
  onRemoveVariant,
  onUpdateVariantAttribute,
  onUpdateVariantImageUrl,
  onCommitVariantPrice,
  onSaveVariants,
  onCancelVariants,
}: Props) {
  return (
    <Stack spacing={1.5}>
      <Paper variant="outlined" sx={{ p: 1.5 }}>
        <Stack
          direction={{ xs: 'column', lg: 'row' }}
          gap={1.5}
          alignItems={{ xs: 'stretch', lg: 'center' }}
          justifyContent="space-between"
        >
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip label={`${draft.attributes.length} attributes`} />
            <Chip label={`${possibleCombinationsCount} possible combinations`} />
            <Chip label={`${draft.variants.length} variants added`} />
            {invalidVariantsCount > 0 ? (
              <Chip color="error" label={`${invalidVariantsCount} invalid`} />
            ) : null}
          </Stack>

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Button
              variant="outlined"
              disabled={hasReachedMaxVariants || isInteractionsLocked}
              onClick={onAddVariant}
            >
              {productsUiText.detailsPage.actions.addOneVariant}
            </Button>

            <Button
              variant="contained"
              disabled={
                possibleCombinationsCount === 0 || hasReachedMaxVariants || isInteractionsLocked
              }
              onClick={onGenerateAllCombinations}
            >
              {productsUiText.detailsPage.actions.generateAllCombinations}
            </Button>

            {invalidVariantsCount > 0 ? (
              <Button color="error" variant="contained" onClick={onRemoveInvalidVariants}>
                {productsUiText.detailsPage.actions.removeInvalidVariants}
              </Button>
            ) : null}
          </Stack>
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: 1.5 }}>
        <Stack spacing={1.5}>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            justifyContent="space-between"
            alignItems={{ xs: 'flex-start', md: 'center' }}
            gap={1.25}
          >
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Attributes
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Create unique attributes and available values. Values will be used to build
                variants.
              </Typography>
            </Box>
            <Button
              variant="outlined"
              startIcon={<AddRoundedIcon />}
              onClick={onAddAttribute}
              disabled={isInteractionsLocked}
              data-testid="product-details-page-attributes-add-button"
            >
              Add Attribute
            </Button>
          </Stack>

          <Stack spacing={1.25} data-testid="product-details-page-attributes-list">
            {draft.attributes.length === 0 ? (
              <Alert severity="info" data-testid="product-details-page-attributes-empty-alert">
                Attributes are optional. You can generate a single variant without attributes.
              </Alert>
            ) : null}

            {draft.attributes.map((attribute, index) => (
              <Paper
                key={attribute.id}
                variant="outlined"
                sx={{ p: 1.25 }}
                data-testid={`product-details-page-attribute-row-${index}`}
              >
                <Stack
                  direction={{ xs: 'column', md: 'row' }}
                  spacing={1.5}
                  alignItems={{ xs: 'stretch', md: 'flex-start' }}
                >
                  <TextField
                    label="Attribute name"
                    value={attribute.name}
                    onChange={(event) => onSetAttributeName(attribute.id, event.target.value)}
                    error={attributeErrors.has(attribute.id)}
                    helperText={attributeErrors.get(attribute.id) ?? ' '}
                    sx={{ width: { xs: '100%', md: 280 } }}
                    data-testid={`product-details-page-attribute-row-${index}-name-input`}
                    inputProps={{
                      'data-testid': `product-details-page-attribute-row-${index}-name-input-field`,
                    }}
                  />

                  <Autocomplete
                    multiple
                    freeSolo
                    options={[]}
                    value={attribute.values}
                    inputValue={attribute.inputValue}
                    onInputChange={(_, nextValue) =>
                      onSetAttributeInputValue(attribute.id, nextValue)
                    }
                    onChange={(_, nextValues) =>
                      onCommitAttributeValues(attribute.id, nextValues as string[])
                    }
                    renderTags={(value: readonly string[], getTagProps) =>
                      value.map((option: string, valueIndex: number) => {
                        const { key, ...chipProps } = getTagProps({ index: valueIndex })
                        return (
                          <Chip
                            key={key}
                            label={option}
                            {...chipProps}
                            data-testid={`product-details-page-attribute-row-${index}-value-chip-${valueIndex}`}
                          />
                        )
                      })
                    }
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Values"
                        placeholder="Type value and press Enter"
                        helperText="Example: Black, White, Red. Duplicates are not allowed."
                        onBlur={() => onCommitAttributeInput(attribute.id)}
                        onKeyDown={(event) => {
                          if (event.key !== 'Enter' && event.key !== ',') return
                          event.preventDefault()
                          onCommitAttributeInput(attribute.id)
                        }}
                        data-testid={`product-details-page-attribute-row-${index}-values-input`}
                        inputProps={{
                          ...params.inputProps,
                          'data-testid': `product-details-page-attribute-row-${index}-values-input-field`,
                        }}
                      />
                    )}
                    sx={{ flex: 1 }}
                  />

                  <IconButton
                    color="error"
                    onClick={() => onRemoveAttribute(attribute.id)}
                    sx={{ mt: { xs: 0, md: 1 } }}
                    disabled={isInteractionsLocked}
                    data-testid={`product-details-page-attribute-row-${index}-delete-button`}
                  >
                    <DeleteOutlineOutlinedIcon fontSize="small" />
                  </IconButton>
                </Stack>
              </Paper>
            ))}
          </Stack>
        </Stack>
      </Paper>

      {draft.variants.length === 0 ? (
        <Paper variant="outlined" sx={{ py: 4, px: 2, borderStyle: 'dashed', textAlign: 'center' }}>
          <Typography variant="h6">{productsUiText.detailsPage.placeholders.noVariants}</Typography>
          <Typography color="text.secondary">
            {productsUiText.detailsPage.placeholders.noVariantsHelp}
          </Typography>
        </Paper>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gap: 1.5,
            gridTemplateColumns: { xs: '1fr', xl: '1fr 1fr' },
          }}
        >
          {draft.variants.map((variant, index) => (
            <ProductVariantDraftCard
              key={variant.id}
              index={index}
              variant={variant}
              attributes={draft.attributes}
              combinationError={variantCombinationErrors.get(variant.id) ?? ''}
              committedPriceError={variantPriceErrors.get(variant.id) ?? ''}
              isInteractionsLocked={isInteractionsLocked}
              canDelete={draft.variants.length > 1}
              onDelete={onRemoveVariant}
              onChangeAttribute={onUpdateVariantAttribute}
              onChangeImageUrl={onUpdateVariantImageUrl}
              onCommitPrice={onCommitVariantPrice}
            />
          ))}
        </Box>
      )}

      <Stack direction="row" spacing={1}>
        <Button
          variant="contained"
          disabled={!canSaveVariants}
          onClick={onSaveVariants}
          data-testid="product-details-page-save-variants-button"
        >
          {productsUiText.detailsPage.actions.saveProduct}
        </Button>
        <Button
          onClick={onCancelVariants}
          disabled={isInteractionsLocked}
          data-testid="product-details-page-cancel-variants-edit-button"
        >
          {productsUiText.detailsPage.actions.cancel}
        </Button>
      </Stack>
    </Stack>
  )
}
