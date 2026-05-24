import { productsUiText } from '@/features/products/products.ui-text'

const PRODUCT_NAME_PATTERN = /^\b(?!.*?\s{2})[A-Za-z0-9 ]{3,40}\b$/m
const PRODUCT_CATEGORY_PATTERN = /^[A-Za-z0-9 ]+$/

export function getProductNameError(value: string) {
  const trimmed = value.trim()
  if (!trimmed) {
    return productsUiText.detailsPage.validation.nameRequired
  }
  if (!PRODUCT_NAME_PATTERN.test(trimmed)) {
    return productsUiText.detailsPage.validation.nameInvalid
  }
  return ''
}

export function getProductCategoryError(value: string) {
  const trimmed = value.trim()
  if (!trimmed) {
    return productsUiText.detailsPage.validation.categoryRequired
  }
  if (!PRODUCT_CATEGORY_PATTERN.test(trimmed)) {
    return productsUiText.detailsPage.validation.categoryInvalid
  }
  return ''
}

export function getProductImageUrlError(value: string, isValidHttpUrl: (url: string) => boolean) {
  const trimmed = value.trim()
  if (!trimmed) return ''
  if (!isValidHttpUrl(trimmed)) {
    return productsUiText.detailsPage.validation.parentImageUrlInvalid
  }
  return ''
}
