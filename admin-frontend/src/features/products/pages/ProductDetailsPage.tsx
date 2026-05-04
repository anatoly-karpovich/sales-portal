import AddRoundedIcon from '@mui/icons-material/AddRounded'
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import KeyboardBackspaceRoundedIcon from '@mui/icons-material/KeyboardBackspaceRounded'
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  IconButton,
  MenuItem,
  Paper,
  Skeleton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { useMemo, useState } from 'react'
import { useSnackbar } from 'notistack'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type {
  ProductAttribute,
  Product,
  ProductStatus,
  ProductUpsertPayload,
  ProductVariant,
  ProductVariantPatchPayload,
  ProductVariantReplacePayload,
  ProductVariantReplaceRequestPayload,
  ProductVariantStatus,
} from '@/api/modules/products.api'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { useManufacturerOptions } from '@/features/products/hooks/useManufacturerOptions'
import {
  useDeleteProductMutation,
  useDeleteProductVariantMutation,
  usePatchProductStatusMutation,
  usePatchProductVariantStatusMutation,
  usePatchProductMutation,
  usePatchProductVariantMutation,
  useProductQuery,
  useReplaceProductVariantsMutation,
  useUpdateProductMutation,
} from '@/features/products/hooks/useProductsQuery'
import {
  getDeleteProductMessage,
  getProductApiErrorMessage,
  getDeleteVariantMessage,
  productsUiText,
} from '@/features/products/products.ui-text'
import { formatDate } from '@/utils/date'
import { formatPrice } from '@/utils/number'

type AttributeDraft = {
  id: string
  name: string
  values: string[]
  inputValue: string
}

type VariantDraft = {
  id: string
  variantId?: string
  price: string
  status: ProductVariantStatus
  imageUrl: string
  attributesByAttributeId: Record<string, string>
}

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
  | null

type BulkEditScope = 'info' | 'full' | 'variants' | null

function getErrorStatus(error: unknown) {
  return (error as { response?: { status?: number } })?.response?.status
}

function createLocalId() {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2)
}

function normalizeAttributeKey(value: string) {
  return value.trim().toLowerCase()
}

function normalizeValues(values: string[]) {
  const normalized: string[] = []
  const unique = new Set<string>()

  values.forEach((value) => {
    const item = value.trim()
    if (!item) return
    const dedupeKey = item.toLowerCase()
    if (unique.has(dedupeKey)) return
    unique.add(dedupeKey)
    normalized.push(item)
  })

  return normalized
}

