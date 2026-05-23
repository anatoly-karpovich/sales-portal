type ProductLike = {
  name: string
  attributes: Array<{ key: string }>
}

type VariantLike = {
  attributes?: Record<string, string> | null
}

export function buildVariantDisplayName(product: ProductLike, variant: VariantLike) {
  const productName = product.name.trim()
  if (!productName) return ''

  if (!Array.isArray(product.attributes) || product.attributes.length === 0) {
    return productName
  }

  const values = product.attributes
    .map((attribute) => variant.attributes?.[attribute.key]?.trim() ?? '')
    .filter((value) => value.length > 0)

  if (values.length === 0) {
    return productName
  }

  return `${productName} | ${values.join(' | ')}`
}
