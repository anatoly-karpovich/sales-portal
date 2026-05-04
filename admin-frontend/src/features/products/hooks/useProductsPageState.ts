import { useCallback, useMemo, useState, useTransition } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSnackbar } from 'notistack'
import { downloadBlobResponse } from '@/utils/download'
import type { Product } from '@/api/modules/products.api'
import {
  isProductsSortField,
  type ProductsSortField,
  type ProductsSortOrder,
} from '@/features/products/config/productsTableColumns'
import {
  useDeleteProductMutation,
  useProductsExportMutation,
  useProductsQuery,
} from '@/features/products/hooks/useProductsQuery'
import { useManufacturerOptions } from '@/features/products/hooks/useManufacturerOptions'
import { getProductApiErrorMessage, productsUiText } from '@/features/products/products.ui-text'

type ExportSubmitPayload = {
  format: 'csv' | 'json'
  exportFrom: 'all' | 'filtered'
  fields: string[]
}

function getErrorStatus(error: unknown) {
  return (error as { response?: { status?: number } })?.response?.status
}

export function useProductsPageState() {
  const navigate = useNavigate()
  const { enqueueSnackbar } = useSnackbar()
  const { options: manufacturerOptions } = useManufacturerOptions()
  const [search, setSearch] = useState('')
  const [searchDraft, setSearchDraft] = useState('')
  const [manufacturer, setManufacturer] = useState<string[]>([])
  const [sortField, setSortField] = useState<ProductsSortField>('createdOn')
  const [sortOrder, setSortOrder] = useState<ProductsSortOrder>('desc')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isTransitionPending, startTransition] = useTransition()

  const query = useMemo(
    () => ({
      search,
      manufacturer,
      sortField,
      sortOrder,
      page,
      limit,
    }),
    [search, manufacturer, sortField, sortOrder, page, limit],
  )

  const { data, isLoading, isFetching } = useProductsQuery(query)
  const exportMutation = useProductsExportMutation()
  const deleteMutation = useDeleteProductMutation()

  const rows = data?.Products ?? []
  const total = data?.total ?? 0
  const isTableUpdating = isFetching || isTransitionPending

  const goToProductDetails = useCallback(
    (productId: string) => {
      navigate(`/products/${productId}`)
    },
    [navigate],
  )

  const openDeleteDialog = useCallback((product: Product) => {
    setSelectedProduct(product)
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

  const onRemoveManufacturerFilter = useCallback((value: string) => {
    setManufacturer((current) => current.filter((item) => item !== value))
    setPage(1)
  }, [])

  const onSort = useCallback(
    (field: string) => {
      if (!isProductsSortField(field)) return
      setPage(1)
      setSortField(field)
      setSortOrder((currentOrder) => (field === sortField ? (currentOrder === 'asc' ? 'desc' : 'asc') : 'asc'))
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
      try {
        const filters =
          payload.exportFrom === 'all'
            ? null
            : {
                search,
                manufacturer,
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
        downloadBlobResponse(response, `products-export.${payload.format}`)
        enqueueSnackbar(productsUiText.toasts.exportCompleted, { variant: 'success' })
      } catch (error) {
        enqueueSnackbar(getProductApiErrorMessage(getErrorStatus(error)), { variant: 'error' })
      }
    },
    [enqueueSnackbar, exportMutation, limit, manufacturer, page, search, sortField, sortOrder],
  )

  const onConfirmDelete = useCallback(async () => {
    if (!selectedProduct) return
    try {
      await deleteMutation.mutateAsync(selectedProduct._id)
      if (rows.length === 1 && page > 1) {
        setPage(page - 1)
      }
      enqueueSnackbar(productsUiText.toasts.deletedFromList, { variant: 'success' })
      setDeleteDialogOpen(false)
    } catch (error) {
      enqueueSnackbar(getProductApiErrorMessage(getErrorStatus(error)), { variant: 'error' })
    }
  }, [deleteMutation, enqueueSnackbar, page, rows.length, selectedProduct])

  return {
    search,
    searchDraft,
    manufacturer,
    manufacturerOptions,
    sortField,
    sortOrder,
    page,
    limit,
    rows,
    total,
    selectedProduct,
    filtersOpen,
    exportOpen,
    deleteDialogOpen,
    isLoading,
    isTableUpdating,
    isDeletePending: deleteMutation.isPending,
    setSearchDraft,
    setFiltersOpen,
    setExportOpen,
    onSearchApply,
    onSort,
    onPageChange,
    onLimitChange,
    onRemoveSearch,
    onRemoveManufacturerFilter,
    onExportSubmit,
    openDeleteDialog,
    closeDeleteDialog,
    onConfirmDelete,
    applyManufacturerFilters: (values: string[]) => {
      setManufacturer(values)
      setPage(1)
      setFiltersOpen(false)
    },
    goToProductDetails,
  }
}
