import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import ErrorOutlineOutlinedIcon from '@mui/icons-material/ErrorOutlineOutlined'
import { Box, Button, Chip, IconButton, Paper, Stack, Tooltip, Typography } from '@mui/material'
import type { Product, ProductVariant } from '@/api/modules/products.api'
import type { ProductVariantsDraft } from '@/features/products/forms/productVariantsDraft'
import { toVariantTitle } from '@/features/products/forms/productVariantsDraft'
import { ProductVariantInlineEditor } from '@/features/products/components/details/ProductVariantInlineEditor'
import { ProductVariantsBulkEditor } from '@/features/products/components/details/ProductVariantsBulkEditor'
import { productsUiText } from '@/features/products/products.ui-text'
import { formatPrice } from '@/utils/number'

type SingleVariantDraft = {
  variantId: string
  price: string
  imageUrl: string
  attributes: Record<string, string>
}

type Props = {
  product: Product
  draft: ProductVariantsDraft | null
  isVariantsEditMode: boolean
  isReadOnlyMode: boolean
  isEditingDisabled: boolean
  isInteractionsLocked: boolean
  canSaveVariants: boolean
  attributeErrors: Map<string, string>
  invalidVariantsCount: number
  hasReachedMaxVariants: boolean
  possibleCombinationsCount: number
  variantCombinationErrors: Map<string, string>
  variantPriceErrors: Map<string, string>
  singleVariantDraft: SingleVariantDraft | null
  singleVariantError: string
  canSaveSingleVariant: boolean
  onEnterVariantsMode: () => void
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
  onEnterSingleVariantEdit: (variant: ProductVariant) => void
  onToggleVariantStatus: (variant: ProductVariant) => void
  onOpenDeleteVariantConfirm: (variantId?: string) => void
  onSetSingleVariantAttribute: (attributeKey: string, value: string) => void
  onSetSingleVariantPrice: (value: string) => void
  onSetSingleVariantImageUrl: (value: string) => void
  onSaveSingleVariant: () => void
  onCancelSingleVariantEdit: () => void
}

