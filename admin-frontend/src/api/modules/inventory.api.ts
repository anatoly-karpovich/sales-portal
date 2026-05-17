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
