import { isAxiosError } from 'axios'
import { useCallback, useEffect, useMemo, useState, useTransition } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSnackbar } from 'notistack'
import { getAllCustomers, type Customer } from '@/api/modules/customers.api'
import { getAllProducts, type Product } from '@/api/modules/products.api'
import type { CreateOrderPayload, OrderListItem, OrderStatus } from '@/api/modules/orders.api'
import { downloadBlobResponse } from '@/utils/download'
import { ORDER_STATUSES } from '@/constants/dictionaries'
import {
  isOrdersSortField,
  type OrdersSortField,
  type OrdersSortOrder,
} from '@/features/orders/config/ordersTableColumns'
import {
  useCreateOrderMutation,
  useOrderStatusMutation,
  useOrdersExportMutation,
  useOrdersQuery,
} from '@/features/orders/hooks/useOrdersQuery'
import { getReopenOrderMessage, ordersUiText } from '@/features/orders/orders.ui-text'

type ExportSubmitPayload = {
  format: 'csv' | 'json'
  exportFrom: 'all' | 'filtered'
  fields: string[]
}

type CreateDialogData = {
  customers: Customer[]
  products: Product[]
}

const ORDER_STATUS_SET = new Set<string>(ORDER_STATUSES)

function toOrderStatusList(values: string[]): OrderStatus[] {
  return values.filter((value): value is OrderStatus => ORDER_STATUS_SET.has(value))
}

