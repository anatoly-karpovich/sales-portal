import { useCallback, useMemo, useState } from 'react'
import type { Product } from '@/api/modules/products.api'
import type { ProductVariantsDraft } from '@/features/products/forms/productVariantsDraft'
import {
  applyAttributeValuesToVariants,
  buildPossibleCombinations,
  buildVariantCombinationKey,
  createLocalId,
  normalizeValues,
  parseCommaSeparatedValues,
  toProductVariantsDraft,
} from '@/features/products/forms/productVariantsDraft'

export function useProductVariantsDraft(product: Product | null | undefined) {
  const baseDraft = useMemo(() => (product ? toProductVariantsDraft(product) : null), [product])
  const [draft, setDraft] = useState<ProductVariantsDraft | null>(null)

  const effectiveDraft = draft ?? baseDraft

  const startEditing = useCallback(() => {
    if (!product) return
    setDraft(toProductVariantsDraft(product))
  }, [product])

  const discardChanges = useCallback(() => {
    setDraft(null)
  }, [])

  const updateParentField = useCallback(
    (field: 'name' | 'manufacturer' | 'description' | 'imageUrl', value: string) => {
      setDraft((current) =>
        current
          ? {
              ...current,
              [field]: value,
            }
          : current,
      )
    },
    [],
  )

  const addAttribute = useCallback(() => {
    setDraft((current) => {
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
  }, [])

  const setAttributeName = useCallback((attributeId: string, name: string) => {
    setDraft((current) =>
      current
        ? {
            ...current,
            attributes: current.attributes.map((attribute) =>
              attribute.id === attributeId ? { ...attribute, name } : attribute,
            ),
          }
        : current,
    )
  }, [])

  const setAttributeInputValue = useCallback((attributeId: string, inputValue: string) => {
    setDraft((current) =>
      current
        ? {
            ...current,
            attributes: current.attributes.map((attribute) =>
              attribute.id === attributeId ? { ...attribute, inputValue } : attribute,
            ),
          }
        : current,
    )
  }, [])

  const commitAttributeValues = useCallback((attributeId: string, rawValues: string[]) => {
    const nextValues = normalizeValues(rawValues.flatMap(parseCommaSeparatedValues))

    setDraft((current) =>
      current
        ? {
            ...current,
            attributes: current.attributes.map((attribute) =>
              attribute.id === attributeId
                ? {
                    ...attribute,
                    values: nextValues,
                    inputValue: '',
                  }
                : attribute,
            ),
            variants: applyAttributeValuesToVariants(current.variants, attributeId, nextValues),
          }
        : current,
    )
  }, [])

  const commitAttributeInput = useCallback(
    (attributeId: string) => {
      const targetAttribute = effectiveDraft?.attributes.find(
        (attribute) => attribute.id === attributeId,
      )
      if (!targetAttribute) return

      const rawValues = [
        ...targetAttribute.values,
        ...parseCommaSeparatedValues(targetAttribute.inputValue),
      ]
      commitAttributeValues(attributeId, rawValues)
    },
    [commitAttributeValues, effectiveDraft?.attributes],
  )

  const removeAttribute = useCallback((attributeId: string) => {
    setDraft((current) =>
      current
        ? {
            ...current,
            attributes: current.attributes.filter((attribute) => attribute.id !== attributeId),
            variants: current.variants.map((variant) => {
              const nextAttributes = { ...variant.attributesByAttributeId }
              delete nextAttributes[attributeId]
              return {
                ...variant,
                attributesByAttributeId: nextAttributes,
              }
            }),
          }
        : current,
    )
  }, [])

  const addVariant = useCallback(() => {
    setDraft((current) => {
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
  }, [])

  const generateAllCombinations = useCallback(() => {
    setDraft((current) => {
      if (!current) return current

      const existingKeys = new Set(
        current.variants.map((variant) =>
          buildVariantCombinationKey(variant.attributesByAttributeId),
        ),
      )
      const generatedVariants = buildPossibleCombinations(current.attributes)
        .filter((combination) => {
          const key = buildVariantCombinationKey(combination)
          if (existingKeys.has(key)) return false
          existingKeys.add(key)
          return true
        })
        .map((combination) => ({
          id: createLocalId(),
          price: '',
          status: 'Draft' as const,
          imageUrl: '',
          attributesByAttributeId: combination,
        }))

      return {
        ...current,
        variants: [...current.variants, ...generatedVariants],
      }
    })
  }, [])

  const removeVariant = useCallback((variantDraftId: string) => {
    setDraft((current) =>
      current
        ? {
            ...current,
            variants: current.variants.filter((variant) => variant.id !== variantDraftId),
          }
        : current,
    )
  }, [])

  const removeVariantsByIds = useCallback((variantDraftIds: string[]) => {
    if (variantDraftIds.length === 0) return
    const ids = new Set(variantDraftIds)
    setDraft((current) =>
      current
        ? {
            ...current,
            variants: current.variants.filter((variant) => !ids.has(variant.id)),
          }
        : current,
    )
  }, [])

  const updateVariantAttribute = useCallback(
    (variantDraftId: string, attributeId: string, value: string) => {
      setDraft((current) =>
        current
          ? {
              ...current,
              variants: current.variants.map((variant) =>
                variant.id === variantDraftId
                  ? {
                      ...variant,
                      attributesByAttributeId: {
                        ...variant.attributesByAttributeId,
                        [attributeId]: value,
                      },
                    }
                  : variant,
              ),
            }
          : current,
      )
    },
    [],
  )

  const updateVariantImageUrl = useCallback((variantDraftId: string, imageUrl: string) => {
    setDraft((current) =>
      current
        ? {
            ...current,
            variants: current.variants.map((variant) =>
              variant.id === variantDraftId ? { ...variant, imageUrl } : variant,
            ),
          }
        : current,
    )
  }, [])

  const commitVariantPrice = useCallback((variantDraftId: string, price: string) => {
    setDraft((current) =>
      current
        ? {
            ...current,
            variants: current.variants.map((variant) =>
              variant.id === variantDraftId ? { ...variant, price } : variant,
            ),
          }
        : current,
    )
  }, [])

  return {
    baseDraft,
    draft,
    effectiveDraft,
    startEditing,
    discardChanges,
    updateParentField,
    addAttribute,
    setAttributeName,
    setAttributeInputValue,
    commitAttributeValues,
    commitAttributeInput,
    removeAttribute,
    addVariant,
    generateAllCombinations,
    removeVariant,
    removeVariantsByIds,
    updateVariantAttribute,
    updateVariantImageUrl,
    commitVariantPrice,
  }
}
