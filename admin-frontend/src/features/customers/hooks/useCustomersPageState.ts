import { useCallback, useMemo, useState, useTransition } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSnackbar } from 'notistack'
import type { Customer } from '@/api/modules/customers.api'
import { downloadBlobResponse } from '@/utils/download'
import {
  isCustomersSortField,
  type CustomersSortField,
  type CustomersSortOrder,
} from '@/features/customers/config/customersTableColumns'
import {
  useCustomersExportMutation,
  useCustomersQuery,
  useDeleteCustomerMutation,
} from '@/features/customers/hooks/useCustomersQuery'
import { customersUiText } from '@/features/customers/customers.ui-text'
import { US_STATES, US_STATE_BY_CODE } from '@/constants/usStates'

type ExportSubmitPayload = {
  format: 'csv' | 'json'
  exportFrom: 'all' | 'filtered'
  fields: string[]
}

const STATE_LABEL_TO_CODE = new Map(US_STATES.map((state) => [state.label, state.code]))

function toStateLabel(code: string) {
  return US_STATE_BY_CODE.get(code)?.label ?? code
}

export function useCustomersPageState() {
  const navigate = useNavigate()
  const { enqueueSnackbar } = useSnackbar()
  const [search, setSearch] = useState('')
  const [searchDraft, setSearchDraft] = useState('')
  const [sortField, setSortField] = useState<CustomersSortField>('createdOn')
  const [sortOrder, setSortOrder] = useState<CustomersSortOrder>('desc')
  const [states, setStates] = useState<string[]>([])
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [exportOpen, setExportOpen] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isTransitionPending, startTransition] = useTransition()

  const filterValues = useMemo(() => US_STATES.map((state) => state.label), [])
  const selectedFilters = useMemo(() => states.map((stateCode) => toStateLabel(stateCode)), [states])

  const query = useMemo(
    () => ({
      search,
      state: states,
      sortField,
      sortOrder,
      page,
      limit,
    }),
    [search, states, sortField, sortOrder, page, limit],
  )

  const { data, isLoading, isFetching } = useCustomersQuery(query)
  const exportMutation = useCustomersExportMutation()
  const deleteMutation = useDeleteCustomerMutation()

  const rows = data?.Customers ?? []
  const total = data?.total ?? 0
  const isTableUpdating = isFetching || isTransitionPending

  const openDeleteDialog = useCallback((customer: Customer) => {
    setSelectedCustomer(customer)
    setDeleteDialogOpen(true)
  }, [])

  const closeDeleteDialog = useCallback(() => {
    if (deleteMutation.isPending) return
    setDeleteDialogOpen(false)
  }, [deleteMutation.isPending])

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

  const onFilterApply = useCallback((values: string[]) => {
    const nextStates = values
      .map((label) => STATE_LABEL_TO_CODE.get(label) ?? null)
      .filter((value): value is string => Boolean(value))

    setStates(nextStates)
    setFilterOpen(false)
    setPage(1)
  }, [])

  const onRemoveFilter = useCallback((value: string) => {
    const stateCode = STATE_LABEL_TO_CODE.get(value)
    if (!stateCode) return

    setStates((current) => current.filter((item) => item !== stateCode))
    setPage(1)
  }, [])

  const onSort = useCallback(
    (field: string) => {
      if (!isCustomersSortField(field)) return
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
              state: states,
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
      downloadBlobResponse(response, `customers-export.${payload.format}`)
      enqueueSnackbar(customersUiText.toasts.exportCompleted, { variant: 'success' })
    },
    [enqueueSnackbar, exportMutation, limit, page, search, states, sortField, sortOrder],
  )

  const onConfirmDelete = useCallback(async () => {
    if (!selectedCustomer) return
    await deleteMutation.mutateAsync(selectedCustomer._id)
    if (rows.length === 1 && page > 1) {
      setPage(page - 1)
    }
    enqueueSnackbar(customersUiText.toasts.deletedFromList, { variant: 'success' })
    setDeleteDialogOpen(false)
  }, [deleteMutation, enqueueSnackbar, page, rows.length, selectedCustomer])

  const goToCustomerDetails = useCallback(
    (customerId: string) => {
      navigate(`/customers/${customerId}`)
    },
    [navigate],
  )

  const goToCustomerEdit = useCallback(
    (customerId: string) => {
      navigate(`/customers/${customerId}/edit`)
    },
    [navigate],
  )

  return {
    search,
    searchDraft,
    sortField,
    sortOrder,
    page,
    limit,
    rows,
    total,
    selectedCustomer,
    exportOpen,
    filterOpen,
    filterValues,
    selectedFilters,
    isFilterButtonDisabled: false,
    deleteDialogOpen,
    isLoading,
    isTableUpdating,
    isDeletePending: deleteMutation.isPending,
    setSearchDraft,
    setExportOpen,
    setFilterOpen,
    onSearchApply,
    onSort,
    onPageChange,
    onLimitChange,
    onRemoveSearch,
    onFilterApply,
    onRemoveFilter,
    onExportSubmit,
    openDeleteDialog,
    closeDeleteDialog,
    onConfirmDelete,
    goToCustomerDetails,
    goToCustomerEdit,
  }
}
