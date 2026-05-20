import { useCallback, useMemo, useState, useTransition } from 'react'
import {
  INVENTORY_RESERVATION_TYPES,
  type InventoryReservationType,
  type InventoryReservationsSortField,
  type InventoryReservationsSortOrder,
} from '@/api/modules/inventory.api'
import {
  INVENTORY_RESERVATIONS_DEFAULT_SORT,
  parseInventoryReservationsSortValue,
  resolveInventoryReservationsSortValue,
} from '@/features/inventory/config/inventoryReservations.config'
import { useInventoryReservationsQuery } from '@/features/inventory/hooks/useInventoryQuery'

type InventoryReservationsFiltersApplyPayload = {
  type: string[]
  fromDate: string
  toDate: string
  expiresBefore: string
}

const DATE_FROM_TIME_SUFFIX = 'T00:00:00.000Z'
const DATE_TO_TIME_SUFFIX = 'T23:59:59.999Z'
const INVENTORY_RESERVATION_TYPE_SET = new Set<string>(INVENTORY_RESERVATION_TYPES)

function toInventoryReservationTypes(values: string[]) {
  return values.filter((value): value is InventoryReservationType =>
    INVENTORY_RESERVATION_TYPE_SET.has(value),
  )
}

function toIsoDateTime(value: string) {
  const normalizedValue = value.trim()
  if (!normalizedValue) return ''
  const date = new Date(normalizedValue)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString()
}

export function useInventoryReservationsPageState() {
  const [search, setSearch] = useState('')
  const [searchDraft, setSearchDraft] = useState('')
  const [type, setType] = useState<InventoryReservationType[]>([])
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [expiresBefore, setExpiresBefore] = useState('')
  const [sortField, setSortField] = useState<InventoryReservationsSortField>(
    INVENTORY_RESERVATIONS_DEFAULT_SORT.sortField,
  )
  const [sortOrder, setSortOrder] = useState<InventoryReservationsSortOrder>(
    INVENTORY_RESERVATIONS_DEFAULT_SORT.sortOrder,
  )
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [isTransitionPending, startTransition] = useTransition()

  const query = useMemo(
    () => ({
      search,
      type,
      fromDate: fromDate ? `${fromDate}${DATE_FROM_TIME_SUFFIX}` : '',
      toDate: toDate ? `${toDate}${DATE_TO_TIME_SUFFIX}` : '',
      expiresBefore: toIsoDateTime(expiresBefore),
      sortField,
      sortOrder,
      page,
      limit,
    }),
    [search, type, fromDate, toDate, expiresBefore, sortField, sortOrder, page, limit],
  )

  const { data, isLoading, isFetching, isError } = useInventoryReservationsQuery(query)
  const isCardsUpdating = isFetching || isTransitionPending
  const rows = data?.Reservations ?? []
  const total = data?.total ?? 0
  const summary = data?.summary ?? {
    activeReservations: 0,
    expiringSoon: 0,
    processing: 0,
    reservedUnits: 0,
  }

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

  const onRemoveType = useCallback((value: string) => {
    setType((current) => current.filter((item) => item !== value))
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

  const onRemoveExpiresBefore = useCallback(() => {
    setExpiresBefore('')
    setPage(1)
  }, [])

  const onSortValueChange = useCallback((value: string) => {
    const nextSort = parseInventoryReservationsSortValue(value)
    setSortField(nextSort.sortField)
    setSortOrder(nextSort.sortOrder)
    setPage(1)
  }, [])

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

  const applyFilters = useCallback((values: InventoryReservationsFiltersApplyPayload) => {
    setType(toInventoryReservationTypes(values.type))
    setFromDate(values.fromDate)
    setToDate(values.toDate)
    setExpiresBefore(values.expiresBefore)
    setPage(1)
    setFiltersOpen(false)
  }, [])

  const sortValue = useMemo(
    () => resolveInventoryReservationsSortValue(sortField, sortOrder),
    [sortField, sortOrder],
  )

  return {
    search,
    searchDraft,
    type,
    typeOptions: [...INVENTORY_RESERVATION_TYPES],
    fromDate,
    toDate,
    expiresBefore,
    sortField,
    sortOrder,
    sortValue,
    page,
    limit,
    rows,
    summary,
    total,
    filtersOpen,
    isLoading,
    isCardsUpdating,
    isError,
    setSearchDraft,
    setFiltersOpen,
    onSearchApply,
    onPageChange,
    onLimitChange,
    onRemoveSearch,
    onRemoveType,
    onRemoveFromDate,
    onRemoveToDate,
    onRemoveExpiresBefore,
    onSortValueChange,
    applyFilters,
  }
}
