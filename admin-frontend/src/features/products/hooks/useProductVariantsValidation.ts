import { useMemo } from 'react'
import type { ProductVariantsDraft } from '@/features/products/forms/productVariantsDraft'
import {
  buildAttributesPayloadFromDraft,
  buildPossibleCombinations,
  buildVariantCombinationKey,
  buildVariantDuplicateCounts,
  buildVariantsReplacePayloadFromDraft,
  isValidHttpUrl,
  normalizeAttributeKey,
  normalizeValues,
  validatePrice,
} from '@/features/products/forms/productVariantsDraft'
import {
  getAttributeAtLeastOneValueMessage,
  getAttributeValueNoLongerExistsMessage,
  getAttributeValueRequiredMessage,
  productsUiText,
} from '@/features/products/products.ui-text'

type Args = {
  draft: ProductVariantsDraft | null
  baseDraft: ProductVariantsDraft | null
}

const EMPTY_ATTRIBUTES: ProductVariantsDraft['attributes'] = []
const EMPTY_VARIANTS: ProductVariantsDraft['variants'] = []

function getAttributesValidationError(attributes: ProductVariantsDraft['attributes']) {
  const normalizedKeys = new Set<string>()
  for (const attribute of attributes) {
    const name = attribute.name.trim()
    if (!name) {
      return productsUiText.detailsPage.validation.attributeNameRequired
    }

    const key = normalizeAttributeKey(name)
    if (normalizedKeys.has(key)) {
      return productsUiText.detailsPage.validation.attributeNamesMustBeUnique
    }
    normalizedKeys.add(key)

    if (normalizeValues(attribute.values).length === 0) {
      return getAttributeAtLeastOneValueMessage(name)
    }
  }

  return ''
}

function buildParentSnapshot(draft: ProductVariantsDraft | null) {
  if (!draft) return null
  return {
    name: draft.name.trim(),
    manufacturer: draft.manufacturer.trim(),
    description: draft.description.trim(),
    imageUrl: draft.imageUrl.trim(),
  }
}

