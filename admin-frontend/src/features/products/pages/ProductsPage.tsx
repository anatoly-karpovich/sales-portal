import { Button, Paper, Stack, Typography } from '@mui/material'
import { Link } from 'react-router-dom'
import { SearchToolbar } from '@/components/shared/SearchToolbar'
import { DataTable } from '@/components/shared/DataTable'
import { PaginationControls } from '@/components/shared/PaginationControls'
import { ExportDialog } from '@/components/shared/ExportDialog'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { sharedUiText } from '@/components/shared/shared.ui-text'
import { ProductsFilterChips } from '@/features/products/components/ProductsFilterChips'
import { ProductsFiltersDialog } from '@/features/products/components/ProductsFiltersDialog'
import {
  getProductsTableColumns,
  PRODUCTS_EXPORT_AVAILABLE_FIELDS,
  PRODUCTS_EXPORT_DEFAULT_FIELDS,
} from '@/features/products/config/productsTableColumns'
import { useProductsPageState } from '@/features/products/hooks/useProductsPageState'
import { getDeleteProductMessage, productsUiText } from '@/features/products/products.ui-text'

export function ProductsPage() {
  const state = useProductsPageState()
  const hasActiveCriteria =
    Boolean(state.search) ||
    state.manufacturer.length > 0 ||
    state.status.length > 0 ||
    state.minPrice !== null ||
    state.maxPrice !== null
  const emptyText = hasActiveCriteria
    ? sharedUiText.table.emptyFiltered
    : productsUiText.listPage.emptyStateNoProducts

  const columns = getProductsTableColumns({
    onView: (product) => state.goToProductDetails(product._id),
    onDelete: state.openDeleteDialog,
  })

  return (
    <Stack spacing={2.5} data-testid="products-list-page">
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={1.5}
        justifyContent="space-between"
        alignItems={{ xs: 'stretch', md: 'center' }}
        data-testid="products-list-page-header"
      >
        <Typography variant="h4" sx={{ fontWeight: 700 }} data-testid="products-list-page-title">
          {productsUiText.listPage.title}
        </Typography>
        <Button
          component={Link}
          to="/products/add"
          variant="contained"
          data-testid="products-list-add-button"
        >
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

          <ProductsFilterChips
            search={state.search}
            searchPrefix={productsUiText.listPage.chips.searchPrefix}
            manufacturerFilters={state.manufacturer}
            manufacturerPrefix={productsUiText.listPage.chips.manufacturerPrefix}
            statusFilters={state.status}
            statusPrefix={productsUiText.listPage.chips.statusPrefix}
            pricePrefix={productsUiText.listPage.chips.pricePrefix}
            minPrice={state.minPrice}
            maxPrice={state.maxPrice}
            onRemoveSearch={state.onRemoveSearch}
            onRemoveManufacturerFilter={state.onRemoveManufacturerFilter}
            onRemoveStatusFilter={state.onRemoveStatusFilter}
            onRemovePriceFilter={state.onRemovePriceFilter}
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

      <ProductsFiltersDialog
        open={state.filtersOpen}
        title={productsUiText.listPage.filtersTitle}
        manufacturersTitle={productsUiText.listPage.filterSections.manufacturer}
        statusTitle={productsUiText.listPage.filterSections.productStatus}
        priceTitle={productsUiText.listPage.filterSections.price}
        minPriceLabel={productsUiText.listPage.fields.minPrice}
        maxPriceLabel={productsUiText.listPage.fields.maxPrice}
        invalidPriceRangeText={productsUiText.listPage.validation.priceRangeInvalid}
        manufacturerValues={state.manufacturerOptions}
        selectedManufacturer={state.manufacturer}
        statusValues={state.statusOptions}
        selectedStatus={state.status}
        selectedMinPrice={state.minPrice}
        selectedMaxPrice={state.maxPrice}
        onClose={() => state.setFiltersOpen(false)}
        onApply={state.applyFilters}
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
    </Stack>
  )
}
