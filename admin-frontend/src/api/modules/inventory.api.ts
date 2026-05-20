import { apiClient } from '@/api/client'

export type InventoryStatus = 'In Stock' | 'Low Stock' | 'Out Of Stock' | 'Not Tracked'
export type InventoryRecordStatus = 'Active' | 'Archived'
export type ProductStatus = 'Draft' | 'Active' | 'Archived'
export const INVENTORY_MANUAL_ADJUSTMENT_TYPES = ['Stock Receipt', 'Manual Correction'] as const
export type InventoryManualAdjustmentType = (typeof INVENTORY_MANUAL_ADJUSTMENT_TYPES)[number]
export const INVENTORY_ADJUSTMENT_TYPES = [
  'Initial Stock',
  'Stock Receipt',
  'Manual Correction',
  'Reserve',
  'Release',
  'Sale',
  'Return',
  'Damage',
  'Expired Reservation',
] as const
export type InventoryAdjustmentType = (typeof INVENTORY_ADJUSTMENT_TYPES)[number]
export const INVENTORY_RESERVATION_TYPES = [
  'Admin Draft',
  'Order Processing',
  'Customer Draft',
] as const
type InventoryReservationTypeRaw = (typeof INVENTORY_RESERVATION_TYPES)[number] | 'Customer Payment'
export type InventoryReservationType = (typeof INVENTORY_RESERVATION_TYPES)[number]

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
  comment?: string
}

export type InventoryVariantSettingsPatchPayload = {
  productId: string
  variantId: string
  lowStockThreshold?: number
  allowSellingOutOfStock?: boolean
}

export type InventoryAdjustmentsSortOrder = 'asc' | 'desc'
export type InventoryReservationsSortField = 'createdOn' | 'expiresAt'
export type InventoryReservationsSortOrder = 'asc' | 'desc'
export type InventoryReservationsQuery = {
  search: string
  type: InventoryReservationType[]
  fromDate: string
  toDate: string
  expiresBefore: string
  sortField: InventoryReservationsSortField
  sortOrder: InventoryReservationsSortOrder
  page: number
  limit: number
}
export type InventoryReservationListItem = {
  _id: string
  orderId: string
  type: InventoryReservationType
  expiresAt: string | null
  createdOn: string
  updatedOn: string
  customer: {
    _id: string
    name: string
    email: string
  } | null
  items: Array<{
    productId: string
    variantId: string
    productName: string
    manufacturer: string
    variantLabel: string
    reservedQuantity: number
  }>
  reservedProductsCount: number
  reservedUnits: number
  isExpired: boolean
}
export type InventoryReservationsSummary = {
  activeReservations: number
  expiringSoon: number
  processing: number
  reservedUnits: number
}

export type InventoryAdjustmentsQuery = {
  type: InventoryAdjustmentType[]
  orderId: string
  fromDate: string
  toDate: string
  sortOrder: InventoryAdjustmentsSortOrder
  page: number
  limit: number
}

export type InventoryAdjustment = {
  _id: string
  inventoryId: string
  productId: string
  variantId: string
  type: InventoryAdjustmentType
  quantityChange: number
  quantityBefore: number
  quantityAfter: number
  reservedBefore: number
  reservedAfter: number
  comment?: string | null
  orderId?: string | null
  reservationId?: string | null
  createdBy: string
  createdOn: string
}

type InventoryAdjustmentsResponse = {
  Adjustments: InventoryAdjustment[]
  total: number
  page: number
  limit: number
  sortOrder: InventoryAdjustmentsSortOrder
  IsSuccess: boolean
  ErrorMessage: string | null
}

type InventoryReservationsResponse = {
  Reservations: Array<
    Omit<InventoryReservationListItem, 'type'> & {
      type: InventoryReservationTypeRaw
    }
  >
  summary: InventoryReservationsSummary
  total: number
  page: number
  limit: number
  filters: {
    search: string
    type: InventoryReservationTypeRaw[]
    fromDate: string
    toDate: string
    expiresBefore: string
    sortField: InventoryReservationsSortField
    sortOrder: InventoryReservationsSortOrder
  }
  IsSuccess: boolean
  ErrorMessage: string | null
}