export function useOrdersPageState() {
  const navigate = useNavigate()
  const { enqueueSnackbar } = useSnackbar()
  const [search, setSearch] = useState('')
  const [searchDraft, setSearchDraft] = useState('')
  const [status, setStatus] = useState<OrderStatus[]>([])
  const [sortField, setSortField] = useState<OrdersSortField>('createdOn')
  const [sortOrder, setSortOrder] = useState<OrdersSortOrder>('desc')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [selectedReopenOrder, setSelectedReopenOrder] = useState<OrderListItem | null>(null)
  const [reopenDialogOpen, setReopenDialogOpen] = useState(false)
  const [createDialogData, setCreateDialogData] = useState<CreateDialogData | null>(null)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [createDialogKey, setCreateDialogKey] = useState(0)
  const [isCreateDialogPreloading, setIsCreateDialogPreloading] = useState(false)
  const [isTransitionPending, startTransition] = useTransition()

  const query = useMemo(
    () => ({
      search,
      status,
      sortField,
      sortOrder,
      page,
      limit,
    }),
    [search, status, sortField, sortOrder, page, limit],
  )

  const { data, isLoading, isFetching } = useOrdersQuery(query)
  const exportMutation = useOrdersExportMutation()
  const createMutation = useCreateOrderMutation()
  const orderStatusMutation = useOrderStatusMutation()

  const rows = data?.Orders ?? []
  const total = data?.total ?? 0
  const isTableUpdating = isFetching || isTransitionPending

  useEffect(() => {
    if (isLoading || isFetching) return
    const pageCount = Math.max(Math.ceil(total / limit), 1)
    if (page > pageCount) {
      setPage(pageCount)
    }
  }, [isFetching, isLoading, limit, page, total])

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

  const applyStatusFilters = useCallback((values: string[]) => {
    setStatus(toOrderStatusList(values))
    setPage(1)
    setFiltersOpen(false)
  }, [])

  const onRemoveStatusFilter = useCallback((value: string) => {
    setStatus((current) => current.filter((item) => item !== value))
    setPage(1)
  }, [])

  const onSort = useCallback(
    (field: string) => {
      if (!isOrdersSortField(field)) return
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

  const onExportSubmit = useCallback(
    async (payload: ExportSubmitPayload) => {
      const filters =
        payload.exportFrom === 'all'
          ? null
          : {
              search,
              status,
              page,
              limit,
              sortField,
              sortOrder,
            }

      const response = await exportMutation.mutateAsync({
        format: payload.format,
        fields: payload.fields,
        filters,
      })
      downloadBlobResponse(response, `orders-export.${payload.format}`)
      enqueueSnackbar(ordersUiText.toasts.exportCompleted, { variant: 'success' })
    },
    [enqueueSnackbar, exportMutation, limit, page, search, sortField, sortOrder, status],
  )

  const openCreateDialog = useCallback(async () => {
    if (isCreateDialogPreloading) return

    setCreateDialogOpen(false)
    setCreateDialogData(null)
    setIsCreateDialogPreloading(true)
    try {
      const [customers, products] = await Promise.all([getAllCustomers(), getAllProducts()])

      if (!customers.length) {
        enqueueSnackbar(ordersUiText.errors.noCustomers, { variant: 'error' })
        return
      }

      if (!products.length) {
        enqueueSnackbar(ordersUiText.errors.noProducts, { variant: 'error' })
        return
      }

      setCreateDialogData({ customers, products })
      setCreateDialogKey((current) => current + 1)
      setCreateDialogOpen(true)
    } catch (error) {
      if (!isAxiosError(error) || !error.response) {
        enqueueSnackbar(ordersUiText.errors.createUnavailable, { variant: 'error' })
      }
    } finally {
      setIsCreateDialogPreloading(false)
    }
  }, [enqueueSnackbar, isCreateDialogPreloading])

  const closeCreateDialog = useCallback(() => {
    if (createMutation.isPending) return
    setCreateDialogOpen(false)
  }, [createMutation.isPending])

  const submitCreateOrder = useCallback(
    async (payload: CreateOrderPayload) => {
      await createMutation.mutateAsync(payload)
      enqueueSnackbar(ordersUiText.toasts.created, { variant: 'success' })
      setCreateDialogOpen(false)
    },
    [createMutation, enqueueSnackbar],
  )

  const openReopenDialog = useCallback((order: OrderListItem) => {
    setSelectedReopenOrder(order)
    setReopenDialogOpen(true)
  }, [])

  const closeReopenDialog = useCallback(() => {
    if (orderStatusMutation.isPending) return
    setReopenDialogOpen(false)
    setSelectedReopenOrder(null)
  }, [orderStatusMutation.isPending])

  const confirmReopen = useCallback(async () => {
    if (!selectedReopenOrder) return
    await orderStatusMutation.mutateAsync({
      orderId: selectedReopenOrder._id,
      status: 'Draft',
    })
    enqueueSnackbar(ordersUiText.toasts.reopened, { variant: 'success' })
    setReopenDialogOpen(false)
    setSelectedReopenOrder(null)
  }, [enqueueSnackbar, orderStatusMutation, selectedReopenOrder])

  const goToOrderDetails = useCallback(
    (orderId: string) => {
      navigate(`/orders/${orderId}`)
    },
    [navigate],
  )

  return {
    search,
    searchDraft,
    status,
    statusOptions: [...ORDER_STATUSES],
    sortField,
    sortOrder,
    page,
    limit,
    rows,
    total,
    filtersOpen,
    exportOpen,
    reopenDialogOpen,
    selectedReopenOrder,
    createDialogOpen,
    createDialogKey,
    createDialogCustomers: createDialogData?.customers ?? [],
    createDialogProducts: createDialogData?.products ?? [],
    isLoading,
    isTableUpdating,
    isCreateDialogPreloading,
    isCreatePending: createMutation.isPending,
    isReopenPending: orderStatusMutation.isPending,
    setSearchDraft,
    setFiltersOpen,
    setExportOpen,
    onSearchApply,
    onRemoveSearch,
    applyStatusFilters,
    onRemoveStatusFilter,
    onSort,
    onPageChange,
    onLimitChange,
    onExportSubmit,
    openCreateDialog,
    closeCreateDialog,
    submitCreateOrder,
    openReopenDialog,
    closeReopenDialog,
    confirmReopen,
    goToOrderDetails,
    reopenDialogMessage: getReopenOrderMessage(selectedReopenOrder?._id),
  }
}