export function ProductVariantsSection({
  product,
  draft,
  isVariantsEditMode,
  isReadOnlyMode,
  isEditingDisabled,
  isInteractionsLocked,
  canSaveVariants,
  attributeErrors,
  invalidVariantsCount,
  hasReachedMaxVariants,
  possibleCombinationsCount,
  variantCombinationErrors,
  variantPriceErrors,
  singleVariantDraft,
  singleVariantError,
  canSaveSingleVariant,
  onEnterVariantsMode,
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
  onEnterSingleVariantEdit,
  onToggleVariantStatus,
  onOpenDeleteVariantConfirm,
  onSetSingleVariantAttribute,
  onSetSingleVariantPrice,
  onSetSingleVariantImageUrl,
  onSaveSingleVariant,
  onCancelSingleVariantEdit,
}: Props) {
  return (
    <Paper variant="outlined" sx={{ p: { xs: 1.5, md: 2 } }} data-testid="product-details-page-variants-section">
      <Stack spacing={1.5}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {productsUiText.detailsPage.variantsTitle}
            </Typography>
            <Tooltip title={productsUiText.detailsPage.actions.edit}>
              <span>
                <IconButton
                  size="small"
                  onClick={onEnterVariantsMode}
                  disabled={!isReadOnlyMode || isEditingDisabled}
                  data-testid="product-details-page-variants-bulk-edit-button"
                >
                  <EditOutlinedIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
        </Stack>
        <Typography variant="body2" color="text.secondary">
          {productsUiText.detailsPage.variantsSubtitle}
        </Typography>

        {isVariantsEditMode && draft ? (
          <ProductVariantsBulkEditor
            draft={draft}
            attributeErrors={attributeErrors}
            invalidVariantsCount={invalidVariantsCount}
            hasReachedMaxVariants={hasReachedMaxVariants}
            possibleCombinationsCount={possibleCombinationsCount}
            variantCombinationErrors={variantCombinationErrors}
            variantPriceErrors={variantPriceErrors}
            isInteractionsLocked={isInteractionsLocked}
            canSaveVariants={canSaveVariants}
            onAddVariant={onAddVariant}
            onGenerateAllCombinations={onGenerateAllCombinations}
            onRemoveInvalidVariants={onRemoveInvalidVariants}
            onAddAttribute={onAddAttribute}
            onSetAttributeName={onSetAttributeName}
            onSetAttributeInputValue={onSetAttributeInputValue}
            onCommitAttributeValues={onCommitAttributeValues}
            onCommitAttributeInput={onCommitAttributeInput}
            onRemoveAttribute={onRemoveAttribute}
            onRemoveVariant={onRemoveVariant}
            onUpdateVariantAttribute={onUpdateVariantAttribute}
            onUpdateVariantImageUrl={onUpdateVariantImageUrl}
            onCommitVariantPrice={onCommitVariantPrice}
            onSaveVariants={onSaveVariants}
            onCancelVariants={onCancelVariants}
          />
        ) : (
          <Box
            sx={{
              display: 'grid',
              gap: 1.5,
              gridTemplateColumns: { xs: '1fr', xl: '1fr 1fr' },
            }}
          >
            {product.variants.map((variant, variantIndex) => {
              const isEditingThisVariant =
                singleVariantDraft?.variantId === variant._id && Boolean(variant._id)
              const isSinglePriceError =
                singleVariantError === 'Price should be greater than 0.' ||
                singleVariantError === 'Price can have max 2 decimal places.'
              const singleVariantHeaderError =
                isEditingThisVariant && singleVariantDraft && singleVariantError && !isSinglePriceError
                  ? singleVariantError
                  : ''

              return (
                <Paper key={variant._id ?? variantIndex} variant="outlined" sx={{ p: 1.5 }}>
                  <Stack spacing={1.25}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                          {product.name}
                        </Typography>
                        <Chip size="small" label={variant.status} variant="outlined" />
                        <Tooltip title={productsUiText.detailsPage.actions.edit}>
                          <span>
                            <IconButton
                              size="small"
                              disabled={!isReadOnlyMode || isEditingDisabled}
                              onClick={() => onEnterSingleVariantEdit(variant)}
                            >
                              <EditOutlinedIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Button
                          size="small"
                          color={variant.status === 'Active' ? 'warning' : 'success'}
                          variant="outlined"
                          disabled={!isReadOnlyMode || isEditingDisabled}
                          onClick={() => onToggleVariantStatus(variant)}
                        >
                          {variant.status === 'Active' ? 'Archive' : 'Activate'}
                        </Button>
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
                          {singleVariantHeaderError ? (
                            <Stack direction="row" spacing={0.5} alignItems="center" sx={{ minWidth: 0 }}>
                              <Box sx={{ width: 4, flexShrink: 0 }} />
                              <ErrorOutlineOutlinedIcon sx={{ color: 'error.main', fontSize: 18 }} />
                              <Typography
                                variant="body2"
                                color="error.main"
                                noWrap
                                title={singleVariantHeaderError}
                              >
                                {singleVariantHeaderError}
                              </Typography>
                            </Stack>
                          ) : null}
                        </Box>
                        <Tooltip title="Delete">
                          <span>
                            <IconButton
                              size="small"
                              color="error"
                              disabled={!isReadOnlyMode || isEditingDisabled || product.variants.length <= 1}
                              onClick={() => onOpenDeleteVariantConfirm(variant._id)}
                            >
                              <DeleteOutlineOutlinedIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </Stack>
                    </Stack>

                    {isEditingThisVariant && singleVariantDraft ? (
                      <ProductVariantInlineEditor
                        attributes={product.attributes}
                        draft={{
                          price: singleVariantDraft.price,
                          imageUrl: singleVariantDraft.imageUrl,
                          attributes: singleVariantDraft.attributes,
                        }}
                        error={singleVariantError}
                        isInteractionsLocked={isInteractionsLocked}
                        canSave={canSaveSingleVariant}
                        onChangeAttribute={onSetSingleVariantAttribute}
                        onChangePrice={onSetSingleVariantPrice}
                        onChangeImageUrl={onSetSingleVariantImageUrl}
                        onSave={onSaveSingleVariant}
                        onCancel={onCancelSingleVariantEdit}
                      />
                    ) : (
                      <Stack spacing={0.75}>
                        <Typography>
                          <strong>Price:</strong> {formatPrice(variant.price)}
                        </Typography>
                        <Typography>
                          <strong>Image:</strong>{' '}
                          {variant.imageUrl?.trim() || productsUiText.detailsPage.placeholders.useParentImage}
                        </Typography>
                        {product.attributes.map((attribute) => (
                          <Typography key={`${variant._id ?? variantIndex}-${attribute.key}`}>
                            <strong>{attribute.name}:</strong> {variant.attributes[attribute.key] ?? '-'}
                          </Typography>
                        ))}
                        {product.attributes.length === 0 ? (
                          <Typography>
                            <strong>Variant:</strong> {toVariantTitle(variant, product.attributes) || '-'}
                          </Typography>
                        ) : null}
                      </Stack>
                    )}
                  </Stack>
                </Paper>
              )
            })}
          </Box>
        )}
      </Stack>
    </Paper>
  )
}