export function useProductVariantsValidation({ draft, baseDraft }: Args) {
  const effectiveAttributes = draft?.attributes ?? EMPTY_ATTRIBUTES
  const effectiveVariants = draft?.variants ?? EMPTY_VARIANTS

  const attributeErrors = useMemo(() => {
    if (!draft) return new Map<string, string>()

    const countsByName = new Map<string, number>()
    effectiveAttributes.forEach((attribute) => {
      const key = normalizeAttributeKey(attribute.name)
      if (!key) return
      countsByName.set(key, (countsByName.get(key) ?? 0) + 1)
    })

    const errors = new Map<string, string>()
    effectiveAttributes.forEach((attribute) => {
      const name = attribute.name.trim()
      if (!name) {
        errors.set(attribute.id, productsUiText.detailsPage.validation.attributeNameRequired)
        return
      }

      if ((countsByName.get(normalizeAttributeKey(attribute.name)) ?? 0) > 1) {
        errors.set(attribute.id, productsUiText.detailsPage.validation.attributeNameMustBeUnique)
        return
      }

      if (normalizeValues(attribute.values).length === 0) {
        errors.set(attribute.id, productsUiText.detailsPage.validation.attributeValueRequired)
      }
    })

    return errors
  }, [draft, effectiveAttributes])

  const attributesValidationError = useMemo(
    () => getAttributesValidationError(effectiveAttributes),
    [effectiveAttributes],
  )

  const possibleCombinations = useMemo(
    () => buildPossibleCombinations(effectiveAttributes),
    [effectiveAttributes],
  )

  const hasReachedMaxVariants = useMemo(() => {
    if (!draft || possibleCombinations.length === 0) return false
    return effectiveVariants.length >= possibleCombinations.length
  }, [draft, effectiveVariants.length, possibleCombinations.length])

  const variantCombinationErrors = useMemo(() => {
    if (!draft) return new Map<string, string>()

    const duplicateCounts = buildVariantDuplicateCounts(effectiveVariants)
    const errors = new Map<string, string>()

    effectiveVariants.forEach((variant) => {
      let error = ''

      for (const attribute of effectiveAttributes) {
        const attributeName = attribute.name.trim()
        if (!attributeName) {
          error = productsUiText.detailsPage.validation.attributeNameRequired
          break
        }
        const selectedValue = variant.attributesByAttributeId[attribute.id]
        if (!selectedValue) {
          error = getAttributeValueRequiredMessage(attributeName)
          break
        }
        const hasValue = attribute.values.some(
          (value) => value.trim().toLowerCase() === selectedValue.trim().toLowerCase(),
        )
        if (!hasValue) {
          error = getAttributeValueNoLongerExistsMessage(attributeName, selectedValue)
          break
        }
      }

      if (!error) {
        const duplicateCount = duplicateCounts.get(
          buildVariantCombinationKey(variant.attributesByAttributeId),
        )
        if ((duplicateCount ?? 0) > 1) {
          error = productsUiText.detailsPage.validation.duplicateVariantCombination
        }
      }

      errors.set(variant.id, error)
    })

    return errors
  }, [draft, effectiveAttributes, effectiveVariants])

  const variantPriceErrors = useMemo(() => {
    const errors = new Map<string, string>()

    effectiveVariants.forEach((variant) => {
      const priceError = validatePrice(variant.price)
      if (priceError) {
        errors.set(variant.id, priceError)
        return
      }

      const imageUrl = variant.imageUrl.trim()
      if (imageUrl && !isValidHttpUrl(imageUrl)) {
        errors.set(variant.id, productsUiText.detailsPage.validation.variantImageUrlInvalid)
        return
      }

      errors.set(variant.id, '')
    })

    return errors
  }, [effectiveVariants])

  const invalidVariantsCount = useMemo(
    () =>
      effectiveVariants.reduce((count, variant) => {
        const error = variantCombinationErrors.get(variant.id) || variantPriceErrors.get(variant.id)
        return error ? count + 1 : count
      }, 0),
    [effectiveVariants, variantCombinationErrors, variantPriceErrors],
  )

  const invalidVariantIds = useMemo(
    () =>
      effectiveVariants
        .filter((variant) =>
          Boolean(variantCombinationErrors.get(variant.id) || variantPriceErrors.get(variant.id)),
        )
        .map((variant) => variant.id),
    [effectiveVariants, variantCombinationErrors, variantPriceErrors],
  )

  const isParentImageValid = useMemo(() => {
    if (!draft) return true
    return !draft.imageUrl.trim() || isValidHttpUrl(draft.imageUrl.trim())
  }, [draft])

  const isVariantsDraftValid = Boolean(
    draft && draft.variants.length > 0 && invalidVariantsCount === 0 && !attributesValidationError,
  )

  const parentSnapshot = useMemo(() => buildParentSnapshot(draft), [draft])
  const baseParentSnapshot = useMemo(() => buildParentSnapshot(baseDraft), [baseDraft])
  const parentHasChanges = useMemo(() => {
    if (!parentSnapshot || !baseParentSnapshot) return false
    return JSON.stringify(parentSnapshot) !== JSON.stringify(baseParentSnapshot)
  }, [baseParentSnapshot, parentSnapshot])

  const attributesPayload = useMemo(
    () => (draft ? buildAttributesPayloadFromDraft(draft) : null),
    [draft],
  )
  const baseAttributesPayload = useMemo(
    () => (baseDraft ? buildAttributesPayloadFromDraft(baseDraft) : null),
    [baseDraft],
  )
  const attributesHaveChanges = useMemo(() => {
    if (!attributesPayload || !baseAttributesPayload) return false
    return JSON.stringify(attributesPayload) !== JSON.stringify(baseAttributesPayload)
  }, [attributesPayload, baseAttributesPayload])

  const variantsReplacePayload = useMemo(
    () => (draft ? buildVariantsReplacePayloadFromDraft(draft) : null),
    [draft],
  )
  const baseVariantsReplacePayload = useMemo(
    () => (baseDraft ? buildVariantsReplacePayloadFromDraft(baseDraft) : null),
    [baseDraft],
  )
  const variantsHaveChanges = useMemo(() => {
    if (!variantsReplacePayload || !baseVariantsReplacePayload) return false
    return JSON.stringify(variantsReplacePayload) !== JSON.stringify(baseVariantsReplacePayload)
  }, [baseVariantsReplacePayload, variantsReplacePayload])

  return {
    attributeErrors,
    attributesValidationError,
    possibleCombinations,
    hasReachedMaxVariants,
    variantCombinationErrors,
    variantPriceErrors,
    invalidVariantsCount,
    invalidVariantIds,
    isParentImageValid,
    isVariantsDraftValid,
    parentHasChanges,
    attributesHaveChanges,
    variantsHaveChanges,
  }
}
