import { isAxiosError } from 'axios'
import { useMemo } from 'react'
import type { InventoryDetails, InventoryVariant } from '@/api/modules/inventory.api'
import type { Product } from '@/api/modules/products.api'
import {
  useOrderInventoriesDetailsQueries,
  useOrderProductsDetailsQueries,
} from '@/features/orders/hooks/useOrdersQuery'

export type OrderInventoryValidationMode = 'create' | 'edit'

export type OrderInventoryValidationRowInput = {
  rowId: number
  productId: string
  variantId: string
  quantity: number
}

export type OrderInventoryValidationWarningCode =
  | 'settings_unavailable'
  | 'variant_unavailable_create'
  | 'out_of_stock_blocked'
  | 'quantity_exceeds_available'
  | 'missing_inventory_snapshot'
  | 'missing_catalog_snapshot'
  | 'inactive_snapshot'

export type OrderInventoryValidatedRow = {
  rowId: number
  productId: string
  variantId: string
  quantity: number
  maxQuantity: number
  reservedFromStock: number
  directOrder: number
  available: number | null
  allowSellingOutOfStock: boolean | null
  isOrderable: boolean
  isSubmitBlocked: boolean
  warningCode: OrderInventoryValidationWarningCode | null
}

type UseOrderInventoryValidationParams = {
  rows: OrderInventoryValidationRowInput[]
  mode: OrderInventoryValidationMode
  maxProductQuantityInOrder: number | null
  enabled: boolean
  reservedQuantityByLineKey?: Map<string, number>
  includeProductIds?: string[]
}

function buildLineKey(productId: string, variantId: string) {
  return `${productId}|${variantId}`
}

function clampNonNegativeInteger(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.floor(value))
}

function hasNotFoundError(error: unknown) {
  return isAxiosError(error) && error.response?.status === 404
}

export function isInventoryVariantOrderable(params: {
  product: Product | null
  inventory: InventoryDetails | null
  variantId: string
}) {
  const { product, inventory, variantId } = params
  if (!product || product.status !== 'Active') return false

  const productVariant = product.variants.find((variant) => variant._id === variantId)
  if (!productVariant || productVariant.status !== 'Active') return false

  const inventoryVariant = inventory?.variants.find((variant) => variant.variantId === variantId)
  if (!inventoryVariant || inventoryVariant.status !== 'Active') return false

  return inventoryVariant.available > 0 || inventoryVariant.allowSellingOutOfStock
}

function getInventoryVariant(inventory: InventoryDetails | undefined, variantId: string) {
  return inventory?.variants.find((variant) => variant.variantId === variantId)
}

function resolveMaxQuantity(params: {
  mode: OrderInventoryValidationMode
  maxProductQuantityInOrder: number
  inventoryVariant: InventoryVariant
  reservedQuantityForLine: number
}) {
  const { mode, maxProductQuantityInOrder, inventoryVariant, reservedQuantityForLine } = params

  if (inventoryVariant.allowSellingOutOfStock) {
    return clampNonNegativeInteger(maxProductQuantityInOrder)
  }

  if (mode === 'edit') {
    return clampNonNegativeInteger(reservedQuantityForLine + inventoryVariant.available)
  }

  return clampNonNegativeInteger(inventoryVariant.available)
}

