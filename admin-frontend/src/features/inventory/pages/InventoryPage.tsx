import { Paper, Stack, Typography } from '@mui/material'
import { DataTable } from '@/components/shared/DataTable'
import { PaginationControls } from '@/components/shared/PaginationControls'
import { SearchToolbar } from '@/components/shared/SearchToolbar'
import { sharedUiText } from '@/components/shared/shared.ui-text'
import { InventoryFilterChips } from '@/features/inventory/components/InventoryFilterChips'
import { InventoryFiltersDialog } from '@/features/inventory/components/InventoryFiltersDialog'
import { getInventoryTableColumns } from '@/features/inventory/config/inventoryTableColumns'
import { useInventoryPageState } from '@/features/inventory/hooks/useInventoryPageState'
import { inventoryUiText } from '@/features/inventory/inventory.ui-text'

export function InventoryPage() {
  const state = useInventoryPageState()
  const hasActiveCriteria =
    Boolean(state.search) ||
    state.inventoryStatus.length > 0 ||
    state.productStatus.length > 0 ||
    state.manufacturer.length > 0
  const emptyText = hasActiveCriteria ? sharedUiText.table.emptyFiltered : sharedUiText.table.empty

  const columns = getInventoryTableColumns()

  return (
    <Stack spacing={2.5} data-testid="inventory-list-page">
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={1.5}
        justifyContent="space-between"
        alignItems={{ xs: 'stretch', md: 'center' }}
        data-testid="inventory-list-page-header"
      >
        <Typography variant="h4" sx={{ fontWeight: 700 }} data-testid="inventory-list-page-title">
          {inventoryUiText.listPage.title}
        </Typography>
      </Stack>

      <Paper sx={{ p: 2 }} data-testid="inventory-list-page-content">
        <Stack spacing={2} data-testid="inventory-list-page-controls">
          <SearchToolbar
            searchDraft={state.searchDraft}
            hasActiveSearch={Boolean(state.search)}
            onSearchDraftChange={state.setSearchDraft}
            isSearching={state.isTableUpdating}
            onSearchApply={state.onSearchApply}
            onOpenFilters={() => state.setFiltersOpen(true)}
            showExportButton={false}
          />

          <InventoryFilterChips
            search={state.search}
            searchPrefix={inventoryUiText.listPage.chips.searchPrefix}
            inventoryStatusFilters={state.inventoryStatus}
            inventoryStatusPrefix={inventoryUiText.listPage.chips.inventoryStatusPrefix}
            productStatusFilters={state.productStatus}
            productStatusPrefix={inventoryUiText.listPage.chips.productStatusPrefix}
            manufacturerFilters={state.manufacturer}
            manufacturerPrefix={inventoryUiText.listPage.chips.manufacturerPrefix}
            onRemoveSearch={state.onRemoveSearch}
            onRemoveInventoryStatusFilter={state.onRemoveInventoryStatusFilter}
            onRemoveProductStatusFilter={state.onRemoveProductStatusFilter}
            onRemoveManufacturerFilter={state.onRemoveManufacturerFilter}
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

      <InventoryFiltersDialog
        open={state.filtersOpen}
        title={inventoryUiText.listPage.filtersTitle}
        manufacturerTitle={inventoryUiText.listPage.filterSections.manufacturer}
        productStatusTitle={inventoryUiText.listPage.filterSections.productStatus}
        inventoryStatusTitle={inventoryUiText.listPage.filterSections.inventoryStatus}
        manufacturerValues={state.manufacturerOptions}
        selectedManufacturer={state.manufacturer}
        productStatusValues={state.productStatusOptions}
        selectedProductStatus={state.productStatus}
        inventoryStatusValues={state.inventoryStatusOptions}
        selectedInventoryStatus={state.inventoryStatus}
        onClose={() => state.setFiltersOpen(false)}
        onApply={state.applyFilters}
      />
    </Stack>
  )
}
