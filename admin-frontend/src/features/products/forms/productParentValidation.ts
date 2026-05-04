const PRODUCT_NAME_PATTERN = /^\b(?!.*?\s{2})[A-Za-z0-9 ]{3,40}\b$/m
const PRODUCT_CATEGORY_PATTERN = /^[A-Za-z0-9 ]+$/

export function getProductNameError(value: string) {
  const trimmed = value.trim()
  if (!trimmed) {
    return 'Name is required.'
  }
  if (!PRODUCT_NAME_PATTERN.test(trimmed)) {
    return 'Name must be 3-40 chars: letters/numbers, single spaces only.'
  }
  return ''
}

export function getProductCategoryError(value: string) {
  const trimmed = value.trim()
  if (!trimmed) {
    return 'Category is required.'
  }
  if (!PRODUCT_CATEGORY_PATTERN.test(trimmed)) {
    return 'Category must contain letters and numbers only.'
  }
  return ''
}

export function getProductImageUrlError(value: string, isValidHttpUrl: (url: string) => boolean) {
  const trimmed = value.trim()
  if (!trimmed) return ''
  if (!isValidHttpUrl(trimmed)) {
    return 'Parent image URL must be a valid http(s) URL.'
  }
  return ''
}
