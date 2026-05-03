import { apiClient } from '@/api/client'

export type ProductStatus = 'Draft' | 'Active' | 'Archived'
export type ProductVariantStatus = ProductStatus

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

export type ProductListItem = {
  _id: string
  name: string
  manufacturer: string
  category: string
  status: ProductStatus
  variantsCount: number
  priceRange: ProductPriceRange
  createdOn: string
}

export type ProductDetails = ProductListItem & {
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
  category: string
  description?: string
  imageUrl?: string
  status: ProductStatus
  attributes: ProductAttribute[]
  variants: ProductVariant[]
}

// Temporary legacy payload kept to avoid blocking old edit flow migration in this task.
export type ProductLegacyUpsertPayload = {
  name: string
  amount: number
  price: number
  manufacturer: string
  notes?: string
}

export type ProductUpsertPayload = ProductVariantUpsertPayload | ProductLegacyUpsertPayload

export type ProductsListResponse = {
  Products: ProductListItem[]
  total: number
  page: number
  limit: number
  search: string
  manufacturer: string[]
  status?: ProductStatus[]
  sorting: {
    sortField: 'name' | 'price' | 'manufacturer' | 'category' | 'status' | 'createdOn'
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
    page: number
    limit: number
    sortField: 'name' | 'price' | 'manufacturer' | 'category' | 'status' | 'createdOn'
    sortOrder: 'asc' | 'desc'
  } | null
  fields: string[]
}

export type ProductsQuery = {
  search: string
  manufacturer: string[]
  sortField: 'name' | 'price' | 'manufacturer' | 'createdOn'
  sortOrder: 'asc' | 'desc'
  page: number
  limit: number
}

function toPriceRange(value: ProductDetails['priceRange'] | ProductListItem['priceRange'] | undefined): ProductPriceRange {
  if (!value) {
    return { min: 0, max: 0 }
  }

  return {
    min: Number(value.min ?? 0),
    max: Number(value.max ?? 0),
  }
}

function normalizeProductListItem(item: ProductListItem): Product {
  const priceRange = toPriceRange(item.priceRange)
  return {
    ...item,
    priceRange,
    variantsCount: Number(item.variantsCount ?? 0),
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
    priceRange,
    variantsCount: Number(product.variantsCount ?? product.variants?.length ?? 0),
    attributes: product.attributes ?? [],
    variants: product.variants ?? [],
    // Compatibility for older product consumers that still expect flat price.
    price: priceRange.min,
  }
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
  const response = await apiClient.post<ProductResponse>('/products', payload)
  return normalizeProductDetails(response.data.Product)
}

export async function updateProduct(productId: string, payload: ProductUpsertPayload) {
  const response = await apiClient.put<ProductResponse>(`/products/${productId}`, payload)
  return normalizeProductDetails(response.data.Product)
}

export async function deleteProduct(productId: string) {
  await apiClient.delete(`/products/${productId}`)
}

export async function exportProducts(payload: ProductExportPayload) {
  const response = await apiClient.post('/products/export', payload, {
    responseType: 'blob',
  })
  return response
}
