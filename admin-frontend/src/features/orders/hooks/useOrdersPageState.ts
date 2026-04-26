import { isAxiosError } from 'axios'
import { useCallback, useEffect, useMemo, useState, useTransition } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSnackbar } from 'notistack'
import { getCustomers } from '@/api/modules/customers.api'
import { getProducts } from '@/api/modules/products.api'
import type {
  CreateOrderPayload,
  OrderDeliveryStatus,
  OrderListItem,
  OrderStatus,
} from '@/api/modules/orders.api'
import { downloadBlobResponse } from '@/utils/download'
import { DELIVERY_STATUSES, ORDER_STATUSES } from '@/constants/dictionaries'
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

type OrdersFiltersApplyPayload = {
  status: string[]
  deliveryStatus: string[]
}

const ORDER_STATUS_SET = new Set<string>(ORDER_STATUSES)
const DELIVERY_STATUS_SET = new Set<string>(DELIVERY_STATUSES)

function toOrderStatusList(values: string[]): OrderStatus[] {
  return values.filter((value): value is OrderStatus => ORDER_STATUS_SET.has(value))
}

function toOrderDeliveryStatusList(values: string[]): OrderDeliveryStatus[] {
  return values.filter(
    (value): value is OrderDeliveryStatus => DELIVERY_STATUS_SET.has(value),
  )
}

export function useOrdersPageState() {
  const navigate = useNavigate()
  const { enqueueSnackbar } = useSnackbar()
  const [search, setSearch] = useState('')
  const [searchDraft, setSearchDraft] = useState('')
  const [status, setStatus] = useState<OrderStatus[]>([])
  const [deliveryStatus, setDeliveryStatus] = useState<OrderDeliveryStatus[]>([])
  const [sortField, setSortField] = useState<OrdersSortField>('createdOn')
  const [sortOrder, setSortOrder] = useState<OrdersSortOrder>('desc')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [selectedReopenOrder, setSelectedReopenOrder] = useState<OrderListItem | null>(null)
  const [reopenDialogOpen, setReopenDialogOpen] = useState(false)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [createDialogKey, setCreateDialogKey] = useState(0)
  const [isCreateDialogPreloading, setIsCreateDialogPreloading] = useState(false)
  const [isTransitionPending, startTransition] = useTransition()

  const query = useMemo(
    () => ({
      search,
      status,
      deliveryStatus,
      sortField,
      sortOrder,
      page,
      limit,
    }),
    [search, status, deliveryStatus, sortField, sortOrder, page, limit],
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

  const applyFilters = useCallback((values: OrdersFiltersApplyPayload) => {
    setStatus(toOrderStatusList(values.status))
    setDeliveryStatus(toOrderDeliveryStatusList(values.deliveryStatus))
    setPage(1)
    setFiltersOpen(false)
  }, [])

  const onRemoveStatusFilter = useCallback((value: string) => {
    setStatus((current) => current.filter((item) => item !== value))
    setPage(1)
  }, [])

  const onRemoveDeliveryStatusFilter = useCallback((value: string) => {
    setDeliveryStatus((current) => current.filter((item) => item !== value))
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
              deliveryStatus,
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
    [
      deliveryStatus,
      enqueueSnackbar,
      exportMutation,
      limit,
      page,
      search,
      sortField,
      sortOrder,
      status,
    ],
  )

  const openCreateDialog = useCallback(async () => {
    if (isCreateDialogPreloading) return

    setCreateDialogOpen(false)
    setIsCreateDialogPreloading(true)
    try {
      const [customersResponse, productsResponse] = await Promise.all([
        getCustomers({
          search: '',
          sortField: 'name',
          sortOrder: 'asc',
          page: 1,
          limit: 1,
        }),
        getProducts({
          search: '',
          manufacturer: [],
          sortField: 'name',
          sortOrder: 'asc',
          page: 1,
          limit: 1,
        }),
      ])

      if (!customersResponse.total) {
        enqueueSnackbar(ordersUiText.errors.noCustomers, { variant: 'error' })
        return
      }

      if (!productsResponse.total) {
        enqueueSnackbar(ordersUiText.errors.noProducts, { variant: 'error' })
        return
      }

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
    deliveryStatus,
    statusOptions: [...ORDER_STATUSES],
    deliveryStatusOptions: [...DELIVERY_STATUSES],
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
    applyFilters,
    onRemoveStatusFilter,
    onRemoveDeliveryStatusFilter,
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
