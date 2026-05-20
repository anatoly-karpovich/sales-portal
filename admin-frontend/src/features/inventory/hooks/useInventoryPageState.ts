import { useCallback, useMemo, useState, useTransition } from 'react'
import type { InventoryStatus, ProductStatus } from '@/api/modules/inventory.api'
import {
  isInventorySortField,
  type InventoryTableSortField,
  type InventoryTableSortOrder,
} from '@/features/inventory/config/inventoryTableColumns'
import { useInventoryQuery } from '@/features/inventory/hooks/useInventoryQuery'
import { useManufacturerOptions } from '@/features/products/hooks/useManufacturerOptions'

type InventoryFiltersApplyPayload = {
  manufacturer: string[]
  productStatus: string[]
  inventoryStatus: string[]
}

const PRODUCT_STATUSES: ProductStatus[] = ['Draft', 'Active', 'Archived']
const INVENTORY_STATUSES: InventoryStatus[] = [
  'In Stock',
  'Low Stock',
  'Out Of Stock',
  'Not Tracked',
]

const PRODUCT_STATUS_SET = new Set<string>(PRODUCT_STATUSES)
const INVENTORY_STATUS_SET = new Set<string>(INVENTORY_STATUSES)

function toProductStatusList(values: string[]): ProductStatus[] {
  return values.filter((value): value is ProductStatus => PRODUCT_STATUS_SET.has(value))
}

function toInventoryStatusList(values: string[]): InventoryStatus[] {
  return values.filter((value): value is InventoryStatus => INVENTORY_STATUS_SET.has(value))
}

export function useInventoryPageState() {
  const { options: manufacturerOptions } = useManufacturerOptions()
  const [search, setSearch] = useState('')
  const [searchDraft, setSearchDraft] = useState('')
  const [manufacturer, setManufacturer] = useState<string[]>([])
  const [productStatus, setProductStatus] = useState<ProductStatus[]>([])
  const [inventoryStatus, setInventoryStatus] = useState<InventoryStatus[]>([])
  const [sortField, setSortField] = useState<InventoryTableSortField>('updatedOn')
  const [sortOrder, setSortOrder] = useState<InventoryTableSortOrder>('desc')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [isTransitionPending, startTransition] = useTransition()

  const query = useMemo(
    () => ({
      search,
      manufacturer,
      productStatus,
      inventoryStatus,
      sortField,
      sortOrder,
      page,
      limit,
    }),
    [search, manufacturer, productStatus, inventoryStatus, sortField, sortOrder, page, limit],
  )

  const { data, isLoading, isFetching } = useInventoryQuery(query)
  const isTableUpdating = isFetching || isTransitionPending

  const rows = data?.Inventories ?? []
  const total = data?.total ?? 0

  const onSearchApply = useCallback(() => {
    setSearch(searchDraft.trim())
    setSearchDraft('')
    setPage(1)
  }, [searchDraft])

  const onRemoveSearch = useCallback(() => {
    setSearch('')
    setSearchDraft('')
    setPage(1)
  }, [])

  const onRemoveManufacturerFilter = useCallback((value: string) => {
    setManufacturer((current) => current.filter((item) => item !== value))
    setPage(1)
  }, [])

  const onRemoveProductStatusFilter = useCallback((value: string) => {
    setProductStatus((current) => current.filter((item) => item !== value))
    setPage(1)
  }, [])

  const onRemoveInventoryStatusFilter = useCallback((value: string) => {
    setInventoryStatus((current) => current.filter((item) => item !== value))
    setPage(1)
  }, [])

  const onSort = useCallback(
    (field: string) => {
      if (!isInventorySortField(field)) return
      setPage(1)
      setSortField(field)
      setSortOrder((currentOrder) =>
        field === sortField ? (currentOrder === 'asc' ? 'desc' : 'asc') : 'asc',
      )
    },
    [sortField],
  )

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

  const applyFilters = useCallback((values: InventoryFiltersApplyPayload) => {
    setManufacturer(values.manufacturer)
    setProductStatus(toProductStatusList(values.productStatus))
    setInventoryStatus(toInventoryStatusList(values.inventoryStatus))
    setPage(1)
    setFiltersOpen(false)
  }, [])

  return {
    search,
    searchDraft,
    manufacturer,
    manufacturerOptions,
    productStatus,
    productStatusOptions: [...PRODUCT_STATUSES],
    inventoryStatus,
    inventoryStatusOptions: [...INVENTORY_STATUSES],
    sortField,
    sortOrder,
    page,
    limit,
    rows,
    total,
    filtersOpen,
    isLoading,
    isTableUpdating,
    setSearchDraft,
    setFiltersOpen,
    onSearchApply,
    onSort,
    onPageChange,
    onLimitChange,
    onRemoveSearch,
    onRemoveManufacturerFilter,
    onRemoveProductStatusFilter,
    onRemoveInventoryStatusFilter,
    applyFilters,
  }
}
