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
  CUSTOMERS_EXPORT_AVAILABLE_FIELDS,
  CUSTOMERS_EXPORT_DEFAULT_FIELDS,
  getCustomersTableColumns,
} from '@/features/customers/config/customersTableColumns'
import { useCustomersPageState } from '@/features/customers/hooks/useCustomersPageState'
import { customersUiText, getDeleteCustomerMessage } from '@/features/customers/customers.ui-text'

export function CustomersPage() {
  const state = useCustomersPageState()
  const hasActiveCriteria = Boolean(state.search) || state.country.length > 0
  const emptyText = hasActiveCriteria
    ? sharedUiText.table.emptyFiltered
    : customersUiText.listPage.emptyStateNoCustomers

  const columns = getCustomersTableColumns({
    onView: (customer) => state.goToCustomerDetails(customer._id),
    onEdit: (customer) => state.goToCustomerEdit(customer._id),
    onDelete: state.openDeleteDialog,
  })

  return (
    <Stack spacing={2.5} data-testid="customers-list-page">
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={1.5}
        justifyContent="space-between"
        alignItems={{ xs: 'stretch', md: 'center' }}
        data-testid="customers-list-page-header"
      >
        <Typography variant="h4" sx={{ fontWeight: 700 }} data-testid="customers-list-page-title">
          {customersUiText.listPage.title}
        </Typography>
        <Button
          component={Link}
          to="/customers/add"
          variant="contained"
          data-testid="customers-list-add-button"
        >
          {customersUiText.listPage.addButton}
        </Button>
      </Stack>

      <Paper sx={{ p: 2 }} data-testid="customers-list-page-content">
        <Stack spacing={2} data-testid="customers-list-page-controls">
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
            filters={state.country}
            onRemoveSearch={state.onRemoveSearch}
            onRemoveFilter={state.onRemoveCountryFilter}
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
        title={customersUiText.listPage.filtersTitle}
        values={state.countryOptions}
        selected={state.country}
        onClose={() => state.setFiltersOpen(false)}
        onApply={state.applyCountryFilters}
      />

      <ExportDialog
        open={state.exportOpen}
        availableFields={CUSTOMERS_EXPORT_AVAILABLE_FIELDS}
        defaultFields={CUSTOMERS_EXPORT_DEFAULT_FIELDS}
        onClose={() => state.setExportOpen(false)}
        onSubmit={state.onExportSubmit}
      />

      <ConfirmDialog
        open={state.deleteDialogOpen}
        title={customersUiText.dialogs.deleteTitle}
        message={getDeleteCustomerMessage(state.selectedCustomer?.name)}
        confirmLabel={customersUiText.dialogs.deleteConfirm}
        cancelLabel={customersUiText.dialogs.cancel}
        isSubmitting={state.isDeletePending}
        onCancel={state.closeDeleteDialog}
        onConfirm={state.onConfirmDelete}
      />
    </Stack>
  )
}