function parseCommaSeparatedValues(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function applyAttributeValuesToVariants(
  variants: VariantDraft[],
  attributeId: string,
  nextValues: string[],
) {
  const normalizedNextValues = normalizeValues(nextValues)
  const fallbackValue = normalizedNextValues[0] ?? ''
  const allowedValues = new Set(normalizedNextValues.map((value) => value.toLowerCase()))

  return variants.map((variant) => {
    const currentValue = (variant.attributesByAttributeId[attributeId] ?? '').trim()
    const isCurrentAllowed = currentValue
      ? allowedValues.has(currentValue.toLowerCase())
      : false

    if (isCurrentAllowed) {
      return variant
    }

    return {
      ...variant,
      attributesByAttributeId: {
        ...variant.attributesByAttributeId,
        [attributeId]: fallbackValue,
      },
    }
  })
}

function isValidHttpUrl(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function buildPossibleCombinations(attributes: AttributeDraft[]) {
  if (attributes.length === 0) {
    return [{}]
  }

  const prepared = attributes
    .map((attribute) => ({
      id: attribute.id,
      key: normalizeAttributeKey(attribute.name),
      values: normalizeValues(attribute.values),
    }))
    .filter((attribute) => attribute.key.length > 0)

  if (prepared.length !== attributes.length || prepared.length === 0) return []
  if (prepared.some((attribute) => attribute.values.length === 0)) return []

  const uniqueKeys = new Set(prepared.map((attribute) => attribute.key))
  if (uniqueKeys.size !== prepared.length) return []

  return prepared.reduce<Array<Record<string, string>>>(
    (accumulator, attribute) => {
      const next: Array<Record<string, string>> = []
      accumulator.forEach((base) => {
        attribute.values.forEach((value) => {
          next.push({
            ...base,
            [attribute.id]: value,
          })
        })
      })
      return next
    },
    [{}],
  )
}

function buildVariantCombinationKey(attributes: Record<string, string>) {
  return Object.keys(attributes)
    .sort()
    .map((attributeId) => `${attributeId}:${attributes[attributeId]}`)
    .join('|')
}

function buildVariantDuplicateCounts(variants: VariantDraft[]) {
  const counts = new Map<string, number>()
  variants.forEach((variant) => {
    const key = buildVariantCombinationKey(variant.attributesByAttributeId)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  })
  return counts
}

function toVariantTitle(
  variant: ProductVariant | VariantDraft,
  attributes: Array<{ key: string; name: string }> | AttributeDraft[],
) {
  const source = 'attributesByAttributeId' in variant ? variant.attributesByAttributeId : variant.attributes
  const parts = attributes
    .map((attribute) => {
      const key = 'id' in attribute ? attribute.id : attribute.key
      const value = source[key]
      return value ? value : null
    })
    .filter(Boolean)

  return parts.length > 0 ? parts.join(' | ') : ''
}

function toBulkDraft(product: Product) {
  const attributes: AttributeDraft[] = product.attributes.map((attribute) => ({
    id: attribute.key,
    name: attribute.name,
    values: [...attribute.values],
    inputValue: '',
  }))

  const variants: VariantDraft[] = product.variants.map((variant) => {
    const attributesByAttributeId: Record<string, string> = {}
    attributes.forEach((attribute) => {
      attributesByAttributeId[attribute.id] = variant.attributes[attribute.id] ?? ''
    })

    return {
      id: createLocalId(),
      variantId: variant._id,
      price: String(variant.price),
      status: variant.status,
      imageUrl: variant.imageUrl ?? '',
      attributesByAttributeId,
    }
  })

  return {
    name: product.name,
    manufacturer: product.manufacturer,
    category: product.category,
    description: product.description ?? '',
    imageUrl: product.imageUrl ?? '',
    attributes,
    variants,
  }
}

function buildAttributesPayloadFromDraft(draft: ReturnType<typeof toBulkDraft>): ProductAttribute[] {
  return draft.attributes.map((attribute) => ({
    key: normalizeAttributeKey(attribute.name),
    name: attribute.name.trim(),
    values: normalizeValues(attribute.values),
  }))
}

function buildVariantsReplacePayloadFromDraft(
  draft: ReturnType<typeof toBulkDraft>,
): ProductVariantReplacePayload[] {
  const normalizedAttributes = draft.attributes.map((attribute) => ({
    id: attribute.id,
    key: normalizeAttributeKey(attribute.name),
  }))

  return draft.variants.map((variant) => {
    const mappedAttributes: Record<string, string> = {}
    normalizedAttributes.forEach((attribute) => {
      mappedAttributes[attribute.key] = variant.attributesByAttributeId[attribute.id] ?? ''
    })

    return {
      ...(variant.variantId ? { _id: variant.variantId } : {}),
      price: Number(variant.price),
      attributes: mappedAttributes,
      ...(variant.imageUrl.trim() ? { imageUrl: variant.imageUrl.trim() } : {}),
    }
  })
}

function buildFullProductPayloadFromDraft(
  draft: ReturnType<typeof toBulkDraft>,
): ProductUpsertPayload {
  return {
    name: draft.name.trim(),
    manufacturer: draft.manufacturer.trim(),
    category: draft.category.trim(),
    ...(draft.description.trim() ? { description: draft.description.trim() } : {}),
    ...(draft.imageUrl.trim() ? { imageUrl: draft.imageUrl.trim() } : {}),
    attributes: buildAttributesPayloadFromDraft(draft),
    variants: buildVariantsReplacePayloadFromDraft(draft),
  }
}

function getAttributesValidationError(draft: ReturnType<typeof toBulkDraft>): string {
  const normalizedKeys = new Set<string>()
  for (const attribute of draft.attributes) {
    const name = attribute.name.trim()
    if (!name) {
      return 'Attribute name is required.'
    }

    const key = normalizeAttributeKey(name)
    if (normalizedKeys.has(key)) {
      return 'Attribute names must be unique.'
    }
    normalizedKeys.add(key)

    if (normalizeValues(attribute.values).length === 0) {
      return `${name}: at least one value is required.`
    }
  }

  return ''
}

function ProductDetailsSkeleton() {
  return (
    <Stack spacing={2.5} data-testid="product-details-page-skeleton">
      <Skeleton variant="text" width={220} height={36} />
      <Paper sx={{ p: { xs: 2, md: 3 } }}>
        <Stack spacing={2}>
          <Skeleton variant="text" width={240} height={38} />
          <Skeleton variant="text" width={540} height={28} />
          <Skeleton variant="rounded" height={220} />
          <Skeleton variant="rounded" height={260} />
        </Stack>
      </Paper>
    </Stack>
  )
}

export function ProductDetailsPage() {
  const navigate = useNavigate()
  const { enqueueSnackbar } = useSnackbar()
  const { productId } = useParams<{ productId: string }>()
  const {
    options: manufacturerOptions,
    isLoading: isManufacturersLoading,
    isConfigured: hasConfiguredManufacturers,
  } = useManufacturerOptions()

  const productQuery = useProductQuery(productId ?? '', Boolean(productId))
  const patchProductMutation = usePatchProductMutation()
  const updateProductMutation = useUpdateProductMutation()
  const patchProductStatusMutation = usePatchProductStatusMutation()
  const patchVariantMutation = usePatchProductVariantMutation()
  const patchVariantStatusMutation = usePatchProductVariantStatusMutation()
  const replaceVariantsMutation = useReplaceProductVariantsMutation()
  const deleteVariantMutation = useDeleteProductVariantMutation()
  const deleteProductMutation = useDeleteProductMutation()

  const [bulkEditScope, setBulkEditScope] = useState<BulkEditScope>(null)
  const [bulkDraft, setBulkDraft] = useState<ReturnType<typeof toBulkDraft> | null>(null)
  const [singleVariantDraft, setSingleVariantDraft] = useState<VariantEditDraft | null>(null)
  const [pendingConfirmAction, setPendingConfirmAction] = useState<PendingConfirmAction>(null)
  const [pendingDeleteVariantId, setPendingDeleteVariantId] = useState<string | null>(null)

  const product = productQuery.data
  const isAnyMutationPending =
    updateProductMutation.isPending ||
    patchProductMutation.isPending ||
    patchProductStatusMutation.isPending ||
    patchVariantMutation.isPending ||
    patchVariantStatusMutation.isPending ||
    replaceVariantsMutation.isPending ||
    deleteVariantMutation.isPending ||
    deleteProductMutation.isPending

  const isBulkEditMode = bulkEditScope !== null
  const isInfoEditMode = bulkEditScope === 'info'
  const isFullEditMode = bulkEditScope === 'full'
  const isVariantsEditMode = bulkEditScope === 'variants'
  const isBulkVariantsEditorMode = isFullEditMode || isVariantsEditMode
  const isSingleEditMode = Boolean(singleVariantDraft)
  const isReadOnlyMode = !isBulkEditMode && !isSingleEditMode
  const isInteractionsLocked = isAnyMutationPending
  const isEditingDisabled = isAnyMutationPending || !hasConfiguredManufacturers

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

  const baseBulkDraft = useMemo(
    () => (product ? toBulkDraft(product) : null),
    [product],
  )

  const effectiveBulkDraft = bulkDraft ?? baseBulkDraft

  const parentPatchPayload = useMemo(() => {
    if (!effectiveBulkDraft) return null

    return {
      name: effectiveBulkDraft.name.trim(),
      manufacturer: effectiveBulkDraft.manufacturer.trim(),
      category: effectiveBulkDraft.category.trim(),
      description: effectiveBulkDraft.description.trim(),
      imageUrl: effectiveBulkDraft.imageUrl.trim(),
    }
  }, [effectiveBulkDraft])

  const baseParentPayload = useMemo(() => {
    if (!baseBulkDraft) return null

    return {
      name: baseBulkDraft.name.trim(),
      manufacturer: baseBulkDraft.manufacturer.trim(),
      category: baseBulkDraft.category.trim(),
      description: baseBulkDraft.description.trim(),
      imageUrl: baseBulkDraft.imageUrl.trim(),
    }
  }, [baseBulkDraft])

  const parentHasChanges = useMemo(() => {
    if (!parentPatchPayload || !baseParentPayload) return false
    return JSON.stringify(parentPatchPayload) !== JSON.stringify(baseParentPayload)
  }, [baseParentPayload, parentPatchPayload])

  const attributesPayload = useMemo(
    () => (effectiveBulkDraft ? buildAttributesPayloadFromDraft(effectiveBulkDraft) : null),
    [effectiveBulkDraft],
  )
  const baseAttributesPayload = useMemo(
    () => (baseBulkDraft ? buildAttributesPayloadFromDraft(baseBulkDraft) : null),
    [baseBulkDraft],
  )

  const attributesHaveChanges = useMemo(() => {
    if (!attributesPayload || !baseAttributesPayload) return false
    return JSON.stringify(attributesPayload) !== JSON.stringify(baseAttributesPayload)
  }, [attributesPayload, baseAttributesPayload])

  const variantsReplacePayload = useMemo(() => {
    if (!effectiveBulkDraft) return null
    return buildVariantsReplacePayloadFromDraft(effectiveBulkDraft)
  }, [effectiveBulkDraft])

  const baseVariantsReplacePayload = useMemo(() => {
    if (!baseBulkDraft) return null
    return buildVariantsReplacePayloadFromDraft(baseBulkDraft)
  }, [baseBulkDraft])

  const variantsHaveChanges = useMemo(() => {
    if (!variantsReplacePayload || !baseVariantsReplacePayload) return false
    return JSON.stringify(variantsReplacePayload) !== JSON.stringify(baseVariantsReplacePayload)
  }, [baseVariantsReplacePayload, variantsReplacePayload])

  const fullProductPayload = useMemo(
    () => (effectiveBulkDraft ? buildFullProductPayloadFromDraft(effectiveBulkDraft) : null),
    [effectiveBulkDraft],
  )
  const baseFullProductPayload = useMemo(
    () => (baseBulkDraft ? buildFullProductPayloadFromDraft(baseBulkDraft) : null),
    [baseBulkDraft],
  )
  const fullProductHasChanges = useMemo(() => {
    if (!fullProductPayload || !baseFullProductPayload) return false
    return JSON.stringify(fullProductPayload) !== JSON.stringify(baseFullProductPayload)
  }, [fullProductPayload, baseFullProductPayload])

  const variantsReplaceRequestPayload = useMemo(() => {
    if (!variantsReplacePayload) return null

    const payload: ProductVariantReplaceRequestPayload = {
      variants: variantsReplacePayload,
    }

    if (attributesHaveChanges && attributesPayload) {
      payload.attributes = attributesPayload
    }

    return payload
  }, [attributesHaveChanges, attributesPayload, variantsReplacePayload])

  const possibleCombinations = useMemo(
    () => (effectiveBulkDraft ? buildPossibleCombinations(effectiveBulkDraft.attributes) : []),
    [effectiveBulkDraft],
  )

  const hasReachedMaxVariants = useMemo(() => {
    if (!effectiveBulkDraft || possibleCombinations.length === 0) return false
    return effectiveBulkDraft.variants.length >= possibleCombinations.length
  }, [effectiveBulkDraft, possibleCombinations.length])

  const bulkVariantErrors = useMemo(() => {
    if (!effectiveBulkDraft) return new Map<string, string>()
    const duplicateCounts = buildVariantDuplicateCounts(effectiveBulkDraft.variants)
    const errors = new Map<string, string>()

    effectiveBulkDraft.variants.forEach((variant) => {
      let error = ''

      for (const attribute of effectiveBulkDraft.attributes) {
        const attributeName = attribute.name.trim()
        if (!attributeName) {
          error = 'Attribute name is required.'
          break
        }
        const selectedValue = variant.attributesByAttributeId[attribute.id]
        if (!selectedValue) {
          error = `${attributeName}: value is required.`
          break
        }
        const hasValue = attribute.values.some(
          (value) => value.trim().toLowerCase() === selectedValue.trim().toLowerCase(),
        )
        if (!hasValue) {
          error = `${attributeName}: ${selectedValue} no longer exists in attribute values.`
          break
        }
      }

      if (!error) {
        const duplicateCount = duplicateCounts.get(
          buildVariantCombinationKey(variant.attributesByAttributeId),
        )
        if ((duplicateCount ?? 0) > 1) {
          error = 'Variant with this attribute combination already exists.'
        }
      }

      if (!error) {
        if (!variant.price.trim() || Number(variant.price) <= 0) {
          error = 'Price should be greater than 0.'
        } else if (!/^\d+(\.\d{1,2})?$/.test(variant.price.trim())) {
          error = 'Price can have max 2 decimal places.'
        }
      }

      if (!error && variant.imageUrl.trim() && !isValidHttpUrl(variant.imageUrl.trim())) {
        error = 'Variant image URL must be a valid http(s) URL.'
      }

      errors.set(variant.id, error)
    })

    return errors
  }, [effectiveBulkDraft])

  const invalidVariantsCount = useMemo(() => {
    if (!effectiveBulkDraft) return 0
    return effectiveBulkDraft.variants.reduce((count, variant) => {
      const error = bulkVariantErrors.get(variant.id)
      return error ? count + 1 : count
    }, 0)
  }, [bulkVariantErrors, effectiveBulkDraft])

  const attributesValidationError = useMemo(
    () => (effectiveBulkDraft ? getAttributesValidationError(effectiveBulkDraft) : ''),
    [effectiveBulkDraft],
  )

  const isParentImageValid = useMemo(() => {
    if (!effectiveBulkDraft) return true
    return !effectiveBulkDraft.imageUrl.trim() || isValidHttpUrl(effectiveBulkDraft.imageUrl.trim())
  }, [effectiveBulkDraft])

  const isVariantsDraftValid = Boolean(
    effectiveBulkDraft &&
      effectiveBulkDraft.variants.length > 0 &&
      invalidVariantsCount === 0 &&
      !attributesValidationError,
  )

  const canSaveVariants = Boolean(
    bulkEditScope === 'variants' &&
      variantsReplaceRequestPayload &&
      (variantsHaveChanges || attributesHaveChanges) &&
      isVariantsDraftValid &&
      hasConfiguredManufacturers &&
      !isInteractionsLocked,
  )

  const canSaveInfo = Boolean(
    bulkEditScope === 'info' &&
      parentPatchPayload &&
      parentPatchPayload.name.length > 0 &&
      parentPatchPayload.manufacturer.length > 0 &&
      parentPatchPayload.category.length > 0 &&
      isParentImageValid &&
      parentHasChanges &&
      hasConfiguredManufacturers &&
      !isInteractionsLocked,
  )

  const canSaveFull = Boolean(
    bulkEditScope === 'full' &&
      fullProductPayload &&
      fullProductPayload.name.length > 0 &&
      fullProductPayload.manufacturer.length > 0 &&
      fullProductPayload.category.length > 0 &&
      isParentImageValid &&
      isVariantsDraftValid &&
      fullProductHasChanges &&
      hasConfiguredManufacturers &&
      !isInteractionsLocked,
  )

  const singleEditingVariant = useMemo(() => {
    if (!product || !singleVariantDraft) return null
    return product.variants.find((variant) => variant._id === singleVariantDraft.variantId) ?? null
  }, [product, singleVariantDraft])

  const singleVariantError = useMemo(() => {
    if (!singleVariantDraft || !product) return ''
    if (!singleVariantDraft.price.trim() || Number(singleVariantDraft.price) <= 0) {
      return 'Price should be greater than 0.'
    }
    if (!/^\d+(\.\d{1,2})?$/.test(singleVariantDraft.price.trim())) {
      return 'Price can have max 2 decimal places.'
    }
    if (
      singleVariantDraft.imageUrl.trim() &&
      !isValidHttpUrl(singleVariantDraft.imageUrl.trim())
    ) {
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

    const currentCombinationKey = buildVariantCombinationKey(
      Object.fromEntries(
        Object.keys(singleVariantDraft.attributes).map((key) => [
          key,
          singleVariantDraft.attributes[key],
        ]),
      ),
    )

    const duplicateExists = product.variants.some((variant) => {
      if (variant._id === singleVariantDraft.variantId) return false
      const combinationKey = buildVariantCombinationKey(
        Object.fromEntries(Object.keys(variant.attributes).map((key) => [key, variant.attributes[key]])),
      )
      return combinationKey === currentCombinationKey
    })

    if (duplicateExists) {
      return 'Variant with this attribute combination already exists.'
    }

    return ''
  }, [product, singleVariantDraft])

  const singleVariantHasChanges = useMemo(() => {
    if (!singleVariantDraft || !singleEditingVariant) return false
    const initialSnapshot = JSON.stringify({
      price: String(singleEditingVariant.price),
      imageUrl: singleEditingVariant.imageUrl ?? '',
      attributes: singleEditingVariant.attributes,
    })
    const currentSnapshot = JSON.stringify({
      price: singleVariantDraft.price,
      imageUrl: singleVariantDraft.imageUrl,
      attributes: singleVariantDraft.attributes,
    })
    return initialSnapshot !== currentSnapshot
  }, [singleEditingVariant, singleVariantDraft])

  const canSaveSingleVariant = Boolean(
    singleVariantDraft && singleVariantHasChanges && !singleVariantError && !isInteractionsLocked,
  )

  const attributeErrors = useMemo(() => {
    if (!effectiveBulkDraft) return new Map<string, string>()

    const countsByName = new Map<string, number>()
    effectiveBulkDraft.attributes.forEach((attribute) => {
      const key = normalizeAttributeKey(attribute.name)
      if (!key) return
      countsByName.set(key, (countsByName.get(key) ?? 0) + 1)
    })

    const errors = new Map<string, string>()
    effectiveBulkDraft.attributes.forEach((attribute) => {
      const name = attribute.name.trim()
      if (!name) {
        errors.set(attribute.id, 'Attribute name is required.')
        return
      }

      if ((countsByName.get(normalizeAttributeKey(attribute.name)) ?? 0) > 1) {
        errors.set(attribute.id, 'Attribute name must be unique.')
        return
      }

      if (normalizeValues(attribute.values).length === 0) {
        errors.set(attribute.id, 'At least one value is required.')
      }
    })

    return errors
  }, [effectiveBulkDraft])

  const handleAddAttribute = () => {
    setBulkDraft((current) => {
      if (!current) return current
      const attributeId = createLocalId()
      return {
        ...current,
        attributes: [
          ...current.attributes,
          { id: attributeId, name: '', values: [], inputValue: '' },
        ],
        variants: current.variants.map((variant) => ({
          ...variant,
          attributesByAttributeId: {
            ...variant.attributesByAttributeId,
            [attributeId]: '',
          },
        })),
      }
    })
  }

  const handleAttributeNameChange = (attributeId: string, nextName: string) => {
    setBulkDraft((current) =>
      current
        ? {
            ...current,
            attributes: current.attributes.map((item) =>
              item.id === attributeId ? { ...item, name: nextName } : item,
            ),
          }
        : current,
    )
  }

  const commitAttributeValues = (attributeId: string, rawValues: string[]) => {
    const nextValues = normalizeValues(rawValues.flatMap(parseCommaSeparatedValues))
    setBulkDraft((current) =>
      current
        ? {
            ...current,
            attributes: current.attributes.map((item) =>
              item.id === attributeId
                ? {
                    ...item,
                    values: nextValues,
                    inputValue: '',
                  }
                : item,
            ),
            variants: applyAttributeValuesToVariants(current.variants, attributeId, nextValues),
          }
        : current,
    )
  }

  const handleAttributeInputChange = (attributeId: string, inputValue: string) => {
    setBulkDraft((current) =>
      current
        ? {
            ...current,
            attributes: current.attributes.map((item) =>
              item.id === attributeId ? { ...item, inputValue } : item,
            ),
          }
        : current,
    )
  }

  const handleAttributeInputCommit = (attributeId: string) => {
    const target = effectiveBulkDraft?.attributes.find((attribute) => attribute.id === attributeId)
    if (!target) return
    commitAttributeValues(attributeId, [...target.values, ...parseCommaSeparatedValues(target.inputValue)])
  }

  const handleRemoveAttribute = (attributeId: string) => {
    setBulkDraft((current) =>
      current
        ? {
            ...current,
            attributes: current.attributes.filter((item) => item.id !== attributeId),
            variants: current.variants.map((variant) => {
              const next = { ...variant.attributesByAttributeId }
              delete next[attributeId]
              return {
                ...variant,
                attributesByAttributeId: next,
              }
            }),
          }
        : current,
    )
  }

  const onEnterBulkEdit = (scope: Exclude<BulkEditScope, null>) => {
    if (!product || !isReadOnlyMode || isInteractionsLocked || !hasConfiguredManufacturers) return
    setBulkDraft(toBulkDraft(product))
    setBulkEditScope(scope)
  }

  const onEnterSingleVariantEdit = (variant: ProductVariant) => {
    if (!variant._id || !isReadOnlyMode || isInteractionsLocked || !hasConfiguredManufacturers) return
    setSingleVariantDraft({
      variantId: variant._id,
      price: String(variant.price),
      imageUrl: variant.imageUrl ?? '',
      attributes: { ...variant.attributes },
    })
  }

  const onRequestCancelBulkEdit = () => {
    if (!isBulkEditMode) return
    const hasUnsavedChanges =
      bulkEditScope === 'info'
        ? parentHasChanges
        : bulkEditScope === 'full'
          ? fullProductHasChanges
          : variantsHaveChanges || attributesHaveChanges
    if (hasUnsavedChanges) {
      setPendingConfirmAction('discard-bulk')
      return
    }
    setBulkEditScope(null)
    setBulkDraft(null)
  }

  const onRequestCancelSingleEdit = () => {
    if (!singleVariantDraft) return
    if (singleVariantHasChanges) {
      setPendingConfirmAction('discard-single')
      return
    }
    setSingleVariantDraft(null)
  }

  const onConfirmPendingAction = async () => {
    if (!product) return

    if (pendingConfirmAction === 'discard-bulk') {
      setBulkEditScope(null)
      setBulkDraft(null)
      setPendingConfirmAction(null)
      return
    }

    if (pendingConfirmAction === 'discard-single') {
      setSingleVariantDraft(null)
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
      return
    }
  }

  const onSaveInfo = async () => {
    if (!product || !parentPatchPayload || !canSaveInfo) return

    try {
      await patchProductMutation.mutateAsync({
        productId: product._id,
        payload: {
          name: parentPatchPayload.name,
          manufacturer: parentPatchPayload.manufacturer,
          category: parentPatchPayload.category,
          description: parentPatchPayload.description,
          imageUrl: parentPatchPayload.imageUrl,
        },
      })
      enqueueSnackbar(productsUiText.toasts.updated, { variant: 'success' })
      setBulkEditScope(null)
      setBulkDraft(null)
    } catch (error) {
      enqueueSnackbar(getProductApiErrorMessage(getErrorStatus(error)), { variant: 'error' })
    }
  }

  const onSaveFull = async () => {
    if (!product || !fullProductPayload || !canSaveFull) return

    try {
      await updateProductMutation.mutateAsync({
        productId: product._id,
        payload: fullProductPayload,
      })
      enqueueSnackbar(productsUiText.toasts.updated, { variant: 'success' })
      setBulkEditScope(null)
      setBulkDraft(null)
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
      setBulkEditScope(null)
      setBulkDraft(null)
    } catch (error) {
      enqueueSnackbar(getProductApiErrorMessage(getErrorStatus(error)), { variant: 'error' })
    }
  }

  const onToggleVariantStatus = async (variant: ProductVariant) => {
    if (
      !product ||
      !variant._id ||
      !isReadOnlyMode ||
      isInteractionsLocked ||
      !hasConfiguredManufacturers
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
      isEditingDisabled
    ) {
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

  if (productQuery.isLoading || isManufacturersLoading) {
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
            : pendingConfirmAction === 'discard-bulk' || pendingConfirmAction === 'discard-single'
              ? {
                  title: productsUiText.detailsPage.dialogs.discardChangesTitle,
                  message: productsUiText.detailsPage.dialogs.discardChangesMessage,
                  confirmLabel: productsUiText.detailsPage.dialogs.discardChangesConfirm,
                  confirmColor: 'warning' as const,
                }
              : null

  return (
    <Stack spacing={2.5} data-testid="product-details-page">
      <Stack spacing={1.5}>
        <Button
          component={Link}
          to="/products"
          variant="text"
          startIcon={<KeyboardBackspaceRoundedIcon fontSize="small" />}
          sx={{ alignSelf: 'flex-start', px: 0, textTransform: 'none' }}
          data-testid="product-details-page-back-link"
        >
          {productsUiText.detailsPage.backToProducts}
        </Button>

        <Stack
          direction={{ xs: 'column', md: 'row' }}
          alignItems={{ xs: 'flex-start', md: 'center' }}
          justifyContent="space-between"
          gap={1.5}
        >
          <Stack spacing={0.5}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <Typography variant="h4" sx={{ fontWeight: 700 }} data-testid="product-details-page-title">
                {product.name}
              </Typography>
              <Chip label={product.status} color={statusChipColor} variant="outlined" />
              <Tooltip title={productsUiText.detailsPage.actions.edit}>
                <span>
                  <IconButton
                    size="small"
                    disabled={!isReadOnlyMode || isEditingDisabled}
                    onClick={() => onEnterBulkEdit('full')}
                    data-testid="product-details-page-header-edit-button"
                  >
                    <EditOutlinedIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
              <Button
                color={statusActionColor}
                variant="outlined"
                disabled={!isReadOnlyMode || isEditingDisabled}
                onClick={() => setPendingConfirmAction(statusAction)}
                data-testid="product-details-page-status-action-button"
              >
                {statusActionLabel}
              </Button>
            </Stack>
            <Typography color="text.secondary" data-testid="product-details-page-meta">
              {product.manufacturer} | {product.category} | Created {formatDate(product.createdOn)} | Updated{' '}
              {formatDate(product.updatedOn)}
            </Typography>
          </Stack>

          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Button
              color="error"
              variant="contained"
              disabled={!isReadOnlyMode || isEditingDisabled}
              onClick={() => setPendingConfirmAction('delete-product')}
              data-testid="product-details-page-delete-product-button"
            >
              Delete Product
            </Button>
          </Stack>
        </Stack>
      </Stack>

      {!hasConfiguredManufacturers ? (
        <Alert severity="warning" data-testid="product-details-page-manufacturers-unavailable-alert">
          {productsUiText.detailsPage.placeholders.manufacturersUnavailable}
        </Alert>
      ) : null}

      <Paper sx={{ p: { xs: 2, md: 3 } }} data-testid="product-details-page-content">
        <Stack spacing={2}>
          <Paper variant="outlined" sx={{ p: { xs: 1.5, md: 2 } }} data-testid="product-details-page-product-info-section">
            <Stack spacing={1.5}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1}>
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    {productsUiText.detailsPage.productInfoTitle}
                  </Typography>
                  <Tooltip title={productsUiText.detailsPage.actions.edit}>
                    <span>
                      <IconButton
                        size="small"
                        disabled={!isReadOnlyMode || isEditingDisabled}
                        onClick={() => onEnterBulkEdit('info')}
                        data-testid="product-details-page-product-info-edit-button"
                      >
                        <EditOutlinedIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                </Stack>
              </Stack>
              <Typography variant="body2" color="text.secondary">
                {productsUiText.detailsPage.productInfoSubtitle}
              </Typography>

              {(isInfoEditMode || isFullEditMode) && effectiveBulkDraft ? (
                <Stack spacing={1.5}>
                  <Box
                    sx={{
                      display: 'grid',
                      gap: 2,
                      gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                    }}
                  >
                    <TextField
                      label="Name*"
                      value={effectiveBulkDraft.name}
                      onChange={(event) =>
                        setBulkDraft((current) =>
                          current
                            ? { ...current, name: event.target.value }
                            : current,
                        )
                      }
                    />
                    <TextField
                      label="Manufacturer*"
                      select
                      value={effectiveBulkDraft.manufacturer}
                      onChange={(event) =>
                        setBulkDraft((current) =>
                          current
                            ? { ...current, manufacturer: event.target.value }
                            : current,
                        )
                      }
                    >
                      {manufacturerOptions.map((item) => (
                        <MenuItem key={item} value={item}>
                          {item}
                        </MenuItem>
                      ))}
                    </TextField>

                    <TextField
                      label="Category*"
                      value={effectiveBulkDraft.category}
                      onChange={(event) =>
                        setBulkDraft((current) =>
                          current
                            ? { ...current, category: event.target.value }
                            : current,
                        )
                      }
                    />
                    <TextField
                      label="Parent image URL"
                      value={effectiveBulkDraft.imageUrl}
                      error={!isParentImageValid}
                      helperText={!isParentImageValid ? 'Parent image URL must be a valid http(s) URL.' : ' '}
                      onChange={(event) =>
                        setBulkDraft((current) =>
                          current
                            ? { ...current, imageUrl: event.target.value }
                            : current,
                        )
                      }
                    />
                  </Box>

                  <TextField
                    label="Description"
                    value={effectiveBulkDraft.description}
                    multiline
                    minRows={3}
                    onChange={(event) =>
                      setBulkDraft((current) =>
                        current
                          ? { ...current, description: event.target.value }
                          : current,
                      )
                    }
                  />

                  {isInfoEditMode ? (
                    <Stack direction="row" spacing={1}>
                      <Button
                        variant="contained"
                        disabled={!canSaveInfo}
                        onClick={() => void onSaveInfo()}
                        data-testid="product-details-page-save-product-button"
                      >
                        {productsUiText.detailsPage.actions.saveProduct}
                      </Button>
                      <Button
                        onClick={onRequestCancelBulkEdit}
                        disabled={isInteractionsLocked}
                        data-testid="product-details-page-cancel-product-edit-button"
                      >
                        {productsUiText.detailsPage.actions.cancel}
                      </Button>
                    </Stack>
                  ) : null}
                </Stack>
              ) : (
                <Stack spacing={1}>
                  <Typography>
                    <strong>Name:</strong> {product.name}
                  </Typography>
                  <Typography>
                    <strong>Manufacturer:</strong> {product.manufacturer}
                  </Typography>
                  <Typography>
                    <strong>Category:</strong> {product.category}
                  </Typography>
                  <Typography>
                    <strong>Description:</strong> {product.description?.trim() || '-'}
                  </Typography>
                  <Typography>
                    <strong>Image:</strong> {product.imageUrl?.trim() || '-'}
                  </Typography>
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                    <Typography sx={{ fontWeight: 700 }}>Attributes:</Typography>
                    {product.attributes.length === 0 ? (
                      <Typography color="text.secondary">No attributes</Typography>
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
                </Stack>
              )}
            </Stack>
          </Paper>

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
                        onClick={() => onEnterBulkEdit('variants')}
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

              {isBulkVariantsEditorMode && effectiveBulkDraft ? (
                <Stack spacing={1.5}>
                  <Paper variant="outlined" sx={{ p: 1.5 }}>
                    <Stack
                      direction={{ xs: 'column', lg: 'row' }}
                      gap={1.5}
                      alignItems={{ xs: 'stretch', lg: 'center' }}
                      justifyContent="space-between"
                    >
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        <Chip label={`${effectiveBulkDraft.attributes.length} attributes`} />
                        <Chip label={`${possibleCombinations.length} possible combinations`} />
                        <Chip label={`${effectiveBulkDraft.variants.length} variants added`} />
                        {invalidVariantsCount > 0 ? (
                          <Chip color="error" label={`${invalidVariantsCount} invalid`} />
                        ) : null}
                      </Stack>

                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        <Button
                          variant="outlined"
                          disabled={hasReachedMaxVariants || isInteractionsLocked}
                          onClick={() => {
                            setBulkDraft((current) => {
                              if (!current) return current
                              const attributesByAttributeId: Record<string, string> = {}
                              current.attributes.forEach((attribute) => {
                                attributesByAttributeId[attribute.id] = attribute.values[0] ?? ''
                              })
                              return {
                                ...current,
                                variants: [
                                  ...current.variants,
                                  {
                                    id: createLocalId(),
                                    price: '',
                                    status: 'Draft',
                                    imageUrl: '',
                                    attributesByAttributeId,
                                  },
                                ],
                              }
                            })
                          }}
                        >
                          {productsUiText.detailsPage.actions.addOneVariant}
                        </Button>

                        <Button
                          variant="contained"
                          disabled={
                            possibleCombinations.length === 0 || hasReachedMaxVariants || isInteractionsLocked
                          }
                          onClick={() => {
                            setBulkDraft((current) => {
                              if (!current) return current
                              const existingKeys = new Set(
                                current.variants.map((variant) =>
                                  buildVariantCombinationKey(variant.attributesByAttributeId),
                                ),
                              )
                              const generated: VariantDraft[] = []
                              buildPossibleCombinations(current.attributes).forEach((combination) => {
                                const key = buildVariantCombinationKey(combination)
                                if (existingKeys.has(key)) return
                                existingKeys.add(key)
                                generated.push({
                                  id: createLocalId(),
                                  price: '',
                                  status: 'Draft',
                                  imageUrl: '',
                                  attributesByAttributeId: combination,
                                })
                              })

                              return {
                                ...current,
                                variants: [...current.variants, ...generated],
                              }
                            })
                          }}
                        >
                          {productsUiText.detailsPage.actions.generateAllCombinations}
                        </Button>

                        {invalidVariantsCount > 0 ? (
                          <Button
                            color="error"
                            variant="contained"
                            onClick={() => {
                              setBulkDraft((current) => {
                                if (!current) return current
                                return {
                                  ...current,
                                  variants: current.variants.filter((variant) => {
                                    const error = bulkVariantErrors.get(variant.id)
                                    return !error
                                  }),
                                }
                              })
                            }}
                          >
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
                            Create unique attributes and available values. Values will be used to build variants.
                          </Typography>
                        </Box>
                        <Button
                          variant="outlined"
                          startIcon={<AddRoundedIcon />}
                          onClick={handleAddAttribute}
                          disabled={isInteractionsLocked}
                          data-testid="product-details-page-attributes-add-button"
                        >
                          Add Attribute
                        </Button>
                      </Stack>

                      <Stack spacing={1.25} data-testid="product-details-page-attributes-list">
                        {effectiveBulkDraft.attributes.length === 0 ? (
                          <Alert severity="info" data-testid="product-details-page-attributes-empty-alert">
                            Attributes are optional. You can generate a single variant without attributes.
                          </Alert>
                        ) : null}

                        {effectiveBulkDraft.attributes.map((attribute, index) => (
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
                                label="Attribute name*"
                                value={attribute.name}
                                onChange={(event) =>
                                  handleAttributeNameChange(attribute.id, event.target.value)
                                }
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
                                  handleAttributeInputChange(attribute.id, nextValue)
                                }
                                onChange={(_, nextValues) =>
                                  commitAttributeValues(attribute.id, nextValues as string[])
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
                                    onBlur={() => handleAttributeInputCommit(attribute.id)}
                                    onKeyDown={(event) => {
                                      if (event.key !== 'Enter' && event.key !== ',') return
                                      event.preventDefault()
                                      handleAttributeInputCommit(attribute.id)
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
                                onClick={() => handleRemoveAttribute(attribute.id)}
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

                  {effectiveBulkDraft.variants.length === 0 ? (
                    <Paper
                      variant="outlined"
                      sx={{ py: 4, px: 2, borderStyle: 'dashed', textAlign: 'center' }}
                    >
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
                      {effectiveBulkDraft.variants.map((variant, index) => {
                        const variantError = bulkVariantErrors.get(variant.id) ?? ''
                        const isPriceError =
                          variantError === 'Price should be greater than 0.' ||
                          variantError === 'Price can have max 2 decimal places.'

                        return (
                          <Paper
                            key={variant.id}
                            variant="outlined"
                            sx={{
                              p: 1.5,
                              borderColor: variantError ? 'error.main' : 'divider',
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
                                <IconButton
                                  color="error"
                                  disabled={effectiveBulkDraft.variants.length <= 1 || isInteractionsLocked}
                                  onClick={() =>
                                    setBulkDraft((current) =>
                                      current
                                        ? {
                                            ...current,
                                            variants: current.variants.filter((item) => item.id !== variant.id),
                                          }
                                        : current,
                                    )
                                  }
                                >
                                  <DeleteOutlineOutlinedIcon fontSize="small" />
                                </IconButton>
                              </Stack>

                              {variantError && !isPriceError ? (
                                <Alert severity="error">{variantError}</Alert>
                              ) : null}

                              <Box
                                sx={{
                                  display: 'grid',
                                  gap: 1.25,
                                  gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                                }}
                              >
                                {effectiveBulkDraft.attributes.map((attribute) => (
                                  <TextField
                                    key={`${variant.id}-${attribute.id}`}
                                    label={`${attribute.name.trim() || 'Attribute'}*`}
                                    select
                                    value={variant.attributesByAttributeId[attribute.id] ?? ''}
                                    onChange={(event) =>
                                      setBulkDraft((current) =>
                                        current
                                          ? {
                                              ...current,
                                              variants: current.variants.map((item) =>
                                                item.id === variant.id
                                                  ? {
                                                      ...item,
                                                      attributesByAttributeId: {
                                                        ...item.attributesByAttributeId,
                                                        [attribute.id]: event.target.value,
                                                      },
                                                    }
                                                  : item,
                                              ),
                                            }
                                          : current,
                                      )
                                    }
                                  >
                                    <MenuItem value="">Select value</MenuItem>
                                    {attribute.values.map((value) => (
                                      <MenuItem key={`${attribute.id}-${value}`} value={value}>
                                        {value}
                                      </MenuItem>
                                    ))}
                                  </TextField>
                                ))}

                                <TextField
                                  label="Price*"
                                  value={variant.price}
                                  error={isPriceError}
                                  onChange={(event) =>
                                    setBulkDraft((current) =>
                                      current
                                        ? {
                                            ...current,
                                            variants: current.variants.map((item) =>
                                              item.id === variant.id
                                                ? { ...item, price: event.target.value }
                                                : item,
                                            ),
                                          }
                                        : current,
                                    )
                                  }
                                  inputProps={{ inputMode: 'decimal' }}
                                />

                                <TextField
                                  label="Variant image URL"
                                  value={variant.imageUrl}
                                  onChange={(event) =>
                                    setBulkDraft((current) =>
                                      current
                                        ? {
                                            ...current,
                                            variants: current.variants.map((item) =>
                                              item.id === variant.id
                                                ? { ...item, imageUrl: event.target.value }
                                                : item,
                                            ),
                                          }
                                        : current,
                                    )
                                  }
                                />
                              </Box>
                            </Stack>
                          </Paper>
                        )
                      })}
                    </Box>
                  )}

                  <Stack direction="row" spacing={1}>
                    <Button
                      variant="contained"
                      disabled={
                        isFullEditMode
                          ? !canSaveFull
                          : isVariantsEditMode
                            ? !canSaveVariants
                            : true
                      }
                      onClick={() => {
                        if (isFullEditMode) {
                          void onSaveFull()
                          return
                        }
                        if (isVariantsEditMode) {
                          void onSaveVariants()
                        }
                      }}
                      data-testid="product-details-page-save-variants-button"
                    >
                      {productsUiText.detailsPage.actions.saveProduct}
                    </Button>
                    <Button
                      onClick={onRequestCancelBulkEdit}
                      disabled={isInteractionsLocked}
                      data-testid="product-details-page-cancel-variants-edit-button"
                    >
                      {productsUiText.detailsPage.actions.cancel}
                    </Button>
                  </Stack>
                </Stack>
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
                    const isPriceError =
                      singleVariantError === 'Price should be greater than 0.' ||
                      singleVariantError === 'Price can have max 2 decimal places.'

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
                                onClick={() => void onToggleVariantStatus(variant)}
                              >
                                {variant.status === 'Active' ? 'Archive' : 'Activate'}
                              </Button>
                            </Stack>

                            <Stack direction="row" spacing={0.25}>
                              <Tooltip title="Delete">
                                <span>
                                  <IconButton
                                    size="small"
                                    color="error"
                                    disabled={
                                      !isReadOnlyMode ||
                                      isEditingDisabled ||
                                      product.variants.length <= 1
                                    }
                                    onClick={() => openDeleteVariantConfirm(variant._id)}
                                  >
                                    <DeleteOutlineOutlinedIcon fontSize="small" />
                                  </IconButton>
                                </span>
                              </Tooltip>
                            </Stack>
                          </Stack>

                          {isEditingThisVariant && singleVariantDraft ? (
                            <Stack spacing={1.25}>
                              {singleVariantError && !isPriceError ? (
                                <Alert severity="error">{singleVariantError}</Alert>
                              ) : null}

                              <Box
                                sx={{
                                  display: 'grid',
                                  gap: 1.25,
                                  gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                                }}
                              >
                                {product.attributes.map((attribute) => (
                                  <TextField
                                    key={attribute.key}
                                    label={`${attribute.name}*`}
                                    select
                                    value={singleVariantDraft.attributes[attribute.key] ?? ''}
                                    onChange={(event) =>
                                      setSingleVariantDraft((current) =>
                                        current
                                          ? {
                                              ...current,
                                              attributes: {
                                                ...current.attributes,
                                                [attribute.key]: event.target.value,
                                              },
                                            }
                                          : current,
                                      )
                                    }
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
                                  label="Price*"
                                  value={singleVariantDraft.price}
                                  error={isPriceError}
                                  onChange={(event) =>
                                    setSingleVariantDraft((current) =>
                                      current
                                        ? {
                                            ...current,
                                            price: event.target.value,
                                          }
                                        : current,
                                    )
                                  }
                                  inputProps={{ inputMode: 'decimal' }}
                                />

                                <TextField
                                  label="Variant image URL"
                                  value={singleVariantDraft.imageUrl}
                                  onChange={(event) =>
                                    setSingleVariantDraft((current) =>
                                      current
                                        ? {
                                            ...current,
                                            imageUrl: event.target.value,
                                          }
                                        : current,
                                    )
                                  }
                                />
                              </Box>

                              <Stack direction="row" spacing={1}>
                                <Button
                                  variant="contained"
                                  disabled={!canSaveSingleVariant}
                                  onClick={() => void onSaveSingleVariant()}
                                >
                                  {productsUiText.detailsPage.actions.saveVariant}
                                </Button>
                                <Button
                                  disabled={isInteractionsLocked}
                                  onClick={onRequestCancelSingleEdit}
                                >
                                  {productsUiText.detailsPage.actions.cancel}
                                </Button>
                              </Stack>
                            </Stack>
                          ) : (
                            <Stack spacing={0.75}>
                              <Typography>
                                <strong>Price:</strong> {formatPrice(variant.price)}
                              </Typography>
                              <Typography>
                                <strong>Image:</strong> {variant.imageUrl?.trim() || productsUiText.detailsPage.placeholders.useParentImage}
                              </Typography>
                              {product.attributes.map((attribute) => (
                                <Typography key={`${variant._id ?? variantIndex}-${attribute.key}`}>
                                  <strong>{attribute.name}:</strong>{' '}
                                  {variant.attributes[attribute.key] ?? '-'}
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
