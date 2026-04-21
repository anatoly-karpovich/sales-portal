import { Button, CircularProgress, Paper, Stack, Typography } from '@mui/material'
import { SearchToolbar } from '@/components/shared/SearchToolbar'
import { FilterDialog } from '@/components/shared/FilterDialog'
import { FilterChips } from '@/components/shared/FilterChips'
import { DataTable } from '@/components/shared/DataTable'
import { PaginationControls } from '@/components/shared/PaginationControls'
import { ExportDialog } from '@/components/shared/ExportDialog'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { CreateOrderDialog } from '@/features/orders/components/CreateOrderDialog'
import {
  getOrdersTableColumns,
  ORDERS_EXPORT_AVAILABLE_FIELDS,
  ORDERS_EXPORT_DEFAULT_FIELDS,
} from '@/features/orders/config/ordersTableColumns'
import { useOrdersPageState } from '@/features/orders/hooks/useOrdersPageState'
import { ordersUiText } from '@/features/orders/orders.ui-text'

export function OrdersPage() {
  const state = useOrdersPageState()

  const columns = getOrdersTableColumns({
    onDetails: state.goToOrderDetails,
    onReopen: state.openReopenDialog,
  })

  return (
    <Stack spacing={2.5} data-testid="orders-list-page">
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={1.5}
        justifyContent="space-between"
        alignItems={{ xs: 'stretch', md: 'center' }}
        data-testid="orders-list-page-header"
      >
        <Typography variant="h4" sx={{ fontWeight: 700 }} data-testid="orders-list-page-title">
          {ordersUiText.listPage.title}
        </Typography>
        <Button
          variant="contained"
          onClick={() => void state.openCreateDialog()}
          disabled={state.isCreateDialogPreloading}
          startIcon={state.isCreateDialogPreloading ? <CircularProgress size={14} color="inherit" /> : null}
          data-testid="orders-list-create-button"
        >
          {ordersUiText.listPage.createButton}
        </Button>
      </Stack>

      <Paper sx={{ p: 2 }} data-testid="orders-list-page-content">
        <Stack spacing={2} data-testid="orders-list-page-controls">
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
            filters={state.status}
            onRemoveSearch={state.onRemoveSearch}
            onRemoveFilter={state.onRemoveStatusFilter}
          />

          <DataTable
            rows={state.rows}
            columns={columns}
            sortField={state.sortField}
            sortOrder={state.sortOrder}
            onSort={state.onSort}
            isLoading={state.isLoading}
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
        title={ordersUiText.listPage.filtersTitle}
        values={state.statusOptions}
        selected={state.status}
        onClose={() => state.setFiltersOpen(false)}
        onApply={state.applyStatusFilters}
      />

      <ExportDialog
        open={state.exportOpen}
        availableFields={ORDERS_EXPORT_AVAILABLE_FIELDS}
        defaultFields={ORDERS_EXPORT_DEFAULT_FIELDS}
        onClose={() => state.setExportOpen(false)}
        onSubmit={state.onExportSubmit}
      />

      <ConfirmDialog
        open={state.reopenDialogOpen}
        title={ordersUiText.dialogs.reopenTitle}
        message={state.reopenDialogMessage}
        confirmLabel={ordersUiText.dialogs.reopenConfirm}
        cancelLabel={ordersUiText.dialogs.cancel}
        isSubmitting={state.isReopenPending}
        onCancel={state.closeReopenDialog}
        onConfirm={state.confirmReopen}
      />

      <CreateOrderDialog
        key={state.createDialogKey}
        open={state.createDialogOpen}
        customers={state.createDialogCustomers}
        products={state.createDialogProducts}
        isSubmitting={state.isCreatePending}
        onClose={state.closeCreateDialog}
        onSubmit={state.submitCreateOrder}
      />
    </Stack>
  )
}
