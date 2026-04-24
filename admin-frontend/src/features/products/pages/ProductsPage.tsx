import { Button, Paper, Stack, Typography } from '@mui/material'
import { Link } from 'react-router-dom'
import { SearchToolbar } from '@/components/shared/SearchToolbar'
import { FilterDialog } from '@/components/shared/FilterDialog'
import { FilterChips } from '@/components/shared/FilterChips'
import { DataTable } from '@/components/shared/DataTable'
import { PaginationControls } from '@/components/shared/PaginationControls'
import { ExportDialog } from '@/components/shared/ExportDialog'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { sharedUiText } from '@/components/shared/shared.ui-text'
import {
  getProductsTableColumns,
  PRODUCTS_EXPORT_AVAILABLE_FIELDS,
  PRODUCTS_EXPORT_DEFAULT_FIELDS,
} from '@/features/products/config/productsTableColumns'
import { useProductsPageState } from '@/features/products/hooks/useProductsPageState'
import { ProductDetailsDialog } from '@/features/products/components/ProductDetailsDialog'
import { getDeleteProductMessage, productsUiText } from '@/features/products/products.ui-text'

export function ProductsPage() {
  const state = useProductsPageState()
  const hasActiveCriteria = Boolean(state.search) || state.manufacturer.length > 0
  const emptyText = hasActiveCriteria
    ? sharedUiText.table.emptyFiltered
    : productsUiText.listPage.emptyStateNoProducts

  const columns = getProductsTableColumns({
    onView: state.openDetailsDialog,
    onEdit: (product) => state.goToProductEdit(product._id),
    onDelete: state.openDeleteDialog,
  })

  return (
    <Stack spacing={2.5} data-testid="products-list-page">
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} justifyContent="space-between" alignItems={{ xs: 'stretch', md: 'center' }} data-testid="products-list-page-header">
        <Typography variant="h4" sx={{ fontWeight: 700 }} data-testid="products-list-page-title">
          {productsUiText.listPage.title}
        </Typography>
        <Button component={Link} to="/products/add" variant="contained" data-testid="products-list-add-button">
          {productsUiText.listPage.addButton}
        </Button>
      </Stack>

      <Paper sx={{ p: 2 }} data-testid="products-list-page-content">
        <Stack spacing={2} data-testid="products-list-page-controls">
          <SearchToolbar
            searchDraft={state.searchDraft}
            hasActiveSearch={Boolean(state.search)}
            onSearchDraftChange={state.setSearchDraft}
            isSearching={state.isTableUpdating}
            onSearchApply={state.onSearchApply}
            onOpenFilters={() => state.setFiltersOpen(true)}
            onOpenExport={() => state.setExportOpen(true)}
          />

          <FilterChips
            search={state.search}
            filters={state.manufacturer}
            onRemoveSearch={state.onRemoveSearch}
            onRemoveFilter={state.onRemoveManufacturerFilter}
          />

          <DataTable
            rows={state.rows}
            columns={columns}
            sortField={state.sortField}
            sortOrder={state.sortOrder}
            onSort={state.onSort}
            isLoading={state.isLoading}
            emptyText={emptyText}
          />
          {!state.isLoading ? (
            <PaginationControls
              total={state.total}
              page={state.page}
              limit={state.limit}
              isLoading={state.isTableUpdating}
              onPageChange={state.onPageChange}
              onLimitChange={state.onLimitChange}
            />
          ) : null}
        </Stack>
      </Paper>

      <FilterDialog
        open={state.filtersOpen}
        title={productsUiText.listPage.filtersTitle}
        values={state.manufacturerOptions}
        selected={state.manufacturer}
        onClose={() => state.setFiltersOpen(false)}
        onApply={state.applyManufacturerFilters}
      />

      <ExportDialog
        open={state.exportOpen}
        availableFields={PRODUCTS_EXPORT_AVAILABLE_FIELDS}
        defaultFields={PRODUCTS_EXPORT_DEFAULT_FIELDS}
        onClose={() => state.setExportOpen(false)}
        onSubmit={state.onExportSubmit}
      />

      <ConfirmDialog
        open={state.deleteDialogOpen}
        title={productsUiText.dialogs.deleteTitle}
        message={getDeleteProductMessage(state.selectedProduct?.name)}
        confirmLabel={productsUiText.dialogs.deleteConfirm}
        cancelLabel={productsUiText.dialogs.cancel}
        isSubmitting={state.isDeletePending}
        onCancel={state.closeDeleteDialog}
        onConfirm={state.onConfirmDelete}
      />

      <ProductDetailsDialog
        open={state.detailsOpen}
        product={state.selectedProduct}
        onClose={state.closeDetailsDialog}
        onEdit={(product) => {
          state.goToProductEdit(product._id)
        }}
      />
    </Stack>
  )
}
