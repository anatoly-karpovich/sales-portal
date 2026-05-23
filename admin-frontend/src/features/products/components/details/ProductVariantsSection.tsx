import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined'
import DragIndicatorOutlinedIcon from '@mui/icons-material/DragIndicatorOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import ErrorOutlineOutlinedIcon from '@mui/icons-material/ErrorOutlineOutlined'
import { Box, Button, Chip, IconButton, Paper, Stack, Tooltip, Typography } from '@mui/material'
import { useState } from 'react'
import type { Product, ProductVariant } from '@/api/modules/products.api'
import noImageProduct from '@/assets/no-image-product.jpeg'
import type { ProductVariantsDraft } from '@/features/products/forms/productVariantsDraft'
import { toVariantTitle } from '@/features/products/forms/productVariantsDraft'
import { ProductVariantInlineEditor } from '@/features/products/components/details/ProductVariantInlineEditor'
import { ProductVariantsBulkEditor } from '@/features/products/components/details/ProductVariantsBulkEditor'
import { productsUiText } from '@/features/products/products.ui-text'
import { buildVariantDisplayName } from '@/features/products/utils/buildVariantDisplayName'
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
  isAttributesOrderMode: boolean
  isReadOnlyMode: boolean
  isEditingDisabled: boolean
  isInteractionsLocked: boolean
  isSingleVariantAttributesEditable: boolean
  canEnterVariantsEdit: boolean
  canEnterAttributesOrderMode: boolean
  canSaveAttributesOrder: boolean
  attributesOrderDraft: Product['attributes'] | null
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
  onEnterAttributesOrderMode: () => void
  onMoveAttributeOrder: (fromIndex: number, toIndex: number) => void
  onSaveAttributesOrder: () => void
  onCancelAttributesOrder: () => void
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
  isAttributesOrderMode,
  isReadOnlyMode,
  isEditingDisabled,
  isInteractionsLocked,
  isSingleVariantAttributesEditable,
  canEnterVariantsEdit,
  canEnterAttributesOrderMode,
  canSaveAttributesOrder,
  attributesOrderDraft,
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
  onEnterAttributesOrderMode,
  onMoveAttributeOrder,
  onSaveAttributesOrder,
  onCancelAttributesOrder,
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
  const parentImageUrl = product.imageUrl?.trim() || noImageProduct
  const [draggedAttributeIndex, setDraggedAttributeIndex] = useState<number | null>(null)

  return (
    <Paper
      variant="outlined"
      sx={{ p: { xs: 1.5, md: 2 } }}
      data-testid="product-details-page-variants-section"
    >
      <Stack spacing={1.5}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {productsUiText.detailsPage.variantsTitle}
            </Typography>
            {canEnterVariantsEdit ? (
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
            ) : null}
            {canEnterAttributesOrderMode ? (
              <Button
                size="small"
                variant="outlined"
                onClick={onEnterAttributesOrderMode}
                disabled={!isReadOnlyMode || isEditingDisabled}
                data-testid="product-details-page-attributes-reorder-start-button"
              >
                {productsUiText.detailsPage.actions.reorderAttributes}
              </Button>
            ) : null}
          </Stack>
        </Stack>
        <Typography variant="body2" color="text.secondary">
          {productsUiText.detailsPage.variantsSubtitle}
        </Typography>

        {isAttributesOrderMode && attributesOrderDraft ? (
          <Stack spacing={1.25} data-testid="product-details-page-attributes-reorder-mode">
            {attributesOrderDraft.length === 0 ? (
              <Typography color="text.secondary">
                {productsUiText.detailsPage.labels.noAttributes}
              </Typography>
            ) : (
              <Stack spacing={0.75}>
                {attributesOrderDraft.map((attribute, index) => (
                  <Paper
                    key={attribute.key}
                    variant="outlined"
                    sx={{
                      p: 1,
                      borderColor: draggedAttributeIndex === index ? 'primary.main' : 'divider',
                    }}
                    draggable={!isInteractionsLocked}
                    onDragStart={() => setDraggedAttributeIndex(index)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      event.preventDefault()
                      if (draggedAttributeIndex === null || draggedAttributeIndex === index) return
                      onMoveAttributeOrder(draggedAttributeIndex, index)
                      setDraggedAttributeIndex(null)
                    }}
                    onDragEnd={() => setDraggedAttributeIndex(null)}
                    data-testid={`product-details-page-attributes-reorder-row-${index}`}
                  >
                    <Stack direction="row" spacing={1} alignItems="center">
                      <DragIndicatorOutlinedIcon fontSize="small" color="action" />
                      <Typography sx={{ fontWeight: 600 }}>
                        {attribute.name}: {attribute.values.join(', ')}
                      </Typography>
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            )}

            <Stack direction="row" spacing={1}>
              <Button
                variant="contained"
                disabled={!canSaveAttributesOrder}
                onClick={onSaveAttributesOrder}
                data-testid="product-details-page-attributes-reorder-save-button"
              >
                {productsUiText.detailsPage.actions.saveOrder}
              </Button>
              <Button
                disabled={isInteractionsLocked}
                onClick={onCancelAttributesOrder}
                data-testid="product-details-page-attributes-reorder-cancel-button"
              >
                {productsUiText.detailsPage.actions.cancel}
              </Button>
            </Stack>
          </Stack>
        ) : isVariantsEditMode && draft ? (
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
          <Stack spacing={1.5}>
            {isReadOnlyMode ? (
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                flexWrap="wrap"
                useFlexGap
                data-testid="product-details-page-attributes-list-read-only"
              >
                <Typography sx={{ fontWeight: 700 }}>
                  {productsUiText.detailsPage.labels.attributes}:
                </Typography>
                {product.attributes.length === 0 ? (
                  <Typography color="text.secondary">
                    {productsUiText.detailsPage.labels.noAttributes}
                  </Typography>
                ) : (
                  product.attributes.map((attribute) => (
                    <Chip
                      key={attribute.key}
                      label={`${attribute.name}: ${attribute.values.join(', ')}`}
                      size="small"
                      variant="outlined"
                    />
                  ))
                )}
              </Stack>
            ) : null}

            <Box
              sx={{
                display: 'grid',
                gap: 1.5,
                gridTemplateColumns: { xs: '1fr', xl: '1fr 1fr' },
              }}
            >
              {product.variants.map((variant, variantIndex) => {
                const variantImageUrl = variant.imageUrl?.trim() || parentImageUrl
                const isEditingThisVariant =
                  singleVariantDraft?.variantId === variant._id && Boolean(variant._id)
                const isSinglePriceError =
                  singleVariantError === productsUiText.detailsPage.validation.priceGreaterThanZero ||
                  singleVariantError === productsUiText.detailsPage.validation.priceMaxDecimals
                const singleVariantHeaderError =
                  isEditingThisVariant &&
                  singleVariantDraft &&
                  singleVariantError &&
                  !isSinglePriceError
                    ? singleVariantError
                    : ''

                return (
                  <Paper key={variant._id ?? variantIndex} variant="outlined" sx={{ p: 1.5 }}>
                    <Stack spacing={1.25}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                            {buildVariantDisplayName(product, variant) || product.name}
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
                            {variant.status === 'Active'
                              ? productsUiText.detailsPage.actions.archiveVariant
                              : productsUiText.detailsPage.actions.activateVariant}
                          </Button>
                        </Stack>

                        <Stack
                          direction="row"
                          spacing={0.75}
                          alignItems="center"
                          sx={{ flex: 1, minWidth: 0 }}
                        >
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
                              <Stack
                                direction="row"
                                spacing={0.5}
                                alignItems="center"
                                sx={{ minWidth: 0 }}
                              >
                                <Box sx={{ width: 4, flexShrink: 0 }} />
                                <ErrorOutlineOutlinedIcon
                                  sx={{ color: 'error.main', fontSize: 18 }}
                                />
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
                          <Tooltip title={productsUiText.detailsPage.actions.delete}>
                            <span>
                              <IconButton
                                size="small"
                                color="error"
                                disabled={
                                  !isReadOnlyMode ||
                                  isEditingDisabled ||
                                  !canEnterVariantsEdit ||
                                  product.variants.length <= 1
                                }
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
                          isAttributesEditable={isSingleVariantAttributesEditable}
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
                        <Stack
                          direction={{ xs: 'column', sm: 'row' }}
                          spacing={1.5}
                          alignItems="flex-start"
                        >
                          <Box
                            component="img"
                            src={variantImageUrl}
                            alt={`${product.name} ${toVariantTitle(variant, product.attributes) || ''}`}
                            sx={{
                              width: 120,
                              height: 120,
                              borderRadius: 1.5,
                              border: 1,
                              borderColor: 'divider',
                              objectFit: 'cover',
                              flexShrink: 0,
                            }}
                          />
                          <Stack spacing={0.75} sx={{ minWidth: 0 }}>
                            <Typography>
                              <strong>{productsUiText.detailsPage.labels.price}:</strong>{' '}
                              {formatPrice(variant.price)}
                            </Typography>
                            <Typography>
                              <strong>{productsUiText.detailsPage.labels.imageUrl}:</strong>{' '}
                              {variant.imageUrl?.trim() || '-'}
                            </Typography>
                            {product.attributes.map((attribute) => (
                              <Typography key={`${variant._id ?? variantIndex}-${attribute.key}`}>
                                <strong>{attribute.name}:</strong>{' '}
                                {variant.attributes[attribute.key] ?? '-'}
                              </Typography>
                            ))}
                            {product.attributes.length === 0 ? (
                              <Typography>
                                <strong>{productsUiText.detailsPage.labels.variant}:</strong>{' '}
                                {toVariantTitle(variant, product.attributes) || '-'}
                              </Typography>
                            ) : null}
                          </Stack>
                        </Stack>
                      )}
                    </Stack>
                  </Paper>
                )
              })}
            </Box>
          </Stack>
        )}
      </Stack>
    </Paper>
  )
}
