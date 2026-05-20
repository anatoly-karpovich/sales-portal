import { useCallback, useMemo, useState, useTransition } from 'react'
import { INVENTORY_ADJUSTMENT_TYPES, type InventoryAdjustmentType } from '@/api/modules/inventory.api'
import { useManagersQuery } from '@/features/managers/hooks/useManagersQuery'
import {
  type InventoryHistorySortField,
  type InventoryHistorySortOrder,
  type InventoryHistoryRow,
} from '@/features/inventory/config/inventoryHistoryTableColumns'
import {
  useInventoryAdjustmentsByProductQuery,
  useInventoryAdjustmentsByVariantQuery,
  useInventoryDetailsQuery,
} from '@/features/inventory/hooks/useInventoryQuery'
import { inventoryUiText } from '@/features/inventory/inventory.ui-text'
import { useProductQuery } from '@/features/products/hooks/useProductsQuery'

type InventoryHistoryFiltersApplyPayload = {
  type: string[]
  fromDate: string
  toDate: string
}

type VariantOption = {
  id: string
  label: string
  meta: string
}

const ALL_VARIANTS_ID = 'all'
const DATE_FROM_TIME_SUFFIX = 'T00:00:00.000Z'
const DATE_TO_TIME_SUFFIX = 'T23:59:59.999Z'

const INVENTORY_ADJUSTMENT_TYPE_SET = new Set<string>(INVENTORY_ADJUSTMENT_TYPES)

function toInventoryAdjustmentTypes(values: string[]) {
  return values.filter((value): value is InventoryAdjustmentType =>
    INVENTORY_ADJUSTMENT_TYPE_SET.has(value),
  )
}

function resolveVariantAttributesLabel(attributes: Record<string, string> | undefined) {
  if (!attributes) return ''

  return Object.values(attributes)
    .map((value) => value.trim())
    .filter((value) => value.length > 0)
    .join(' | ')
}

function resolveVariantMetaLabel(attributes: Record<string, string> | undefined) {
  if (!attributes) return '-'

  const entries = Object.entries(attributes)
    .map(([key, value]) => {
      const normalizedValue = value.trim()
      if (!normalizedValue) return null
      return `${key}: ${normalizedValue}`
    })
    .filter((entry): entry is string => Boolean(entry))

  if (entries.length === 0) return '-'
  return entries.join(' | ')
}

function resolveManagerName(
  createdBy: string,
  managersById: Map<string, string>,
  systemLabel: string,
  unknownLabel: string,
) {
  const resolvedById = managersById.get(createdBy)
  if (resolvedById) return resolvedById

  if (createdBy.trim().length === 0 || createdBy.toLowerCase() === 'system') {
    return systemLabel
  }

  const isObjectId = /^[a-fA-F0-9]{24}$/.test(createdBy)
  if (isObjectId) return unknownLabel

  return createdBy
}

