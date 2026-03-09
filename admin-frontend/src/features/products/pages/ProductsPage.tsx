import { Box, Button, CircularProgress, IconButton, Paper, Stack, Tooltip, Typography } from '@mui/material'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined'
import { useMemo, useState } from 'react'
import { useSnackbar } from 'notistack'
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
import { useProductsExportMutation, useProductsQuery } from '@/features/products/hooks/useProductsQuery'
import type { Product } from '@/api/modules/products.api'

export function ProductsPage() {
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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

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

  const rows = data?.Products ?? []
  const total = data?.total ?? 0

  const columns = useMemo<DataTableColumn<Product>[]>(
    () => [
      { key: 'name', label: 'Name', sortable: true, render: (row) => row.name },
      { key: 'price', label: 'Price', sortable: true, render: (row) => `$${row.price}` },
      { key: 'manufacturer', label: 'Manufacturer', sortable: true, render: (row) => row.manufacturer },
      { key: 'createdOn', label: 'Created On', sortable: true, render: (row) => formatDateTime(row.createdOn) },
      {
        key: 'actions',
        label: 'Actions',
        render: () => (
          <Stack direction="row" spacing={0.5}>
            <Tooltip title="Details">
              <IconButton size="small">
                <VisibilityOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Edit">
              <IconButton size="small">
                <EditOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete">
              <IconButton size="small" color="error" onClick={() => setDeleteDialogOpen(true)}>
                <DeleteOutlineOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        ),
      },
    ],
    [],
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
        <Button variant="contained">+ Add Product</Button>
      </Stack>

      <Paper sx={{ p: 2 }}>
        <Stack spacing={2}>
          <SearchToolbar
            searchDraft={searchDraft}
            onSearchDraftChange={setSearchDraft}
            isSearching={isFetching}
            onSearchApply={() => {
              setSearch(searchDraft.trim())
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

          {isLoading ? (
            <Box sx={{ display: 'grid', placeItems: 'center', py: 6 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <DataTable rows={rows} columns={columns} sortField={sortField} sortOrder={sortOrder} onSort={onSort} />
              <PaginationControls
                total={total}
                page={page}
                limit={limit}
                onPageChange={(value) => setPage(value)}
                onLimitChange={(value) => {
                  setLimit(value)
                  setPage(1)
                }}
              />
              {isFetching ? (
                <Typography variant="caption" color="text.secondary">
                  Updating...
                </Typography>
              ) : null}
            </>
          )}
        </Stack>
      </Paper>

      <FilterDialog
        open={filtersOpen}
        title="Product Filters"
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
        availableFields={['_id', 'name', 'amount', 'price', 'manufacturer', 'createdOn', 'notes']}
        defaultFields={['name', 'price', 'manufacturer', 'createdOn']}
        onClose={() => setExportOpen(false)}
        onSubmit={onExportSubmit}
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        title="Delete Product"
        message="Delete flow will be wired in the Products feature migration phase."
        confirmLabel="Ok"
        cancelLabel="Close"
        onCancel={() => setDeleteDialogOpen(false)}
        onConfirm={async () => {
          setDeleteDialogOpen(false)
        }}
      />
    </Stack>
  )
}
