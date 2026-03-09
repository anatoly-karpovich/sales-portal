import { Button, IconButton, Paper, Stack, Tooltip, Typography } from '@mui/material'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined'
import { useMemo, useState, useTransition } from 'react'
import { useSnackbar } from 'notistack'
import { Link, useNavigate } from 'react-router-dom'
import { MANUFACTURERS } from '@/constants/dictionaries'
import { SearchToolbar } from '@/components/shared/SearchToolbar'
import { FilterDialog } from '@/components/shared/FilterDialog'
import { FilterChips } from '@/components/shared/FilterChips'
import { DataTable, type DataTableColumn } from '@/components/shared/DataTable'
import { PaginationControls } from '@/components/shared/PaginationControls'
import { ExportDialog } from '@/components/shared/ExportDialog'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { formatDateTime } from '@/utils/date'
import { downloadBlobResponse } from '@/utils/download'
import {
  useDeleteProductMutation,
  useProductsExportMutation,
  useProductsQuery,
} from '@/features/products/hooks/useProductsQuery'
import type { Product } from '@/api/modules/products.api'
import { ProductDetailsDialog } from '@/features/products/components/ProductDetailsDialog'

export function ProductsPage() {
  const navigate = useNavigate()
  const { enqueueSnackbar } = useSnackbar()
  const [search, setSearch] = useState('')
  const [searchDraft, setSearchDraft] = useState('')
  const [manufacturer, setManufacturer] = useState<string[]>([])
  const [sortField, setSortField] = useState<'name' | 'price' | 'manufacturer' | 'createdOn'>('createdOn')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isTransitionPending, startTransition] = useTransition()

  const query = {
    search,
    manufacturer,
    sortField,
    sortOrder,
    page,
    limit,
  } as const

  const { data, isLoading, isFetching } = useProductsQuery(query)
  const exportMutation = useProductsExportMutation()
  const deleteMutation = useDeleteProductMutation()

  const rows = data?.Products ?? []
  const total = data?.total ?? 0
  const isTableUpdating = isFetching || isTransitionPending

  const openDetailsDialog = (product: Product) => {
    setSelectedProduct(product)
    setDetailsOpen(true)
  }

  const openDeleteDialog = (product: Product) => {
    setSelectedProduct(product)
    setDeleteDialogOpen(true)
  }

  const columns = useMemo<DataTableColumn<Product>[]>(
    () => [
      { key: 'name', label: 'Name', sortable: true, width: '32%', minWidth: 260, render: (row) => row.name },
      { key: 'price', label: 'Price', sortable: true, width: 140, minWidth: 120, render: (row) => `$${row.price}` },
      { key: 'manufacturer', label: 'Manufacturer', sortable: true, width: '22%', minWidth: 180, render: (row) => row.manufacturer },
      { key: 'createdOn', label: 'Created On', sortable: true, width: '28%', minWidth: 220, render: (row) => formatDateTime(row.createdOn) },
      {
        key: 'actions',
        label: 'Actions',
        width: 150,
        minWidth: 140,
        align: 'right',
        stickyRight: true,
        render: (row) => (
          <Stack direction="row" spacing={0.5} justifyContent="flex-end">
            <Tooltip title="Details">
              <IconButton size="small" onClick={() => openDetailsDialog(row)}>
                <VisibilityOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Edit">
              <IconButton size="small" onClick={() => navigate(`/products/${row._id}/edit`)}>
                <EditOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete">
              <IconButton size="small" color="error" onClick={() => openDeleteDialog(row)}>
                <DeleteOutlineOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        ),
      },
    ],
    [navigate],
  )

  const onSort = (field: string) => {
    if (!['name', 'price', 'manufacturer', 'createdOn'].includes(field)) return
    setPage(1)
    setSortField(field as 'name' | 'price' | 'manufacturer' | 'createdOn')
    setSortOrder((currentOrder) => (field === sortField ? (currentOrder === 'asc' ? 'desc' : 'asc') : 'asc'))
  }

  const onExportSubmit = async (payload: { format: 'csv' | 'json'; exportFrom: 'all' | 'filtered'; fields: string[] }) => {
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
    enqueueSnackbar('Export completed', { variant: 'success' })
  }

  return (
    <Stack spacing={2.5}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} justifyContent="space-between" alignItems={{ xs: 'stretch', md: 'center' }}>
        <Typography variant="h5">Products List</Typography>
        <Button component={Link} to="/products/add" variant="contained">
          + Add Product
        </Button>
      </Stack>

      <Paper sx={{ p: 2 }}>
        <Stack spacing={2}>
          <SearchToolbar
            searchDraft={searchDraft}
            hasActiveSearch={Boolean(search)}
            onSearchDraftChange={setSearchDraft}
            isSearching={isTableUpdating}
            onSearchApply={() => {
              setSearch(searchDraft.trim())
              setSearchDraft('')
              setPage(1)
            }}
            onOpenFilters={() => setFiltersOpen(true)}
            onOpenExport={() => setExportOpen(true)}
          />

          <FilterChips
            search={search}
            filters={manufacturer}
            onRemoveSearch={() => {
              setSearch('')
              setSearchDraft('')
              setPage(1)
            }}
            onRemoveFilter={(value) => {
              setManufacturer((current) => current.filter((item) => item !== value))
              setPage(1)
            }}
          />

          <DataTable rows={rows} columns={columns} sortField={sortField} sortOrder={sortOrder} onSort={onSort} isLoading={isLoading} />
          {!isLoading ? (
            <PaginationControls
              total={total}
              page={page}
              limit={limit}
              isLoading={isTableUpdating}
              onPageChange={(value) => {
                startTransition(() => {
                  setPage(value)
                })
              }}
              onLimitChange={(value) => {
                startTransition(() => {
                  setLimit(value)
                  setPage(1)
                })
              }}
            />
          ) : null}
        </Stack>
      </Paper>

      <FilterDialog
        open={filtersOpen}
        title="Filters"
        values={[...MANUFACTURERS]}
        selected={manufacturer}
        onClose={() => setFiltersOpen(false)}
        onApply={(values) => {
          setManufacturer(values)
          setPage(1)
          setFiltersOpen(false)
        }}
      />

      <ExportDialog
        open={exportOpen}
        availableFields={['name', 'amount', 'price', 'manufacturer', 'createdOn', 'notes']}
        defaultFields={['name', 'price', 'manufacturer', 'createdOn']}
        onClose={() => setExportOpen(false)}
        onSubmit={onExportSubmit}
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        title="Delete Product"
        message={`Are you sure you want to delete "${selectedProduct?.name ?? 'this product'}"?`}
        confirmLabel="Yes, Delete"
        cancelLabel="Cancel"
        isSubmitting={deleteMutation.isPending}
        onCancel={() => {
          if (deleteMutation.isPending) return
          setDeleteDialogOpen(false)
        }}
        onConfirm={async () => {
          if (!selectedProduct) return
          await deleteMutation.mutateAsync(selectedProduct._id)
          enqueueSnackbar('Product deleted', { variant: 'success' })
          setDeleteDialogOpen(false)
        }}
      />

      <ProductDetailsDialog
        open={detailsOpen}
        product={selectedProduct}
        onClose={() => setDetailsOpen(false)}
        onEdit={(product) => {
          navigate(`/products/${product._id}/edit`)
        }}
      />
    </Stack>
  )
}
