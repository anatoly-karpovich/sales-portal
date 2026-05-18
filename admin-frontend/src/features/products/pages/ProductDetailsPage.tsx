import { Alert, Button, Paper, Stack, Typography } from '@mui/material'
import { useMemo, useState } from 'react'
import { useSnackbar } from 'notistack'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type {
  Product,
  ProductStatus,
  ProductVariant,
  ProductVariantPatchPayload,
  ProductVariantReplaceRequestPayload,
  ProductVariantStatus,
} from '@/api/modules/products.api'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { ProductCategorySection } from '@/features/products/components/details/ProductCategorySection'
import { ProductDetailsHeader } from '@/features/products/components/details/ProductDetailsHeader'
import { ProductDetailsSkeleton } from '@/features/products/components/details/ProductDetailsSkeleton'
import { ProductInfoCard } from '@/features/products/components/details/ProductInfoCard'
import { ProductVariantsSection } from '@/features/products/components/details/ProductVariantsSection'
import {
  getProductImageUrlError,
  getProductNameError,
} from '@/features/products/forms/productParentValidation'
import {
  buildAttributesPayloadFromDraft,
  buildVariantCombinationKey,
  buildVariantsReplacePayloadFromDraft,
  isValidHttpUrl,
  toVariantTitle,
  validatePrice,
} from '@/features/products/forms/productVariantsDraft'
import { useCategoriesWorkspaceQuery } from '@/features/categories/hooks/useCategoriesQuery'
import { useProductDetailsEditMode } from '@/features/products/hooks/useProductDetailsEditMode'
import { useManufacturerOptions } from '@/features/products/hooks/useManufacturerOptions'
import { useProductVariantsDraft } from '@/features/products/hooks/useProductVariantsDraft'
import { useProductVariantsValidation } from '@/features/products/hooks/useProductVariantsValidation'
import {
  useDeleteProductMutation,
  useDeleteProductVariantMutation,
  usePatchProductMutation,
  usePatchProductStatusMutation,
  usePatchProductVariantMutation,
  usePatchProductVariantStatusMutation,
  useProductQuery,
  useReplaceProductVariantsMutation,
} from '@/features/products/hooks/useProductsQuery'
import {
  getDeleteProductMessage,
  getDeleteVariantMessage,
  getProductApiErrorMessage,
  productsUiText,
} from '@/features/products/products.ui-text'

type VariantEditDraft = {
  variantId: string
  price: string
  imageUrl: string
  attributes: Record<string, string>
}

type PendingConfirmAction =
  | 'delete-product'
  | 'delete-variant'
  | 'activate-product'
  | 'archive-product'
  | 'discard-bulk'
  | 'discard-single'
  | 'discard-category'
  | null

function getErrorStatus(error: unknown) {
  return (error as { response?: { status?: number } })?.response?.status
}

function isSameSingleVariantDraft(
  product: Product | undefined,
  singleVariantDraft: VariantEditDraft | null,
) {
  if (!product || !singleVariantDraft) return false
  const sourceVariant = product.variants.find((variant) => variant._id === singleVariantDraft.variantId)
  if (!sourceVariant) return false

  const sourceSnapshot = JSON.stringify({
    price: String(sourceVariant.price),
    imageUrl: sourceVariant.imageUrl ?? '',
    attributes: sourceVariant.attributes,
  })
  const draftSnapshot = JSON.stringify({
    price: singleVariantDraft.price,
    imageUrl: singleVariantDraft.imageUrl,
    attributes: singleVariantDraft.attributes,
  })

  return sourceSnapshot === draftSnapshot
}

