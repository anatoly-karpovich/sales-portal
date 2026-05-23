import { Alert, Button, Paper, Stack, Typography } from '@mui/material'
import { useEffect, useMemo, useState } from 'react'
import { useSnackbar } from 'notistack'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type {
  Product,
  ProductAttribute,
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
  useAddProductVariantsMutation,
  usePatchProductMutation,
  usePatchProductStatusMutation,
  usePatchProductVariantMutation,
  usePatchProductVariantStatusMutation,
  useProductQuery,
  useReorderProductAttributesMutation,
  useReplaceProductVariantsMutation,
} from '@/features/products/hooks/useProductsQuery'
import {
  getAttributeValueNoLongerExistsMessage,
  getDeleteProductDetailsMessage,
  getAttributeValueRequiredMessage,
  getDeleteVariantDetailsMessage,
  getProductApiErrorMessage,
  productsUiText,
} from '@/features/products/products.ui-text'

type VariantEditDraft = {
  variantId: string
  price: string
  imageUrl: string
  attributes: Record<string, string>
}

type NewVariantDraft = {
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
  | 'discard-attributes-order'
  | null

function getErrorStatus(error: unknown) {
  return (error as { response?: { status?: number } })?.response?.status
}

function areSameAttributeOrder(left: ProductAttribute[], right: ProductAttribute[]) {
  if (left.length !== right.length) return false

  return left.every((attribute, index) => attribute.key === right[index]?.key)
}

function normalizeCaseInsensitive(value: string) {
  return value.trim().toLowerCase()
}

function buildNormalizedVariantCombinationKey(attributes: Record<string, string>) {
  return Object.entries(attributes)
    .map(([key, value]) => [normalizeCaseInsensitive(key), normalizeCaseInsensitive(value)] as const)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}:${value}`)
    .join('|')
}

function buildAttributeCombinations(
  attributes: ProductAttribute[],
  index = 0,
  current: Record<string, string> = {},
): Array<Record<string, string>> {
  if (index >= attributes.length) {
    return [current]
  }

  const attribute = attributes[index]
  if (!attribute) return [current]

  const next: Array<Record<string, string>> = []
  for (const value of attribute.values) {
    next.push(
      ...buildAttributeCombinations(attributes, index + 1, {
        ...current,
        [attribute.key]: value,
      }),
    )
  }

  return next
}

function isSameSingleVariantDraft(
  product: Product | undefined,
  singleVariantDraft: VariantEditDraft | null,
  compareAttributes: boolean,
) {
  if (!product || !singleVariantDraft) return false
  const sourceVariant = product.variants.find(
    (variant) => variant._id === singleVariantDraft.variantId,
  )
  if (!sourceVariant) return false

  const sourceSnapshot = JSON.stringify({
    price: String(sourceVariant.price),
    imageUrl: sourceVariant.imageUrl ?? '',
    ...(compareAttributes ? { attributes: sourceVariant.attributes } : {}),
  })
  const draftSnapshot = JSON.stringify({
    price: singleVariantDraft.price,
    imageUrl: singleVariantDraft.imageUrl,
    ...(compareAttributes ? { attributes: singleVariantDraft.attributes } : {}),
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
  const addVariantMutation = useAddProductVariantsMutation()
  const replaceVariantsMutation = useReplaceProductVariantsMutation()
  const reorderAttributesMutation = useReorderProductAttributesMutation()
  const deleteVariantMutation = useDeleteProductVariantMutation()
  const deleteProductMutation = useDeleteProductMutation()

  const [pendingConfirmAction, setPendingConfirmAction] = useState<PendingConfirmAction>(null)
  const [pendingDeleteVariantId, setPendingDeleteVariantId] = useState<string | null>(null)
  const [singleVariantDraft, setSingleVariantDraft] = useState<VariantEditDraft | null>(null)
  const [newVariantDraft, setNewVariantDraft] = useState<NewVariantDraft | null>(null)
  const [categoryDraftId, setCategoryDraftId] = useState<string | null>(null)
  const [attributesOrderDraft, setAttributesOrderDraft] = useState<ProductAttribute[] | null>(null)

  const product = productQuery.data
  useEffect(() => {
    if (!product || !productId) return
    if (product.setup?.completed === false) {
      navigate(`/products/add?productId=${productId}`, { replace: true })
    }
  }, [navigate, product, productId])

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
    addVariantMutation.isPending ||
    replaceVariantsMutation.isPending ||
    reorderAttributesMutation.isPending ||
    deleteVariantMutation.isPending ||
    deleteProductMutation.isPending

  const currentStatus = product?.status ?? 'Draft'
  const isDraftProduct = currentStatus === 'Draft'
  const isParentIdentityEditable = isDraftProduct
  const isSingleVariantAttributesEditable = isDraftProduct
  const canEnterVariantsEdit = isDraftProduct
  const canEnterAttributesOrderMode = !isDraftProduct && (product?.attributes.length ?? 0) > 1
  const isReadOnlyMode = editMode.isViewMode
  const isInteractionsLocked = isAnyMutationPending
  const isEditingDisabled = isAnyMutationPending || (isDraftProduct && !hasConfiguredManufacturers)
  const isCategoryEditingDisabled = isAnyMutationPending
  const isInlineVariantEditorActive = Boolean(singleVariantDraft || newVariantDraft)
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
    (isParentIdentityEditable
      ? !getProductNameError(draftState.draft.name) &&
        draftState.draft.manufacturer.trim().length > 0
      : true) &&
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
    canEnterVariantsEdit &&
    editMode.isVariantsMode &&
    variantsReplaceRequestPayload &&
    (validation.variantsHaveChanges || validation.attributesHaveChanges) &&
    validation.isVariantsDraftValid &&
    hasConfiguredManufacturers &&
    !isInteractionsLocked,
  )

  const canSaveAttributesOrder = Boolean(
    product &&
    editMode.isAttributesOrderMode &&
    attributesOrderDraft &&
    !areSameAttributeOrder(product.attributes, attributesOrderDraft) &&
    !isInteractionsLocked,
  )

  const existingVariantCombinationKeys = useMemo(() => {
    if (!product) return new Set<string>()
    return new Set(
      product.variants.map((variant) => buildNormalizedVariantCombinationKey(variant.attributes)),
    )
  }, [product])

  const allAttributeCombinations = useMemo(
    () => (product ? buildAttributeCombinations(product.attributes) : []),
    [product],
  )

  const firstAvailableVariantCombination = useMemo(() => {
    if (!product) return null

    for (const combination of allAttributeCombinations) {
      const key = buildNormalizedVariantCombinationKey(combination)
      if (!existingVariantCombinationKeys.has(key)) {
        return combination
      }
    }

    return null
  }, [allAttributeCombinations, existingVariantCombinationKeys, product])

  const hasUnfilledCombinations = Boolean(firstAvailableVariantCombination)
  const canAddVariantInReadMode = Boolean(
    product &&
    !isDraftProduct &&
    isReadOnlyMode &&
    hasUnfilledCombinations &&
    !isInlineVariantEditorActive &&
    !isInteractionsLocked,
  )

  const singleVariantError = (() => {
    if (!singleVariantDraft || !product) return ''

    const priceError = validatePrice(singleVariantDraft.price)
    if (priceError) return priceError
    if (singleVariantDraft.imageUrl.trim() && !isValidHttpUrl(singleVariantDraft.imageUrl.trim())) {
      return productsUiText.detailsPage.validation.variantImageUrlInvalid
    }

    if (isSingleVariantAttributesEditable) {
      for (const attribute of product.attributes) {
        const value = singleVariantDraft.attributes[attribute.key]
        if (!value) {
          return getAttributeValueRequiredMessage(attribute.name)
        }
        const belongs = attribute.values.some(
          (item) => item.trim().toLowerCase() === value.trim().toLowerCase(),
        )
        if (!belongs) {
          return getAttributeValueNoLongerExistsMessage(attribute.name, value)
        }
      }

      const currentCombinationKey = buildVariantCombinationKey(singleVariantDraft.attributes)

      const duplicateExists = product.variants.some((variant) => {
        if (variant._id === singleVariantDraft.variantId) return false
        return buildVariantCombinationKey(variant.attributes) === currentCombinationKey
      })

      if (duplicateExists) {
        return productsUiText.detailsPage.validation.duplicateVariantCombination
      }
    }

    return ''
  })()

  const singleVariantHasChanges = useMemo(
    () => !isSameSingleVariantDraft(product, singleVariantDraft, isSingleVariantAttributesEditable),
    [isSingleVariantAttributesEditable, product, singleVariantDraft],
  )

  const canSaveSingleVariant = Boolean(
    editMode.isSingleVariantMode &&
    singleVariantDraft &&
    singleVariantHasChanges &&
    !singleVariantError &&
    !isInteractionsLocked,
  )

  const newVariantError = (() => {
    if (!newVariantDraft || !product) return ''

    const priceError = validatePrice(newVariantDraft.price)
    if (priceError) return priceError
    if (newVariantDraft.imageUrl.trim() && !isValidHttpUrl(newVariantDraft.imageUrl.trim())) {
      return productsUiText.detailsPage.validation.variantImageUrlInvalid
    }

    for (const attribute of product.attributes) {
      const value = newVariantDraft.attributes[attribute.key]
      if (!value) {
        return getAttributeValueRequiredMessage(attribute.name)
      }
      const belongs = attribute.values.some(
        (item) => normalizeCaseInsensitive(item) === normalizeCaseInsensitive(value),
      )
      if (!belongs) {
        return getAttributeValueNoLongerExistsMessage(attribute.name, value)
      }
    }

    const newCombinationKey = buildNormalizedVariantCombinationKey(newVariantDraft.attributes)
    if (existingVariantCombinationKeys.has(newCombinationKey)) {
      return productsUiText.detailsPage.validation.duplicateVariantCombination
    }

    return ''
  })()

  const canSaveNewVariant = Boolean(
    !isDraftProduct && isReadOnlyMode && newVariantDraft && !newVariantError && !isInteractionsLocked,
  )

  const onEnterInfoEdit = () => {
    if (
      !isReadOnlyMode ||
      isInlineVariantEditorActive ||
      isInteractionsLocked ||
      (isDraftProduct && !hasConfiguredManufacturers)
    )
      return
    draftState.startEditing()
    editMode.enterInfoMode()
  }

  const onEnterCategoryEdit = () => {
    if (
      !product ||
      !isReadOnlyMode ||
      isInlineVariantEditorActive ||
      isInteractionsLocked ||
      categoriesQuery.isLoading ||
      categoriesQuery.isError
    ) {
      return
    }
    setCategoryDraftId(product.categoryId)
    editMode.enterCategoryMode()
  }

  const onEnterVariantsEdit = () => {
    if (
      !canEnterVariantsEdit ||
      !isReadOnlyMode ||
      isInlineVariantEditorActive ||
      isInteractionsLocked ||
      (isDraftProduct && !hasConfiguredManufacturers)
    ) {
      return
    }
    draftState.startEditing()
    editMode.enterVariantsMode()
  }

  const onEnterAttributesOrderEdit = () => {
    if (
      !product ||
      !canEnterAttributesOrderMode ||
      !isReadOnlyMode ||
      isInlineVariantEditorActive ||
      isInteractionsLocked ||
      (isDraftProduct && !hasConfiguredManufacturers)
    ) {
      return
    }

    setAttributesOrderDraft(product.attributes.map((attribute) => ({ ...attribute })))
    editMode.enterAttributesOrderMode()
  }

  const onEnterSingleVariantEdit = (variant: ProductVariant) => {
    if (
      !variant._id ||
      !isReadOnlyMode ||
      isInlineVariantEditorActive ||
      isInteractionsLocked ||
      (isDraftProduct && !hasConfiguredManufacturers)
    )
      return
    setSingleVariantDraft({
      variantId: variant._id,
      price: String(variant.price),
      imageUrl: variant.imageUrl ?? '',
      attributes: { ...variant.attributes },
    })
    editMode.enterSingleVariantMode(variant._id)
  }

  const onStartAddVariantInReadMode = () => {
    if (!canAddVariantInReadMode || !firstAvailableVariantCombination) return

    setNewVariantDraft({
      price: '',
      imageUrl: '',
      attributes: firstAvailableVariantCombination,
    })
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

  const onCancelNewVariant = () => {
    setNewVariantDraft(null)
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

    if (pendingConfirmAction === 'discard-attributes-order') {
      setAttributesOrderDraft(null)
      editMode.exitEditModes()
      setPendingConfirmAction(null)
      return
    }

    if (pendingConfirmAction === 'delete-product') {
      try {
        await deleteProductMutation.mutateAsync(product._id)
        enqueueSnackbar(productsUiText.toasts.deleted, { variant: 'success' })
        navigate('/products')
      } catch {
        setPendingConfirmAction(null)
        setPendingDeleteVariantId(null)
        enqueueSnackbar(productsUiText.toasts.deletePurchasedBlocked, { variant: 'error' })
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
      } catch {
        setPendingDeleteVariantId(null)
        setPendingConfirmAction(null)
        enqueueSnackbar(productsUiText.toasts.deletePurchasedVariantBlocked, { variant: 'error' })
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
      const payload = isParentIdentityEditable
        ? {
            name: draftState.draft.name.trim(),
            manufacturer: draftState.draft.manufacturer.trim(),
            description: draftState.draft.description.trim(),
            imageUrl: draftState.draft.imageUrl.trim(),
          }
        : {
            description: draftState.draft.description.trim(),
            imageUrl: draftState.draft.imageUrl.trim(),
          }

      await patchProductMutation.mutateAsync({
        productId: product._id,
        payload,
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
    if (
      !product ||
      !variant._id ||
      !isReadOnlyMode ||
      isInlineVariantEditorActive ||
      isInteractionsLocked ||
      (isDraftProduct && !hasConfiguredManufacturers)
    ) {
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
      ...(singleVariantDraft.imageUrl.trim()
        ? { imageUrl: singleVariantDraft.imageUrl.trim() }
        : {}),
      ...(isSingleVariantAttributesEditable ? { attributes: singleVariantDraft.attributes } : {}),
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

  const onSaveNewVariant = async () => {
    if (!product || !newVariantDraft || !canSaveNewVariant) return

    try {
      await addVariantMutation.mutateAsync({
        productId: product._id,
        payload: [
          {
            price: Number(newVariantDraft.price),
            attributes: newVariantDraft.attributes,
            ...(newVariantDraft.imageUrl.trim()
              ? { imageUrl: newVariantDraft.imageUrl.trim() }
              : {}),
          },
        ],
      })
      enqueueSnackbar(productsUiText.toasts.variantAdded, { variant: 'success' })
      setNewVariantDraft(null)
    } catch (error) {
      enqueueSnackbar(getProductApiErrorMessage(getErrorStatus(error)), { variant: 'error' })
    }
  }

  const openDeleteVariantConfirm = (variantId?: string) => {
    if (
      !variantId ||
      !product ||
      product.variants.length <= 1 ||
      !isReadOnlyMode ||
      isInlineVariantEditorActive ||
      isEditingDisabled
    ) {
      return
    }
    setPendingDeleteVariantId(variantId)
    setPendingConfirmAction('delete-variant')
  }

  const onMoveAttributeOrder = (fromIndex: number, toIndex: number) => {
    setAttributesOrderDraft((current) => {
      if (!current) return current
      if (fromIndex === toIndex) return current
      if (fromIndex < 0 || toIndex < 0) return current
      if (fromIndex >= current.length || toIndex >= current.length) return current

      const next = [...current]
      const [moved] = next.splice(fromIndex, 1)
      next.splice(toIndex, 0, moved)
      return next
    })
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

  const onSaveAttributesOrder = async () => {
    if (!product || !attributesOrderDraft || !canSaveAttributesOrder) return

    try {
      await reorderAttributesMutation.mutateAsync({
        productId: product._id,
        payload: {
          attributes: attributesOrderDraft,
        },
      })
      enqueueSnackbar(productsUiText.toasts.updated, { variant: 'success' })
      setAttributesOrderDraft(null)
      editMode.exitEditModes()
    } catch (error) {
      enqueueSnackbar(getProductApiErrorMessage(getErrorStatus(error)), { variant: 'error' })
    }
  }

  const onRequestCancelAttributesOrderEdit = () => {
    if (!product || !editMode.isAttributesOrderMode || !attributesOrderDraft) return

    if (!areSameAttributeOrder(product.attributes, attributesOrderDraft)) {
      setPendingConfirmAction('discard-attributes-order')
      return
    }

    setAttributesOrderDraft(null)
    editMode.exitEditModes()
  }

  if (product.setup?.completed === false) {
    return <ProductDetailsSkeleton />
  }

  const confirmDialogConfig =
    pendingConfirmAction === 'delete-product'
      ? {
          title: productsUiText.detailsPage.dialogs.deleteProductTitle,
          message: getDeleteProductDetailsMessage(product.name),
          confirmLabel: productsUiText.detailsPage.dialogs.deleteProductConfirm,
          confirmColor: 'error' as const,
        }
      : pendingConfirmAction === 'delete-variant'
        ? {
            title: productsUiText.detailsPage.dialogs.deleteVariantTitle,
            message: getDeleteVariantDetailsMessage(
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
              message: productsUiText.detailsPage.dialogs.activateMessage,
              confirmLabel: productsUiText.detailsPage.dialogs.activateConfirm,
              confirmColor: 'primary' as const,
            }
          : pendingConfirmAction === 'archive-product'
            ? {
                title: productsUiText.detailsPage.dialogs.archiveTitle,
                message: productsUiText.detailsPage.dialogs.archiveMessage,
                confirmLabel: productsUiText.detailsPage.dialogs.archiveConfirm,
                confirmColor: 'warning' as const,
              }
            : pendingConfirmAction === 'discard-bulk' ||
                pendingConfirmAction === 'discard-single' ||
                pendingConfirmAction === 'discard-category' ||
                pendingConfirmAction === 'discard-attributes-order'
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

      {isDraftProduct && !hasConfiguredManufacturers ? (
        <Alert
          severity="warning"
          data-testid="product-details-page-manufacturers-unavailable-alert"
        >
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
            isParentIdentityEditable={isParentIdentityEditable}
            isReadOnlyMode={isReadOnlyMode}
            isEditingDisabled={isEditingDisabled || isInlineVariantEditorActive}
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
            isEditingDisabled={isCategoryEditingDisabled || isInlineVariantEditorActive}
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
            isAttributesOrderMode={editMode.isAttributesOrderMode}
            isReadOnlyMode={isReadOnlyMode}
            isEditingDisabled={isEditingDisabled || isInlineVariantEditorActive}
            isInteractionsLocked={isInteractionsLocked}
            isSingleVariantAttributesEditable={isSingleVariantAttributesEditable}
            canEnterVariantsEdit={canEnterVariantsEdit}
            canEnterAttributesOrderMode={canEnterAttributesOrderMode}
            canSaveAttributesOrder={canSaveAttributesOrder}
            attributesOrderDraft={attributesOrderDraft}
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
            canAddVariantInReadMode={canAddVariantInReadMode}
            newVariantDraft={newVariantDraft}
            newVariantError={newVariantError}
            canSaveNewVariant={canSaveNewVariant}
            onEnterVariantsMode={onEnterVariantsEdit}
            onEnterAttributesOrderMode={onEnterAttributesOrderEdit}
            onMoveAttributeOrder={onMoveAttributeOrder}
            onSaveAttributesOrder={() => void onSaveAttributesOrder()}
            onCancelAttributesOrder={onRequestCancelAttributesOrderEdit}
            onAddVariant={draftState.addVariant}
            onGenerateAllCombinations={draftState.generateAllCombinations}
            onRemoveInvalidVariants={() =>
              draftState.removeVariantsByIds(validation.invalidVariantIds)
            }
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
              setSingleVariantDraft((current) =>
                current ? { ...current, imageUrl: value } : current,
              )
            }
            onSaveSingleVariant={() => void onSaveSingleVariant()}
            onCancelSingleVariantEdit={onRequestCancelSingleEdit}
            onStartAddVariantInReadMode={onStartAddVariantInReadMode}
            onSetNewVariantAttribute={(attributeKey, value) =>
              setNewVariantDraft((current) =>
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
            onSetNewVariantPrice={(value) =>
              setNewVariantDraft((current) => (current ? { ...current, price: value } : current))
            }
            onSetNewVariantImageUrl={(value) =>
              setNewVariantDraft((current) => (current ? { ...current, imageUrl: value } : current))
            }
            onSaveNewVariant={() => void onSaveNewVariant()}
            onCancelNewVariant={onCancelNewVariant}
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
