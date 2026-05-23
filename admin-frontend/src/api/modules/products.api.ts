import { apiClient } from '@/api/client'
import type { ApiRequestConfig } from '@/api/types'

export type ProductStatus = 'Draft' | 'Active' | 'Archived'
export type ProductVariantStatus = ProductStatus
export type ProductSetup = {
  completed: boolean
  completedOn?: string
  completedBy?: string
}

export type ProductPriceRange = {
  min: number
  max: number
}

export type ProductAttribute = {
  key: string
  name: string
  values: string[]
}

export type ProductVariant = {
  _id?: string
  price: number
  status: ProductVariantStatus
  attributes: Record<string, string>
  imageUrl?: string
}

export type ProductCategoryPathItem = {
  _id: string
  name: string
  slug: string
}

export type ProductCategoryInfo = {
  _id: string
  name: string
  slug: string
  path: ProductCategoryPathItem[]
}

export type ProductRootCategoryInfo = {
  _id: string
  name: string
  slug: string
}

export type ProductListItem = {
  _id: string
  name: string
  manufacturer: string
  imageUrl?: string
  categoryId: string
  rootCategoryId: string
  categoryPath: string
  status: ProductStatus
  setup?: ProductSetup
  variantsCount: number
  priceRange: ProductPriceRange
  createdOn: string
}

export type ProductDetails = ProductListItem & {
  category: ProductCategoryInfo | null
  rootCategory: ProductRootCategoryInfo | null
  description?: string
  imageUrl?: string
  attributes: ProductAttribute[]
  variants: ProductVariant[]
  updatedOn: string
}

// Backward-compatible type alias used across legacy feature code.
export type Product = ProductDetails & {
  amount?: number
  price?: number
  notes?: string
}

export type ProductVariantUpsertPayload = {
  name: string
  manufacturer: string
  categoryId: string
  description?: string
  imageUrl?: string
  attributes: ProductAttribute[]
  variants: ProductVariantReplacePayload[]
}

export type ProductSetupInitPayload = Pick<
  ProductVariantUpsertPayload,
  'name' | 'manufacturer' | 'categoryId' | 'description' | 'imageUrl'
>

export type ProductSetupSpecPayload = {
  attributes: ProductAttribute[]
  variants: ProductVariantCreatePayload[]
}

export type ProductParentPatchPayload = Partial<
  Pick<
    ProductVariantUpsertPayload,
    'name' | 'manufacturer' | 'categoryId' | 'description' | 'imageUrl'
  >
>

export type ProductVariantCreatePayload = {
  price: number
  attributes: Record<string, string>
  imageUrl?: string
}
export type ProductVariantReplacePayload = ProductVariantCreatePayload & { _id?: string }
export type ProductVariantReplaceRequestPayload = {
  attributes?: ProductAttribute[]
  variants: ProductVariantReplacePayload[]
}
export type ProductVariantPatchPayload = Partial<ProductVariantCreatePayload>
export type ProductStatusPatchPayload = { status: ProductStatus }

export type ProductUpsertPayload = ProductVariantUpsertPayload

export type ProductsListResponse = {
  Products: ProductListItem[]
  total: number
  page: number
  limit: number
  search: string
  manufacturer: string[]
  status?: ProductStatus[]
  categoryId?: string
  rootCategoryId?: string
  minPrice?: number
  maxPrice?: number
  sorting: {
    sortField:
      | 'name'
      | 'price'
      | 'manufacturer'
      | 'category'
      | 'status'
      | 'createdOn'
      | 'variantsCount'
    sortOrder: 'asc' | 'desc'
  }
  IsSuccess: boolean
  ErrorMessage: string | null
}

type ProductResponse = {
  Product: ProductDetails
  IsSuccess: boolean
  ErrorMessage: string | null
}

type ProductsAllResponse = {
  Products: ProductDetails[]
  IsSuccess: boolean
  ErrorMessage: string | null
}

export type ProductExportPayload = {
  format: 'csv' | 'json'
  filters: {
    search: string
    manufacturer: string[]
    status?: ProductStatus[]
    categoryId?: string
    rootCategoryId?: string
    minPrice?: number
    maxPrice?: number
    page: number
    limit: number
    sortField:
      | 'name'
      | 'price'
      | 'manufacturer'
      | 'category'
      | 'status'
      | 'createdOn'
      | 'variantsCount'
    sortOrder: 'asc' | 'desc'
  } | null
  fields: string[]
}

export type ProductsQuery = {
  search: string
  manufacturer: string[]
  status?: ProductStatus[]
  categoryId?: string
  rootCategoryId?: string
  minPrice?: number
  maxPrice?: number
  sortField:
    | 'name'
    | 'price'
    | 'manufacturer'
    | 'category'
    | 'status'
    | 'createdOn'
    | 'variantsCount'
  sortOrder: 'asc' | 'desc'
  page: number
  limit: number
}

function toPriceRange(
  value: ProductDetails['priceRange'] | ProductListItem['priceRange'] | undefined,
): ProductPriceRange {
  if (!value) {
    return { min: 0, max: 0 }
  }

  return {
    min: Number(value.min ?? 0),
    max: Number(value.max ?? 0),
  }
}

function toCategoryPath(
  product: Partial<Pick<ProductDetails, 'categoryPath' | 'category'>>,
): string {
  if (typeof product.categoryPath === 'string' && product.categoryPath.trim()) {
    return product.categoryPath
  }

  return product.category?.path?.map((item) => item.name).join(' / ') ?? ''
}

function normalizeProductSetup(
  setup: ProductSetup | undefined,
  status: ProductStatus,
): ProductSetup {
  if (setup && typeof setup.completed === 'boolean') {
    return setup
  }

  return {
    completed: status !== 'Draft',
  }
}

