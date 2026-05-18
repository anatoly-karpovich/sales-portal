import { apiClient } from '@/api/client'

export type InventoryStatus = 'In Stock' | 'Low Stock' | 'Out Of Stock' | 'Not Tracked'
export type InventoryRecordStatus = 'Active' | 'Archived'
export type ProductStatus = 'Draft' | 'Active' | 'Archived'

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