export function useOrderInventoryValidation({
  rows,
  mode,
  maxProductQuantityInOrder,
  enabled,
  reservedQuantityByLineKey,
  includeProductIds = [],
}: UseOrderInventoryValidationParams) {
  const uniqueProductIds = useMemo(
    () =>
      [...new Set([...rows.map((row) => row.productId), ...includeProductIds].filter(Boolean))],
    [includeProductIds, rows],
  )

  const productQueries = useOrderProductsDetailsQueries(uniqueProductIds, enabled)
  const inventoryQueries = useOrderInventoriesDetailsQueries(uniqueProductIds, enabled)

  const isProductDataLoading = productQueries.some((query) => query.isPending || query.isFetching)
  const isInventoryDataLoading = inventoryQueries.some(
    (query) => query.isPending || query.isFetching,
  )
  const isReferenceDataLoading = isProductDataLoading || isInventoryDataLoading

  const productById = useMemo(() => {
    const map = new Map<string, Product>()
    productQueries.forEach((query, index) => {
      const productId = uniqueProductIds[index]
      if (!productId || !query.data) return
      map.set(productId, query.data)
    })
    return map
  }, [productQueries, uniqueProductIds])

  const inventoryById = useMemo(() => {
    const map = new Map<string, InventoryDetails>()
    inventoryQueries.forEach((query, index) => {
      const productId = uniqueProductIds[index]
      if (!productId || !query.data) return
      map.set(productId, query.data)
    })
    return map
  }, [inventoryQueries, uniqueProductIds])

  const validatedRows = useMemo<OrderInventoryValidatedRow[]>(() => {
    const hasValidSettings =
      typeof maxProductQuantityInOrder === 'number' && maxProductQuantityInOrder >= 1

    return rows.map((row) => {
      const lineKey = buildLineKey(row.productId, row.variantId)
      const productQueryIndex = uniqueProductIds.indexOf(row.productId)
      const productQuery = productQueryIndex >= 0 ? productQueries[productQueryIndex] : null
      const inventoryQuery = productQueryIndex >= 0 ? inventoryQueries[productQueryIndex] : null

      const product = productById.get(row.productId)
      const inventory = inventoryById.get(row.productId)

      const productVariant = product?.variants.find((variant) => variant._id === row.variantId)
      const inventoryVariant = getInventoryVariant(inventory, row.variantId)

      const isCatalogMissing = !product || !productVariant
      const isInventoryMissing = !inventory || !inventoryVariant
      const isCatalogInactive =
        Boolean(product) &&
        (product.status !== 'Active' ||
          (Boolean(productVariant) && productVariant.status !== 'Active'))
      const isInventoryInactive = Boolean(inventoryVariant) && inventoryVariant.status !== 'Active'

      const isOrderable =
        !isCatalogMissing &&
        !isInventoryMissing &&
        !isCatalogInactive &&
        !isInventoryInactive &&
        (inventoryVariant.available > 0 || inventoryVariant.allowSellingOutOfStock)

      const available = inventoryVariant ? clampNonNegativeInteger(inventoryVariant.available) : null
      const allowSellingOutOfStock = inventoryVariant?.allowSellingOutOfStock ?? null
      const reservedQuantityForLine = clampNonNegativeInteger(
        reservedQuantityByLineKey?.get(lineKey) ?? 0,
      )

      const hasProductNotFound = productQuery ? hasNotFoundError(productQuery.error) : false
      const hasInventoryNotFound = inventoryQuery ? hasNotFoundError(inventoryQuery.error) : false

      let maxQuantity = hasValidSettings ? maxProductQuantityInOrder : 1
      let warningCode: OrderInventoryValidationWarningCode | null = null
      let isSubmitBlocked = false

      if (!hasValidSettings) {
        warningCode = 'settings_unavailable'
        isSubmitBlocked = true
      } else if (isCatalogMissing || hasProductNotFound) {
        if (mode === 'edit') {
          maxQuantity = row.quantity
          warningCode = 'missing_catalog_snapshot'
        } else {
          maxQuantity = 0
          warningCode = 'variant_unavailable_create'
          isSubmitBlocked = true
        }
      } else if (isCatalogInactive) {
        if (mode === 'edit') {
          maxQuantity = row.quantity
          warningCode = 'inactive_snapshot'
        } else {
          maxQuantity = 0
          warningCode = 'variant_unavailable_create'
          isSubmitBlocked = true
        }
      } else if (isInventoryMissing || hasInventoryNotFound) {
        if (mode === 'edit') {
          maxQuantity = row.quantity
          warningCode = 'missing_inventory_snapshot'
        } else {
          maxQuantity = 0
          warningCode = 'variant_unavailable_create'
          isSubmitBlocked = true
        }
      } else if (isInventoryInactive) {
        if (mode === 'edit') {
          maxQuantity = row.quantity
          warningCode = 'inactive_snapshot'
        } else {
          maxQuantity = 0
          warningCode = 'variant_unavailable_create'
          isSubmitBlocked = true
        }
      } else if (inventoryVariant) {
        maxQuantity = resolveMaxQuantity({
          mode,
          maxProductQuantityInOrder,
          inventoryVariant,
          reservedQuantityForLine,
        })

        if (maxQuantity <= 0) {
          warningCode = 'out_of_stock_blocked'
          isSubmitBlocked = true
        }
      }

      if (row.quantity > maxQuantity) {
        warningCode = 'quantity_exceeds_available'
        isSubmitBlocked = true
      }

      const stockCoverage = (() => {
        if (!inventoryVariant) return 0
        if (inventoryVariant.allowSellingOutOfStock) {
          return available ?? 0
        }
        if (mode === 'edit') {
          return maxQuantity
        }
        return available ?? 0
      })()

      const reservedFromStock = Math.min(row.quantity, clampNonNegativeInteger(stockCoverage))
      const directOrder = Math.max(row.quantity - reservedFromStock, 0)

      return {
        rowId: row.rowId,
        productId: row.productId,
        variantId: row.variantId,
        quantity: row.quantity,
        maxQuantity: Math.max(0, maxQuantity),
        reservedFromStock,
        directOrder,
        available,
        allowSellingOutOfStock,
        isOrderable,
        isSubmitBlocked,
        warningCode,
      }
    })
  }, [
    inventoryById,
    inventoryQueries,
    maxProductQuantityInOrder,
    mode,
    productById,
    productQueries,
    reservedQuantityByLineKey,
    rows,
    uniqueProductIds,
  ])

  const rowValidationByLineKey = useMemo(() => {
    const map = new Map<string, OrderInventoryValidatedRow>()
    for (const row of validatedRows) {
      map.set(buildLineKey(row.productId, row.variantId), row)
    }
    return map
  }, [validatedRows])

  return {
    isReferenceDataLoading,
    productById,
    inventoryById,
    validatedRows,
    rowValidationByLineKey,
    buildLineKey,
  }
}
