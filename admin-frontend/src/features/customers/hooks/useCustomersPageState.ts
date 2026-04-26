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
import { useSettingsQuery } from '@/features/settings/hooks/useSettingsQuery'

const OTHER_CITY_FILTER_VALUE = customersUiText.citySelector.otherOption

type ExportSubmitPayload = {
  format: 'csv' | 'json'
  exportFrom: 'all' | 'filtered'
  fields: string[]
}

export function useCustomersPageState() {
  const navigate = useNavigate()
  const { enqueueSnackbar } = useSnackbar()
  const [search, setSearch] = useState('')
  const [searchDraft, setSearchDraft] = useState('')
  const [sortField, setSortField] = useState<CustomersSortField>('createdOn')
  const [sortOrder, setSortOrder] = useState<CustomersSortOrder>('desc')
  const [cities, setCities] = useState<string[]>([])
  const [includeOtherCities, setIncludeOtherCities] = useState(false)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [exportOpen, setExportOpen] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isTransitionPending, startTransition] = useTransition()
  const {
    data: settings,
    isLoading: isSettingsLoading,
    isFetching: isSettingsFetching,
  } = useSettingsQuery()

  const filterValues = useMemo(() => {
    const pickupCities = Object.keys(settings?.delivery.pickupAddresses ?? {})
    return [...pickupCities, OTHER_CITY_FILTER_VALUE]
  }, [settings?.delivery.pickupAddresses])

  const selectedFilters = useMemo(
    () => [...cities, ...(includeOtherCities ? [OTHER_CITY_FILTER_VALUE] : [])],
    [cities, includeOtherCities],
  )

  const query = useMemo(
    () => ({
      search,
      city: cities,
      includeOtherCities,
      sortField,
      sortOrder,
      page,
      limit,
    }),
    [search, cities, includeOtherCities, sortField, sortOrder, page, limit],
  )

  const { data, isLoading, isFetching } = useCustomersQuery(query)
  const exportMutation = useCustomersExportMutation()
  const deleteMutation = useDeleteCustomerMutation()

  const rows = data?.Customers ?? []
  const total = data?.total ?? 0
  const isTableUpdating = isFetching || isTransitionPending
  const isFilterButtonDisabled =
    isSettingsLoading || (!settings && isSettingsFetching) || filterValues.length === 0

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
    const nextIncludeOtherCities = values.includes(OTHER_CITY_FILTER_VALUE)
    const nextCities = values.filter((value) => value !== OTHER_CITY_FILTER_VALUE)

    setCities(nextCities)
    setIncludeOtherCities(nextIncludeOtherCities)
    setFilterOpen(false)
    setPage(1)
  }, [])

  const onRemoveFilter = useCallback((value: string) => {
    if (value === OTHER_CITY_FILTER_VALUE) {
      setIncludeOtherCities(false)
      setPage(1)
      return
    }

    setCities((current) => current.filter((city) => city !== value))
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
              city: cities,
              includeOtherCities,
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
    [
      enqueueSnackbar,
      exportMutation,
      limit,
      page,
      search,
      cities,
      includeOtherCities,
      sortField,
      sortOrder,
    ],
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
    isFilterButtonDisabled,
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