type NormalizedInventoryReservationsResponse = Omit<
  InventoryReservationsResponse,
  'Reservations' | 'filters'
> & {
  Reservations: InventoryReservationListItem[]
  filters: Omit<InventoryReservationsResponse['filters'], 'type'> & {
    type: InventoryReservationType[]
  }
}

function normalizeInventoryReservationType(
  type: InventoryReservationTypeRaw,
): InventoryReservationType {
  if (type === 'Customer Payment') {
    return 'Customer Draft'
  }

  return type
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

export async function getInventoryReservations(query: InventoryReservationsQuery) {
  const response = await apiClient.get<InventoryReservationsResponse>('/inventory/reservations', {
    params: {
      ...query,
      type: query.type,
    },
  })

  const data = response.data
  const rawReservations = Array.isArray((data as { Reservations?: unknown[] }).Reservations)
    ? (data as { Reservations: unknown[] }).Reservations
    : []
  const rawSummary =
    (data as { summary?: InventoryReservationsSummary }).summary ??
    ({
      activeReservations: 0,
      expiringSoon: 0,
      processing: 0,
      reservedUnits: 0,
    } satisfies InventoryReservationsSummary)
  const rawFilters = (data as { filters?: Partial<InventoryReservationsResponse['filters']> })
    .filters
  const rawFilterTypes = Array.isArray(rawFilters?.type) ? rawFilters.type : []

  return {
    ...data,
    Reservations: rawReservations.map((reservation) => ({
      ...(reservation as Omit<InventoryReservationListItem, 'type'> & {
        type: InventoryReservationTypeRaw
      }),
      ...(reservation as object),
      type: normalizeInventoryReservationType(
        (reservation as { type: InventoryReservationTypeRaw }).type,
      ),
    })),
    summary: rawSummary,
    filters: {
      search: rawFilters?.search ?? '',
      fromDate: rawFilters?.fromDate ?? '',
      toDate: rawFilters?.toDate ?? '',
      expiresBefore: rawFilters?.expiresBefore ?? '',
      sortField: rawFilters?.sortField ?? query.sortField,
      sortOrder: rawFilters?.sortOrder ?? query.sortOrder,
      type: rawFilterTypes.map((type) => normalizeInventoryReservationType(type)),
    },
  } satisfies NormalizedInventoryReservationsResponse
}

export async function getInventoryByProductId(productId: string) {
  const response = await apiClient.get<InventoryDetailsResponse>(`/inventory/products/${productId}`)
  return response.data.Inventory
}

export async function createInventoryAdjustment(payload: InventoryAdjustmentCreatePayload) {
  const response = await apiClient.post<InventoryDetailsResponse>('/inventory/adjustments', payload)
  return response.data.Inventory
}

export async function updateInventoryVariantSettings(
  payload: InventoryVariantSettingsPatchPayload,
) {
  const response = await apiClient.patch<InventoryDetailsResponse>(
    `/inventory/products/${payload.productId}/variants/${payload.variantId}/settings`,
    {
      lowStockThreshold: payload.lowStockThreshold,
      allowSellingOutOfStock: payload.allowSellingOutOfStock,
    },
  )
  return response.data.Inventory
}

export async function getInventoryAdjustmentsByProduct(
  productId: string,
  query: InventoryAdjustmentsQuery,
) {
  const response = await apiClient.get<InventoryAdjustmentsResponse>(
    `/inventory/products/${productId}/adjustments`,
    {
      params: {
        ...query,
        type: query.type,
      },
    },
  )

  return response.data
}

export async function getInventoryAdjustmentsByVariant(
  productId: string,
  variantId: string,
  query: InventoryAdjustmentsQuery,
) {
  const response = await apiClient.get<InventoryAdjustmentsResponse>(
    `/inventory/products/${productId}/variants/${variantId}/adjustments`,
    {
      params: {
        ...query,
        type: query.type,
      },
    },
  )

  return response.data
}
