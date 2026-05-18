import { apiClient } from '@/api/client'

export type InventoryStatus = 'In Stock' | 'Low Stock' | 'Out Of Stock' | 'Not Tracked'
export type InventoryRecordStatus = 'Active' | 'Archived'
export type ProductStatus = 'Draft' | 'Active' | 'Archived'
export const INVENTORY_MANUAL_ADJUSTMENT_TYPES = [
  'Manual Increase',
  'Manual Decrease',
  'Manual Correction',
  'Damage',
  'Return',
] as const
export type InventoryManualAdjustmentType = (typeof INVENTORY_MANUAL_ADJUSTMENT_TYPES)[number]

export type InventoryListItem = {
  _id: string
  productId: string
  product: {
    _id: string
    name: string
    manufacturer: string
    status: ProductStatus
  }
  status: InventoryRecordStatus
  inventoryStatus: InventoryStatus
  variantsCount: number
  lowStockVariantsCount: number
  outOfStockVariantsCount: number
  updatedOn: string
}

export type InventorySortField = 'updatedOn' | 'inventoryStatus' | 'product.name' | 'manufacturer'
export type InventorySortOrder = 'asc' | 'desc'

export type InventoryQuery = {
  search: string
  manufacturer: string[]
  productStatus: ProductStatus[]
  inventoryStatus: InventoryStatus[]
  sortField: InventorySortField
  sortOrder: InventorySortOrder
  page: number
  limit: number
}

export type InventoryVariant = {
  variantId: string
  quantity: number
  reserved: number
  available: number
  lowStockThreshold: number
  allowSellingOutOfStock: boolean
  stockStatus: InventoryStatus
  status: InventoryRecordStatus
  updatedOn: string
}

export type InventoryDetails = {
  _id: string
  productId: string
  totalQuantity: number
  totalReserved: number
  totalAvailable: number
  inventoryStatus: InventoryStatus
  lowStockVariantsCount: number
  outOfStockVariantsCount: number
  variants: InventoryVariant[]
  status: InventoryRecordStatus
  createdOn: string
  updatedOn: string
  product?: {
    _id: string
    name: string
    manufacturer: string
    categoryId: string
    rootCategoryId: string
    status: ProductStatus
  }
}

type InventoryListResponse = {
  Inventories: InventoryListItem[]
  total: number
  page: number
  limit: number
  search: string
  manufacturer: string[]
  productStatus: ProductStatus[]
  inventoryStatus: InventoryStatus[]
  sorting: {
    sortField: InventorySortField
    sortOrder: InventorySortOrder
  }
  IsSuccess: boolean
  ErrorMessage: string | null
}

type InventoryDetailsResponse = {
  Inventory: InventoryDetails
  IsSuccess: boolean
  ErrorMessage: string | null
}

export type InventoryAdjustmentCreatePayload = {
  productId: string
  variantId: string
  type: InventoryManualAdjustmentType
  quantity: number
  reason?: string
  comment?: string
}

export type InventoryVariantSettingsPatchPayload = {
  productId: string
  variantId: string
  lowStockThreshold?: number
  allowSellingOutOfStock?: boolean
}

export async function getInventory(query: InventoryQuery) {
  const response = await apiClient.get<InventoryListResponse>('/inventory', {
    params: {
      ...query,
      manufacturer: query.manufacturer,
      productStatus: query.productStatus,
      inventoryStatus: query.inventoryStatus,
    },
  })

  return response.data
}

export async function getInventoryByProductId(productId: string) {
  const response = await apiClient.get<InventoryDetailsResponse>(`/inventory/products/${productId}`)
  return response.data.Inventory
}

export async function createInventoryAdjustment(payload: InventoryAdjustmentCreatePayload) {
  const response = await apiClient.post<InventoryDetailsResponse>('/inventory/adjustments', payload)
  return response.data.Inventory
}

export async function updateInventoryVariantSettings(payload: InventoryVariantSettingsPatchPayload) {
  const response = await apiClient.patch<InventoryDetailsResponse>(
    `/inventory/products/${payload.productId}/variants/${payload.variantId}/settings`,
    {
      lowStockThreshold: payload.lowStockThreshold,
      allowSellingOutOfStock: payload.allowSellingOutOfStock,
    },
  )
  return response.data.Inventory
}
