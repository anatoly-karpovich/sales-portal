import { Button, CircularProgress, Paper, Stack, Typography } from '@mui/material'
import { SearchToolbar } from '@/components/shared/SearchToolbar'
import { DataTable } from '@/components/shared/DataTable'
import { PaginationControls } from '@/components/shared/PaginationControls'
import { ExportDialog } from '@/components/shared/ExportDialog'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { sharedUiText } from '@/components/shared/shared.ui-text'
import { OrdersFilterChips } from '@/features/orders/components/OrdersFilterChips'
import { OrdersFiltersDialog } from '@/features/orders/components/OrdersFiltersDialog'
import {
  getOrdersTableColumns,
  ORDERS_EXPORT_AVAILABLE_FIELDS,
  ORDERS_EXPORT_DEFAULT_FIELDS,
} from '@/features/orders/config/ordersTableColumns'
import { useOrdersPageState } from '@/features/orders/hooks/useOrdersPageState'
import { ordersUiText } from '@/features/orders/orders.ui-text'

export function OrdersPage() {
  const state = useOrdersPageState()
  const hasActiveCriteria =
    Boolean(state.search) || state.status.length > 0 || state.deliveryStatus.length > 0
  const emptyText = hasActiveCriteria
    ? sharedUiText.table.emptyFiltered
    : ordersUiText.listPage.emptyStateNoOrders

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
          onClick={() => void state.openCreatePage()}
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

          <OrdersFilterChips
            search={state.search}
            searchPrefix={ordersUiText.listPage.chips.searchPrefix}
            statusFilters={state.status}
            deliveryStatusFilters={state.deliveryStatus}
            orderStatusPrefix={ordersUiText.listPage.chips.orderStatusPrefix}
            deliveryStatusPrefix={ordersUiText.listPage.chips.deliveryStatusPrefix}
            onRemoveSearch={state.onRemoveSearch}
            onRemoveStatusFilter={state.onRemoveStatusFilter}
            onRemoveDeliveryStatusFilter={state.onRemoveDeliveryStatusFilter}
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

      <OrdersFiltersDialog
        open={state.filtersOpen}
        title={ordersUiText.listPage.filtersTitle}
        orderStatusTitle={ordersUiText.listPage.filterSections.orderStatus}
        deliveryStatusTitle={ordersUiText.listPage.filterSections.deliveryStatus}
        statusValues={state.statusOptions}
        selectedStatus={state.status}
        deliveryStatusValues={state.deliveryStatusOptions}
        selectedDeliveryStatus={state.deliveryStatus}
        onClose={() => state.setFiltersOpen(false)}
        onApply={state.applyFilters}
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
    </Stack>
  )
}