function normalizeProductListItem(item: ProductListItem): Product {
  const priceRange = toPriceRange(item.priceRange)
  return {
    ...item,
    setup: normalizeProductSetup(item.setup, item.status),
    categoryPath: toCategoryPath(item),
    variantsCount: Number(item.variantsCount ?? 0),
    priceRange,
    category: null,
    rootCategory: null,
    attributes: [],
    variants: [],
    updatedOn: item.createdOn,
    // Compatibility for older product consumers that still expect flat price.
    price: priceRange.min,
  }
}

function normalizeProductDetails(product: ProductDetails): Product {
  const priceRange = toPriceRange(product.priceRange)

  return {
    ...product,
    setup: normalizeProductSetup(product.setup, product.status),
    categoryPath: toCategoryPath(product),
    priceRange,
    variantsCount: Number(product.variantsCount ?? product.variants?.length ?? 0),
    attributes: product.attributes ?? [],
    variants: product.variants ?? [],
    // Compatibility for older product consumers that still expect flat price.
    price: priceRange.min,
  }
}

const silentRequestConfig: ApiRequestConfig = {
  skipErrorToast: true,
}

export async function getProducts(query: ProductsQuery) {
  const response = await apiClient.get<ProductsListResponse>('/products', {
    params: {
      ...query,
      manufacturer: query.manufacturer,
    },
  })

  return {
    ...response.data,
    Products: response.data.Products.map(normalizeProductListItem),
  }
}

export async function getProductById(productId: string) {
  const response = await apiClient.get<ProductResponse>(`/products/${productId}`)
  return normalizeProductDetails(response.data.Product)
}

export async function getAllProducts() {
  const response = await apiClient.get<ProductsAllResponse>('/products/all')
  return response.data.Products.map(normalizeProductDetails)
}

export async function createProduct(payload: ProductUpsertPayload) {
  const response = await apiClient.post<ProductResponse>('/products', payload, silentRequestConfig)
  return normalizeProductDetails(response.data.Product)
}

export async function initProductSetup(payload: ProductSetupInitPayload) {
  const response = await apiClient.post<ProductResponse>(
    '/products/setup/init',
    payload,
    silentRequestConfig,
  )
  return normalizeProductDetails(response.data.Product)
}

export async function saveProductSetupSpec(productId: string, payload: ProductSetupSpecPayload) {
  const response = await apiClient.put<ProductResponse>(
    `/products/${productId}/setup/spec`,
    payload,
    silentRequestConfig,
  )
  return normalizeProductDetails(response.data.Product)
}

export async function completeProductSetup(productId: string) {
  const response = await apiClient.post<ProductResponse>(
    `/products/${productId}/complete-setup`,
    undefined,
    silentRequestConfig,
  )
  return normalizeProductDetails(response.data.Product)
}

export async function updateProduct(productId: string, payload: ProductUpsertPayload) {
  const response = await apiClient.put<ProductResponse>(
    `/products/${productId}`,
    payload,
    silentRequestConfig,
  )
  return normalizeProductDetails(response.data.Product)
}

export async function patchProduct(productId: string, payload: ProductParentPatchPayload) {
  const response = await apiClient.patch<ProductResponse>(
    `/products/${productId}`,
    payload,
    silentRequestConfig,
  )
  return normalizeProductDetails(response.data.Product)
}

export async function patchProductStatus(productId: string, payload: ProductStatusPatchPayload) {
  const response = await apiClient.patch<ProductResponse>(
    `/products/${productId}/status`,
    payload,
    silentRequestConfig,
  )
  return normalizeProductDetails(response.data.Product)
}

export async function addProductVariants(
  productId: string,
  payload: ProductVariantCreatePayload[],
) {
  const response = await apiClient.post<ProductResponse>(
    `/products/${productId}/variants`,
    payload,
    silentRequestConfig,
  )
  return normalizeProductDetails(response.data.Product)
}

export async function replaceProductVariants(
  productId: string,
  payload: ProductVariantReplaceRequestPayload,
) {
  const response = await apiClient.put<ProductResponse>(
    `/products/${productId}/variants`,
    payload,
    {
      ...silentRequestConfig,
    },
  )
  return normalizeProductDetails(response.data.Product)
}

export async function validateProductVariants(
  productId: string,
  payload: ProductVariantReplaceRequestPayload,
) {
  const response = await apiClient.post<ProductResponse>(
    `/products/${productId}/variants/validate`,
    payload,
    silentRequestConfig,
  )
  return normalizeProductDetails(response.data.Product)
}

export async function patchProductVariant(
  productId: string,
  variantId: string,
  payload: ProductVariantPatchPayload,
) {
  const response = await apiClient.patch<ProductResponse>(
    `/products/${productId}/variants/${variantId}`,
    payload,
    silentRequestConfig,
  )
  return normalizeProductDetails(response.data.Product)
}

export async function patchProductVariantStatus(
  productId: string,
  variantId: string,
  payload: ProductStatusPatchPayload,
) {
  const response = await apiClient.patch<ProductResponse>(
    `/products/${productId}/variants/${variantId}/status`,
    payload,
    silentRequestConfig,
  )
  return normalizeProductDetails(response.data.Product)
}

export async function deleteProductVariant(productId: string, variantId: string) {
  await apiClient.delete(`/products/${productId}/variants/${variantId}`, silentRequestConfig)
}

export async function deleteProduct(productId: string) {
  await apiClient.delete(`/products/${productId}`, silentRequestConfig)
}

export async function exportProducts(payload: ProductExportPayload) {
  const response = await apiClient.post('/products/export', payload, {
    responseType: 'blob',
    ...silentRequestConfig,
  })
  return response
}