export function ProductDetailsPage() {
  const navigate = useNavigate()
  const { enqueueSnackbar } = useSnackbar()
  const { productId } = useParams<{ productId: string }>()
  const categoriesQuery = useCategoriesWorkspaceQuery()
  const {
    options: manufacturerOptions,
    isLoading: isManufacturersLoading,
    isConfigured: hasConfiguredManufacturers,
  } = useManufacturerOptions()

  const productQuery = useProductQuery(productId ?? '', Boolean(productId))
  const patchProductMutation = usePatchProductMutation()
  const patchProductStatusMutation = usePatchProductStatusMutation()
  const patchVariantMutation = usePatchProductVariantMutation()
  const patchVariantStatusMutation = usePatchProductVariantStatusMutation()
  const replaceVariantsMutation = useReplaceProductVariantsMutation()
  const deleteVariantMutation = useDeleteProductVariantMutation()
  const deleteProductMutation = useDeleteProductMutation()

  const [pendingConfirmAction, setPendingConfirmAction] = useState<PendingConfirmAction>(null)
  const [pendingDeleteVariantId, setPendingDeleteVariantId] = useState<string | null>(null)
  const [singleVariantDraft, setSingleVariantDraft] = useState<VariantEditDraft | null>(null)
  const [categoryDraftId, setCategoryDraftId] = useState<string | null>(null)

  const product = productQuery.data
  const editMode = useProductDetailsEditMode()
  const draftState = useProductVariantsDraft(product)
  const validation = useProductVariantsValidation({
    draft: draftState.draft,
    baseDraft: draftState.baseDraft,
  })

  const isAnyMutationPending =
    patchProductMutation.isPending ||
    patchProductStatusMutation.isPending ||
    patchVariantMutation.isPending ||
    patchVariantStatusMutation.isPending ||
    replaceVariantsMutation.isPending ||
    deleteVariantMutation.isPending ||
    deleteProductMutation.isPending

  const isReadOnlyMode = editMode.isViewMode
  const isInteractionsLocked = isAnyMutationPending
  const isEditingDisabled = isAnyMutationPending || !hasConfiguredManufacturers
  const isCategoryEditingDisabled = isAnyMutationPending

  const currentStatus = product?.status ?? 'Draft'
  const statusChipColor =
    currentStatus === 'Active' ? 'success' : currentStatus === 'Archived' ? 'default' : 'warning'

  const statusAction = currentStatus === 'Active' ? 'archive-product' : 'activate-product'
  const statusActionLabel =
    currentStatus === 'Active'
      ? productsUiText.detailsPage.actions.archive
      : productsUiText.detailsPage.actions.activate
  const statusActionColor = currentStatus === 'Active' ? 'warning' : 'success'
  const targetStatus: ProductStatus = currentStatus === 'Active' ? 'Archived' : 'Active'

  const canSaveInfo = Boolean(
    editMode.isInfoMode &&
      draftState.draft &&
      !getProductNameError(draftState.draft.name) &&
      draftState.draft.manufacturer.trim().length > 0 &&
      !getProductImageUrlError(draftState.draft.imageUrl, isValidHttpUrl) &&
      validation.parentHasChanges &&
      hasConfiguredManufacturers &&
      !isInteractionsLocked,
  )

  const canSaveCategory = Boolean(
    product &&
      editMode.isCategoryMode &&
      categoryDraftId &&
      categoryDraftId !== product.categoryId &&
      !isInteractionsLocked,
  )

  const variantsReplaceRequestPayload = useMemo(() => {
    if (!draftState.draft) return null

    const payload: ProductVariantReplaceRequestPayload = {
      variants: buildVariantsReplacePayloadFromDraft(draftState.draft),
    }

    if (validation.attributesHaveChanges) {
      payload.attributes = buildAttributesPayloadFromDraft(draftState.draft)
    }

    return payload
  }, [draftState.draft, validation.attributesHaveChanges])

  const canSaveVariants = Boolean(
    editMode.isVariantsMode &&
      variantsReplaceRequestPayload &&
      (validation.variantsHaveChanges || validation.attributesHaveChanges) &&
      validation.isVariantsDraftValid &&
      hasConfiguredManufacturers &&
      !isInteractionsLocked,
  )

  const singleVariantError = useMemo(() => {
    if (!singleVariantDraft || !product) return ''

    const priceError = validatePrice(singleVariantDraft.price)
    if (priceError) return priceError
    if (singleVariantDraft.imageUrl.trim() && !isValidHttpUrl(singleVariantDraft.imageUrl.trim())) {
      return 'Variant image URL must be a valid http(s) URL.'
    }

    for (const attribute of product.attributes) {
      const value = singleVariantDraft.attributes[attribute.key]
      if (!value) {
        return `${attribute.name}: value is required.`
      }
      const belongs = attribute.values.some(
        (item) => item.trim().toLowerCase() === value.trim().toLowerCase(),
      )
      if (!belongs) {
        return `${attribute.name}: ${value} no longer exists in attribute values.`
      }
    }

    const currentCombinationKey = buildVariantCombinationKey(singleVariantDraft.attributes)

    const duplicateExists = product.variants.some((variant) => {
      if (variant._id === singleVariantDraft.variantId) return false
      return buildVariantCombinationKey(variant.attributes) === currentCombinationKey
    })

    if (duplicateExists) {
      return 'Variant with this attribute combination already exists.'
    }

    return ''
  }, [product, singleVariantDraft])

  const singleVariantHasChanges = useMemo(
    () => !isSameSingleVariantDraft(product, singleVariantDraft),
    [product, singleVariantDraft],
  )

  const canSaveSingleVariant = Boolean(
    editMode.isSingleVariantMode &&
      singleVariantDraft &&
      singleVariantHasChanges &&
      !singleVariantError &&
      !isInteractionsLocked,
  )

  const onEnterInfoEdit = () => {
    if (!isReadOnlyMode || isInteractionsLocked || !hasConfiguredManufacturers) return
    draftState.startEditing()
    editMode.enterInfoMode()
  }

  const onEnterCategoryEdit = () => {
    if (!product || !isReadOnlyMode || isInteractionsLocked || categoriesQuery.isLoading || categoriesQuery.isError) {
      return
    }
    setCategoryDraftId(product.categoryId)
    editMode.enterCategoryMode()
  }

  const onEnterVariantsEdit = () => {
    if (!isReadOnlyMode || isInteractionsLocked || !hasConfiguredManufacturers) return
    draftState.startEditing()
    editMode.enterVariantsMode()
  }

  const onEnterSingleVariantEdit = (variant: ProductVariant) => {
    if (!variant._id || !isReadOnlyMode || isInteractionsLocked || !hasConfiguredManufacturers) return
    setSingleVariantDraft({
      variantId: variant._id,
      price: String(variant.price),
      imageUrl: variant.imageUrl ?? '',
      attributes: { ...variant.attributes },
    })
    editMode.enterSingleVariantMode(variant._id)
  }

  const onRequestCancelBulkEdit = () => {
    if (!editMode.isInfoMode && !editMode.isVariantsMode) return
    const hasUnsavedChanges = editMode.isInfoMode
      ? validation.parentHasChanges
      : validation.variantsHaveChanges || validation.attributesHaveChanges

    if (hasUnsavedChanges) {
      setPendingConfirmAction('discard-bulk')
      return
    }

    draftState.discardChanges()
    editMode.exitEditModes()
  }

  const onRequestCancelCategoryEdit = () => {
    if (!product || !editMode.isCategoryMode) return

    if (categoryDraftId && categoryDraftId !== product.categoryId) {
      setPendingConfirmAction('discard-category')
      return
    }

    setCategoryDraftId(null)
    editMode.exitEditModes()
  }

  const onRequestCancelSingleEdit = () => {
    if (!singleVariantDraft) return
    if (singleVariantHasChanges) {
      setPendingConfirmAction('discard-single')
      return
    }
    setSingleVariantDraft(null)
    editMode.exitEditModes()
  }

  const onConfirmPendingAction = async () => {
    if (!product) return

    if (pendingConfirmAction === 'discard-bulk') {
      draftState.discardChanges()
      editMode.exitEditModes()
      setPendingConfirmAction(null)
      return
    }

    if (pendingConfirmAction === 'discard-category') {
      setCategoryDraftId(null)
      editMode.exitEditModes()
      setPendingConfirmAction(null)
      return
    }

    if (pendingConfirmAction === 'discard-single') {
      setSingleVariantDraft(null)
      editMode.exitEditModes()
      setPendingConfirmAction(null)
      return
    }

    if (pendingConfirmAction === 'delete-product') {
      try {
        await deleteProductMutation.mutateAsync(product._id)
        enqueueSnackbar(productsUiText.toasts.deleted, { variant: 'success' })
        navigate('/products')
      } catch (error) {
        enqueueSnackbar(getProductApiErrorMessage(getErrorStatus(error)), { variant: 'error' })
      }
      return
    }

    if (pendingConfirmAction === 'delete-variant' && pendingDeleteVariantId) {
      try {
        await deleteVariantMutation.mutateAsync({
          productId: product._id,
          variantId: pendingDeleteVariantId,
        })
        enqueueSnackbar(productsUiText.toasts.variantDeleted, { variant: 'success' })
        setPendingDeleteVariantId(null)
        setPendingConfirmAction(null)
      } catch (error) {
        enqueueSnackbar(getProductApiErrorMessage(getErrorStatus(error)), { variant: 'error' })
      }
      return
    }

    if (pendingConfirmAction === 'activate-product' || pendingConfirmAction === 'archive-product') {
      try {
        await patchProductStatusMutation.mutateAsync({
          productId: product._id,
          payload: { status: targetStatus },
        })
        enqueueSnackbar(productsUiText.toasts.statusUpdated, { variant: 'success' })
        setPendingConfirmAction(null)
      } catch (error) {
        enqueueSnackbar(getProductApiErrorMessage(getErrorStatus(error)), { variant: 'error' })
      }
    }
  }

  const onSaveInfo = async () => {
    if (!product || !draftState.draft || !canSaveInfo) return

    try {
      await patchProductMutation.mutateAsync({
        productId: product._id,
        payload: {
          name: draftState.draft.name.trim(),
          manufacturer: draftState.draft.manufacturer.trim(),
          description: draftState.draft.description.trim(),
          imageUrl: draftState.draft.imageUrl.trim(),
        },
      })
      enqueueSnackbar(productsUiText.toasts.updated, { variant: 'success' })
      draftState.discardChanges()
      editMode.exitEditModes()
    } catch (error) {
      enqueueSnackbar(getProductApiErrorMessage(getErrorStatus(error)), { variant: 'error' })
    }
  }

  const onSaveCategory = async () => {
    if (!product || !categoryDraftId || !canSaveCategory) return

    try {
      await patchProductMutation.mutateAsync({
        productId: product._id,
        payload: {
          categoryId: categoryDraftId,
        },
      })
      enqueueSnackbar(productsUiText.toasts.updated, { variant: 'success' })
      setCategoryDraftId(null)
      editMode.exitEditModes()
    } catch (error) {
      enqueueSnackbar(getProductApiErrorMessage(getErrorStatus(error)), { variant: 'error' })
    }
  }

  const onSaveVariants = async () => {
    if (!product || !variantsReplaceRequestPayload || !canSaveVariants) return

    try {
      await replaceVariantsMutation.mutateAsync({
        productId: product._id,
        payload: variantsReplaceRequestPayload,
      })
      enqueueSnackbar(productsUiText.toasts.updated, { variant: 'success' })
      draftState.discardChanges()
      editMode.exitEditModes()
    } catch (error) {
      enqueueSnackbar(getProductApiErrorMessage(getErrorStatus(error)), { variant: 'error' })
    }
  }

  const onToggleVariantStatus = async (variant: ProductVariant) => {
    if (!product || !variant._id || !isReadOnlyMode || isInteractionsLocked || !hasConfiguredManufacturers) {
      return
    }

    const nextStatus: ProductVariantStatus = variant.status === 'Active' ? 'Archived' : 'Active'
    try {
      await patchVariantStatusMutation.mutateAsync({
        productId: product._id,
        variantId: variant._id,
        payload: { status: nextStatus },
      })
      enqueueSnackbar(productsUiText.toasts.variantUpdated, { variant: 'success' })
    } catch (error) {
      enqueueSnackbar(getProductApiErrorMessage(getErrorStatus(error)), { variant: 'error' })
    }
  }

  const onSaveSingleVariant = async () => {
    if (!product || !singleVariantDraft || !canSaveSingleVariant) return
    const payload: ProductVariantPatchPayload = {
      price: Number(singleVariantDraft.price),
      attributes: singleVariantDraft.attributes,
      ...(singleVariantDraft.imageUrl.trim() ? { imageUrl: singleVariantDraft.imageUrl.trim() } : {}),
    }

    try {
      await patchVariantMutation.mutateAsync({
        productId: product._id,
        variantId: singleVariantDraft.variantId,
        payload,
      })
      enqueueSnackbar(productsUiText.toasts.variantUpdated, { variant: 'success' })
      setSingleVariantDraft(null)
      editMode.exitEditModes()
    } catch (error) {
      enqueueSnackbar(getProductApiErrorMessage(getErrorStatus(error)), { variant: 'error' })
    }
  }

  const openDeleteVariantConfirm = (variantId?: string) => {
    if (!variantId || !product || product.variants.length <= 1 || !isReadOnlyMode || isEditingDisabled) {
      return
    }
    setPendingDeleteVariantId(variantId)
    setPendingConfirmAction('delete-variant')
  }

  if (!productId) {
    return (
      <Paper sx={{ p: 3 }} data-testid="product-details-page-missing-id">
        <Typography color="error">{productsUiText.errors.missingProductId}</Typography>
      </Paper>
    )
  }

  if (productQuery.isLoading || isManufacturersLoading || categoriesQuery.isLoading) {
    return <ProductDetailsSkeleton />
  }

  if (productQuery.isError || !product) {
    return (
      <Paper sx={{ p: 3 }} data-testid="product-details-page-load-error">
        <Stack spacing={2} alignItems="flex-start">
          <Alert severity="error">{productsUiText.detailsPage.placeholders.missingProduct}</Alert>
          <Button component={Link} to="/products" variant="outlined">
            {productsUiText.detailsPage.backToProducts}
          </Button>
        </Stack>
      </Paper>
    )
  }

  const confirmDialogConfig =
    pendingConfirmAction === 'delete-product'
      ? {
          title: productsUiText.detailsPage.dialogs.deleteProductTitle,
          message: getDeleteProductMessage(product.name),
          confirmLabel: productsUiText.detailsPage.dialogs.deleteProductConfirm,
          confirmColor: 'error' as const,
        }
      : pendingConfirmAction === 'delete-variant'
        ? {
            title: productsUiText.detailsPage.dialogs.deleteVariantTitle,
            message: getDeleteVariantMessage(
              toVariantTitle(
                product.variants.find((variant) => variant._id === pendingDeleteVariantId) ??
                  product.variants[0],
                product.attributes,
              ) || null,
            ),
            confirmLabel: productsUiText.detailsPage.dialogs.deleteVariantConfirm,
            confirmColor: 'error' as const,
          }
        : pendingConfirmAction === 'activate-product'
          ? {
              title: productsUiText.detailsPage.dialogs.activateTitle,
              message: 'Are you sure you want to activate this product?',
              confirmLabel: productsUiText.detailsPage.dialogs.activateConfirm,
              confirmColor: 'primary' as const,
            }
          : pendingConfirmAction === 'archive-product'
            ? {
                title: productsUiText.detailsPage.dialogs.archiveTitle,
                message: 'Are you sure you want to archive this product?',
                confirmLabel: productsUiText.detailsPage.dialogs.archiveConfirm,
                confirmColor: 'warning' as const,
              }
            : pendingConfirmAction === 'discard-bulk' ||
                pendingConfirmAction === 'discard-single' ||
                pendingConfirmAction === 'discard-category'
              ? {
                  title: productsUiText.detailsPage.dialogs.discardChangesTitle,
                  message: productsUiText.detailsPage.dialogs.discardChangesMessage,
                  confirmLabel: productsUiText.detailsPage.dialogs.discardChangesConfirm,
                  confirmColor: 'warning' as const,
                }
              : null

  return (
    <Stack spacing={2.5} data-testid="product-details-page">
      <ProductDetailsHeader
        product={product}
        statusChipColor={statusChipColor}
        statusActionLabel={statusActionLabel}
        manageInventoryLabel={productsUiText.detailsPage.actions.manageInventory}
        statusActionColor={statusActionColor}
        isReadOnlyMode={isReadOnlyMode}
        isEditingDisabled={isEditingDisabled}
        backLabel={productsUiText.detailsPage.backToProducts}
        onStatusAction={() => setPendingConfirmAction(statusAction)}
        onDeleteProduct={() => setPendingConfirmAction('delete-product')}
      />

      {!hasConfiguredManufacturers ? (
        <Alert severity="warning" data-testid="product-details-page-manufacturers-unavailable-alert">
          {productsUiText.detailsPage.placeholders.manufacturersUnavailable}
        </Alert>
      ) : null}

      <Paper sx={{ p: { xs: 2, md: 3 } }} data-testid="product-details-page-content">
        <Stack spacing={2}>
          <ProductInfoCard
            product={product}
            draft={draftState.draft}
            manufacturerOptions={manufacturerOptions}
            isInfoEditMode={editMode.isInfoMode}
            isReadOnlyMode={isReadOnlyMode}
            isEditingDisabled={isEditingDisabled}
            isParentImageValid={validation.isParentImageValid}
            canSaveInfo={canSaveInfo}
            isInteractionsLocked={isInteractionsLocked}
            onEnterInfoMode={onEnterInfoEdit}
            onChangeField={draftState.updateParentField}
            onSaveInfo={() => void onSaveInfo()}
            onCancelInfo={onRequestCancelBulkEdit}
          />

          <ProductCategorySection
            product={product}
            tree={categoriesQuery.data?.tree ?? []}
            flat={categoriesQuery.data?.flat ?? []}
            isCategoryEditMode={editMode.isCategoryMode}
            isReadOnlyMode={isReadOnlyMode}
            isEditingDisabled={isCategoryEditingDisabled}
            isInteractionsLocked={isInteractionsLocked}
            isCategoriesLoading={categoriesQuery.isLoading}
            isCategoriesError={categoriesQuery.isError}
            categoryDraftId={categoryDraftId}
            canSaveCategory={canSaveCategory}
            onEnterCategoryMode={onEnterCategoryEdit}
            onChangeCategoryDraft={setCategoryDraftId}
            onSaveCategory={() => void onSaveCategory()}
            onCancelCategory={onRequestCancelCategoryEdit}
          />

          <ProductVariantsSection
            product={product}
            draft={draftState.draft}
            isVariantsEditMode={editMode.isVariantsMode}
            isReadOnlyMode={isReadOnlyMode}
            isEditingDisabled={isEditingDisabled}
            isInteractionsLocked={isInteractionsLocked}
            canSaveVariants={canSaveVariants}
            attributeErrors={validation.attributeErrors}
            invalidVariantsCount={validation.invalidVariantsCount}
            hasReachedMaxVariants={validation.hasReachedMaxVariants}
            possibleCombinationsCount={validation.possibleCombinations.length}
            variantCombinationErrors={validation.variantCombinationErrors}
            variantPriceErrors={validation.variantPriceErrors}
            singleVariantDraft={singleVariantDraft}
            singleVariantError={singleVariantError}
            canSaveSingleVariant={canSaveSingleVariant}
            onEnterVariantsMode={onEnterVariantsEdit}
            onAddVariant={draftState.addVariant}
            onGenerateAllCombinations={draftState.generateAllCombinations}
            onRemoveInvalidVariants={() => draftState.removeVariantsByIds(validation.invalidVariantIds)}
            onAddAttribute={draftState.addAttribute}
            onSetAttributeName={draftState.setAttributeName}
            onSetAttributeInputValue={draftState.setAttributeInputValue}
            onCommitAttributeValues={draftState.commitAttributeValues}
            onCommitAttributeInput={draftState.commitAttributeInput}
            onRemoveAttribute={draftState.removeAttribute}
            onRemoveVariant={draftState.removeVariant}
            onUpdateVariantAttribute={draftState.updateVariantAttribute}
            onUpdateVariantImageUrl={draftState.updateVariantImageUrl}
            onCommitVariantPrice={draftState.commitVariantPrice}
            onSaveVariants={() => void onSaveVariants()}
            onCancelVariants={onRequestCancelBulkEdit}
            onEnterSingleVariantEdit={onEnterSingleVariantEdit}
            onToggleVariantStatus={(variant) => void onToggleVariantStatus(variant)}
            onOpenDeleteVariantConfirm={openDeleteVariantConfirm}
            onSetSingleVariantAttribute={(attributeKey, value) =>
              setSingleVariantDraft((current) =>
                current
                  ? {
                      ...current,
                      attributes: {
                        ...current.attributes,
                        [attributeKey]: value,
                      },
                    }
                  : current,
              )
            }
            onSetSingleVariantPrice={(value) =>
              setSingleVariantDraft((current) => (current ? { ...current, price: value } : current))
            }
            onSetSingleVariantImageUrl={(value) =>
              setSingleVariantDraft((current) => (current ? { ...current, imageUrl: value } : current))
            }
            onSaveSingleVariant={() => void onSaveSingleVariant()}
            onCancelSingleVariantEdit={onRequestCancelSingleEdit}
          />
        </Stack>
      </Paper>

      <ConfirmDialog
        open={Boolean(confirmDialogConfig)}
        title={confirmDialogConfig?.title ?? ''}
        message={confirmDialogConfig?.message ?? ''}
        confirmLabel={confirmDialogConfig?.confirmLabel}
        confirmColor={confirmDialogConfig?.confirmColor}
        cancelLabel={productsUiText.dialogs.cancel}
        isSubmitting={isAnyMutationPending}
        onCancel={() => {
          if (isAnyMutationPending) return
          setPendingConfirmAction(null)
          setPendingDeleteVariantId(null)
        }}
        onConfirm={() => void onConfirmPendingAction()}
      />
    </Stack>
  )
}