export function useInventoryHistoryPageState(productId: string) {
  const [selectedVariantId, setSelectedVariantId] = useState<string>(ALL_VARIANTS_ID)
  const [type, setType] = useState<InventoryAdjustmentType[]>([])
  const [orderId, setOrderId] = useState('')
  const [searchDraft, setSearchDraft] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [sortField] = useState<InventoryHistorySortField>('createdOn')
  const [sortOrder, setSortOrder] = useState<InventoryHistorySortOrder>('desc')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [isTransitionPending, startTransition] = useTransition()

  const inventoryQuery = useInventoryDetailsQuery(productId, Boolean(productId))
  const productQuery = useProductQuery(productId, Boolean(productId))
  const managersQuery = useManagersQuery()

  const adjustmentsQueryParams = useMemo(
    () => ({
      type,
      orderId,
      fromDate: fromDate ? `${fromDate}${DATE_FROM_TIME_SUFFIX}` : '',
      toDate: toDate ? `${toDate}${DATE_TO_TIME_SUFFIX}` : '',
      sortOrder,
      page,
      limit,
    }),
    [type, orderId, fromDate, toDate, sortOrder, page, limit],
  )

  const isAllVariantsSelected = selectedVariantId === ALL_VARIANTS_ID
  const productAdjustmentsQuery = useInventoryAdjustmentsByProductQuery(
    productId,
    adjustmentsQueryParams,
    Boolean(productId) && isAllVariantsSelected,
  )
  const variantAdjustmentsQuery = useInventoryAdjustmentsByVariantQuery(
    productId,
    selectedVariantId,
    adjustmentsQueryParams,
    Boolean(productId) && !isAllVariantsSelected,
  )

  const activeAdjustmentsQuery = isAllVariantsSelected
    ? productAdjustmentsQuery
    : variantAdjustmentsQuery

  const managersById = useMemo(
    () =>
      new Map(
        (managersQuery.data ?? []).map((manager) => {
          const fullName = [manager.firstName, manager.lastName].filter(Boolean).join(' ').trim()
          return [manager._id, fullName.length > 0 ? fullName : manager.username]
        }),
      ),
    [managersQuery.data],
  )

  const variantOptions = useMemo<VariantOption[]>(() => {
    const inventory = inventoryQuery.data
    const product = productQuery.data
    if (!inventory || !product) return []

    const productVariantsById = new Map(
      (product.variants ?? [])
        .filter((variant) => typeof variant._id === 'string')
        .map((variant) => [variant._id as string, variant]),
    )

    const allVariantsOption: VariantOption = {
      id: ALL_VARIANTS_ID,
      label: inventoryUiText.historyPage.allVariantsLabel,
      meta: inventoryUiText.historyPage.allVariantsMeta,
    }

    const variantItems = inventory.variants.map((variant) => {
      const productVariant = productVariantsById.get(variant.variantId)
      const variantAttributesLabel = resolveVariantAttributesLabel(productVariant?.attributes)
      const variantMeta = resolveVariantMetaLabel(productVariant?.attributes)

      return {
        id: variant.variantId,
        label: variantAttributesLabel ? `${product.name} | ${variantAttributesLabel}` : product.name,
        meta: variantMeta,
      }
    })

    return [allVariantsOption, ...variantItems]
  }, [inventoryQuery.data, productQuery.data])

  const selectedVariant = useMemo(
    () => variantOptions.find((variant) => variant.id === selectedVariantId) ?? variantOptions[0] ?? null,
    [variantOptions, selectedVariantId],
  )

  const rows = useMemo<InventoryHistoryRow[]>(
    () => {
      const adjustments = activeAdjustmentsQuery.data?.Adjustments ?? []

      return adjustments.map((adjustment) => {
        const variantLabel =
          variantOptions.find((variant) => variant.id === adjustment.variantId)?.label ??
          adjustment.variantId

        return {
          id: adjustment._id,
          createdOn: adjustment.createdOn,
          variantLabel,
          type: adjustment.type,
          quantityBefore: adjustment.quantityBefore,
          quantityAfter: adjustment.quantityAfter,
          reservedBefore: adjustment.reservedBefore,
          reservedAfter: adjustment.reservedAfter,
          comment: adjustment.comment?.trim() || inventoryUiText.historyPage.placeholders.noComment,
          managerName: resolveManagerName(
            adjustment.createdBy,
            managersById,
            inventoryUiText.historyPage.placeholders.systemManager,
            inventoryUiText.historyPage.placeholders.unknownManager,
          ),
        }
      })
    },
    [activeAdjustmentsQuery.data?.Adjustments, managersById, variantOptions],
  )

  const onSort = useCallback((field: string) => {
    if (field !== 'createdOn') return
    setPage(1)
    setSortOrder((currentOrder) => (currentOrder === 'asc' ? 'desc' : 'asc'))
  }, [])

  const onSearchApply = useCallback(() => {
    setOrderId(searchDraft.trim())
    setSearchDraft('')
    setPage(1)
  }, [searchDraft])

  const onPageChange = useCallback(
    (value: number) => {
      startTransition(() => {
        setPage(value)
      })
    },
    [startTransition],
  )

  const onLimitChange = useCallback(
    (value: number) => {
      startTransition(() => {
        setLimit(value)
        setPage(1)
      })
    },
    [startTransition],
  )

  const applyFilters = useCallback((values: InventoryHistoryFiltersApplyPayload) => {
    setType(toInventoryAdjustmentTypes(values.type))
    setFromDate(values.fromDate)
    setToDate(values.toDate)
    setPage(1)
    setFiltersOpen(false)
  }, [])

  const onSelectVariant = useCallback((variantId: string) => {
    setSelectedVariantId(variantId)
    setPage(1)
  }, [])

  const onResetVariant = useCallback(() => {
    setSelectedVariantId(ALL_VARIANTS_ID)
    setPage(1)
  }, [])

  const onRemoveType = useCallback((value: string) => {
    setType((current) => current.filter((item) => item !== value))
    setPage(1)
  }, [])

  const onRemoveOrderId = useCallback(() => {
    setOrderId('')
    setSearchDraft('')
    setPage(1)
  }, [])

  const onRemoveFromDate = useCallback(() => {
    setFromDate('')
    setPage(1)
  }, [])

  const onRemoveToDate = useCallback(() => {
    setToDate('')
    setPage(1)
  }, [])

  const total = activeAdjustmentsQuery.data?.total ?? 0
  const isPageLoading = inventoryQuery.isLoading || productQuery.isLoading
  const isDataUnavailable =
    inventoryQuery.isError ||
    productQuery.isError ||
    !inventoryQuery.data ||
    !productQuery.data
  const isTableLoading =
    activeAdjustmentsQuery.isLoading ||
    activeAdjustmentsQuery.isFetching ||
    isTransitionPending ||
    managersQuery.isLoading

  return {
    product: productQuery.data,
    inventory: inventoryQuery.data,
    variantOptions,
    selectedVariantId,
    selectedVariantLabel: selectedVariant?.label ?? inventoryUiText.historyPage.allVariantsLabel,
    isAllVariantsSelected,
    type,
    typeOptions: [...INVENTORY_ADJUSTMENT_TYPES],
    orderId,
    searchDraft,
    fromDate,
    toDate,
    sortField,
    sortOrder,
    page,
    limit,
    total,
    rows,
    filtersOpen,
    isPageLoading,
    isDataUnavailable,
    isTableLoading,
    setSearchDraft,
    setFiltersOpen,
    onSearchApply,
    onSort,
    onPageChange,
    onLimitChange,
    onSelectVariant,
    onResetVariant,
    onRemoveType,
    onRemoveOrderId,
    onRemoveFromDate,
    onRemoveToDate,
    applyFilters,
  }
}
