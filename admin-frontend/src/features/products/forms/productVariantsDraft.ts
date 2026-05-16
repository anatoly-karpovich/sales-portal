import type {
  Product,
  ProductAttribute,
  ProductUpsertPayload,
  ProductVariant,
  ProductVariantReplacePayload,
  ProductVariantStatus,
} from '@/api/modules/products.api'

export type AttributeDraft = {
  id: string
  name: string
  values: string[]
  inputValue: string
}

export type VariantDraft = {
  id: string
  variantId?: string
  price: string
  status: ProductVariantStatus
  imageUrl: string
  attributesByAttributeId: Record<string, string>
}

export type ProductVariantsDraft = {
  name: string
  manufacturer: string
  description: string
  imageUrl: string
  attributes: AttributeDraft[]
  variants: VariantDraft[]
}

export function createLocalId() {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2)
}

export function normalizeAttributeKey(value: string) {
  return value.trim().toLowerCase()
}

export function normalizeValues(values: string[]) {
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

export function parseCommaSeparatedValues(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

export function isValidHttpUrl(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

export function validatePrice(price: string) {
  if (!price.trim() || Number(price) <= 0) {
    return 'Price should be greater than 0.'
  }
  if (!/^\d+(\.\d{1,2})?$/.test(price.trim())) {
    return 'Price can have max 2 decimal places.'
  }
  return ''
}

export function buildPossibleCombinations(attributes: AttributeDraft[]) {
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

export function buildVariantCombinationKey(attributes: Record<string, string>) {
  return Object.keys(attributes)
    .sort()
    .map((attributeId) => `${attributeId}:${attributes[attributeId]}`)
    .join('|')
}

export function buildVariantDuplicateCounts(variants: VariantDraft[]) {
  const counts = new Map<string, number>()
  variants.forEach((variant) => {
    const key = buildVariantCombinationKey(variant.attributesByAttributeId)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  })
  return counts
}

export function applyAttributeValuesToVariants(
  variants: VariantDraft[],
  attributeId: string,
  nextValues: string[],
) {
  const normalizedNextValues = normalizeValues(nextValues)
  const fallbackValue = normalizedNextValues[0] ?? ''
  const allowedValues = new Set(normalizedNextValues.map((value) => value.toLowerCase()))

  return variants.map((variant) => {
    const currentValue = (variant.attributesByAttributeId[attributeId] ?? '').trim()
    const isCurrentAllowed = currentValue ? allowedValues.has(currentValue.toLowerCase()) : false

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

export function toVariantTitle(
  variant: ProductVariant | VariantDraft,
  attributes: Array<{ key: string; name: string }> | AttributeDraft[],
) {
  const source =
    'attributesByAttributeId' in variant ? variant.attributesByAttributeId : variant.attributes
  const parts = attributes
    .map((attribute) => {
      const key = 'id' in attribute ? attribute.id : attribute.key
      const value = source[key]
      return value ? value : null
    })
    .filter(Boolean)

  return parts.length > 0 ? parts.join(' | ') : ''
}

export function toProductVariantsDraft(product: Product): ProductVariantsDraft {
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
    description: product.description ?? '',
    imageUrl: product.imageUrl ?? '',
    attributes,
    variants,
  }
}

export function buildAttributesPayloadFromDraft(draft: ProductVariantsDraft): ProductAttribute[] {
  return draft.attributes.map((attribute) => ({
    key: normalizeAttributeKey(attribute.name),
    name: attribute.name.trim(),
    values: normalizeValues(attribute.values),
  }))
}

export function buildVariantsReplacePayloadFromDraft(
  draft: ProductVariantsDraft,
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

export function buildProductUpsertPayloadFromDraft(
  draft: ProductVariantsDraft,
  categoryId: string,
): ProductUpsertPayload {
  return {
    name: draft.name.trim(),
    manufacturer: draft.manufacturer.trim(),
    categoryId: categoryId.trim(),
    ...(draft.description.trim() ? { description: draft.description.trim() } : {}),
    ...(draft.imageUrl.trim() ? { imageUrl: draft.imageUrl.trim() } : {}),
    attributes: buildAttributesPayloadFromDraft(draft),
    variants: buildVariantsReplacePayloadFromDraft(draft),
  }
}
