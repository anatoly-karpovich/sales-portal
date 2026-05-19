import { Alert, Box, Paper, Skeleton, Stack, Typography } from '@mui/material'
import { PaginationControls } from '@/components/shared/PaginationControls'
import { SearchToolbar } from '@/components/shared/SearchToolbar'
import { sharedUiText } from '@/components/shared/shared.ui-text'
import { InventoryReservationCard } from '@/features/inventory/components/InventoryReservationCard'
import { InventoryReservationsFilterChips } from '@/features/inventory/components/InventoryReservationsFilterChips'
import { InventoryReservationsFiltersDialog } from '@/features/inventory/components/InventoryReservationsFiltersDialog'
import { InventoryReservationsSummary } from '@/features/inventory/components/InventoryReservationsSummary'
import { useInventoryReservationsPageState } from '@/features/inventory/hooks/useInventoryReservationsPageState'
import { inventoryUiText } from '@/features/inventory/inventory.ui-text'

function InventoryReservationsCardsSkeleton() {
  return (
    <Stack spacing={1.5} data-testid="inventory-reservations-cards-skeleton">
      {Array.from({ length: 3 }).map((_, index) => (
        <Paper key={index} variant="outlined" sx={{ p: { xs: 1.5, md: 2 } }}>
          <Stack spacing={1.25}>
            <Skeleton variant="text" width={280} height={36} />
            <Skeleton variant="text" width="66%" height={22} />
            <Skeleton variant="rounded" height={112} />
            <Skeleton variant="text" width="45%" height={24} />
          </Stack>
        </Paper>
      ))}
    </Stack>
  )
}

export function InventoryReservationsPage() {
  const state = useInventoryReservationsPageState()
  const hasActiveCriteria =
    Boolean(state.search) ||
    state.type.length > 0 ||
    Boolean(state.fromDate) ||
    Boolean(state.toDate) ||
    Boolean(state.expiresBefore)
  const hasActiveChips = hasActiveCriteria || Boolean(state.sortLabel)
  const emptyText = hasActiveCriteria
    ? sharedUiText.table.emptyFiltered
    : inventoryUiText.reservationsPage.emptyStateNoReservations

  if (state.isError) {
    return (
      <Paper sx={{ p: 3 }} data-testid="inventory-reservations-page-load-error">
        <Alert severity="error">
          {inventoryUiText.reservationsPage.placeholders.loadingFailed}
        </Alert>
      </Paper>
    )
  }

  return (
    <Stack spacing={2.5} data-testid="inventory-reservations-page">
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={1.5}
        justifyContent="space-between"
        alignItems={{ xs: 'stretch', md: 'center' }}
        data-testid="inventory-reservations-page-header"
      >
        <Stack spacing={0.5}>
          <Typography
            variant="h4"
            sx={{ fontWeight: 700 }}
            data-testid="inventory-reservations-page-title"
          >
            {inventoryUiText.reservationsPage.title}
          </Typography>
          <Typography color="text.secondary" data-testid="inventory-reservations-page-subtitle">
            {inventoryUiText.reservationsPage.subtitle}
          </Typography>
        </Stack>
      </Stack>

      <Paper
        variant="outlined"
        sx={{ overflow: 'hidden' }}
        data-testid="inventory-reservations-page-shell"
      >
        <Stack spacing={0}>
          <Box
            sx={{
              px: { xs: 2, md: 2.5 },
              py: { xs: 2, md: 2.5 },
              borderBottom: 1,
              borderColor: 'divider',
            }}
          >
            <InventoryReservationsSummary
              summary={state.summary}
              labels={inventoryUiText.reservationsPage.summary}
            />
          </Box>

          <Box sx={{ px: { xs: 2, md: 2.5 }, py: { xs: 2, md: 2.5 } }}>
            <Stack spacing={2} data-testid="inventory-reservations-page-controls">
              <Paper
                variant="outlined"
                sx={{ p: { xs: 1.5, md: 2 } }}
                data-testid="inventory-reservations-page-filters-section"
              >
                <Stack spacing={2}>
                  <SearchToolbar
                    searchDraft={state.searchDraft}
                    hasActiveSearch={Boolean(state.search)}
                    searchPlaceholder="Type order number..."
                    onSearchDraftChange={state.setSearchDraft}
                    onSearchApply={state.onSearchApply}
                    onOpenFilters={() => state.setFiltersOpen(true)}
                    isSearching={state.isCardsUpdating}
                    showExportButton={false}
                  />

                  {hasActiveChips ? (
                    <InventoryReservationsFilterChips
                      search={state.search}
                      searchPrefix={inventoryUiText.reservationsPage.chips.searchPrefix}
                      typeFilters={state.type}
                      typePrefix={inventoryUiText.reservationsPage.chips.typePrefix}
                      fromDate={state.fromDate}
                      fromDatePrefix={inventoryUiText.reservationsPage.chips.fromDatePrefix}
                      toDate={state.toDate}
                      toDatePrefix={inventoryUiText.reservationsPage.chips.toDatePrefix}
                      expiresBefore={state.expiresBefore}
                      expiresBeforePrefix={
                        inventoryUiText.reservationsPage.chips.expiresBeforePrefix
                      }
                      sortLabel={state.sortLabel}
                      sortPrefix={inventoryUiText.reservationsPage.chips.sortPrefix}
                      onRemoveSearch={state.onRemoveSearch}
                      onRemoveType={state.onRemoveType}
                      onRemoveFromDate={state.onRemoveFromDate}
                      onRemoveToDate={state.onRemoveToDate}
                      onRemoveExpiresBefore={state.onRemoveExpiresBefore}
                      onRemoveSort={state.onResetSort}
                    />
                  ) : null}
                </Stack>
              </Paper>

              <Paper
                variant="outlined"
                sx={{ p: { xs: 1.5, md: 2 } }}
                data-testid="inventory-reservations-page-timeline-section"
              >
                <Stack spacing={2}>
                  {state.isLoading ? (
                    <InventoryReservationsCardsSkeleton />
                  ) : state.rows.length === 0 ? (
                    <Alert
                      severity="info"
                      variant="outlined"
                      sx={{
                        alignSelf: 'flex-start',
                        width: 'fit-content',
                        border: 'none',
                      }}
                      data-testid="inventory-reservations-page-empty-alert"
                    >
                      {emptyText}
                    </Alert>
                  ) : (
                    <Stack
                      spacing={2.5}
                      sx={{
                        position: 'relative',
                        pl: { xs: 3, md: 4 },
                      }}
                      data-testid="inventory-reservations-cards-list"
                    >
                      <Box
                        sx={{
                          position: 'absolute',
                          top: 10,
                          bottom: 10,
                          left: { xs: 11, md: 15 },
                          width: 2,
                          borderRadius: 999,
                          backgroundColor: 'divider',
                        }}
                        aria-hidden
                        data-testid="inventory-reservations-timeline-line"
                      />

                      {state.rows.map((reservation, index) => (
                        <Box
                          key={reservation._id}
                          sx={{ position: 'relative' }}
                          data-testid={`inventory-reservations-timeline-item-${index}`}
                        >
                          <Box
                            sx={{
                              position: 'absolute',
                              width: 12,
                              height: 12,
                              borderRadius: '50%',
                              left: { xs: -18, md: -22 },
                              top: '50%',
                              transform: 'translateY(-50%)',
                              border: 2,
                              borderColor: 'background.paper',
                              backgroundColor: 'primary.main',
                              boxShadow: (theme) =>
                                theme.palette.mode === 'dark'
                                  ? '0 0 0 4px rgba(66, 165, 245, 0.2)'
                                  : '0 0 0 4px rgba(25, 118, 210, 0.14)',
                            }}
                            aria-hidden
                            data-testid={`inventory-reservations-timeline-item-${index}-dot`}
                          />

                          <InventoryReservationCard
                            reservation={reservation}
                            index={index}
                            labels={inventoryUiText.reservationsPage.card}
                          />
                        </Box>
                      ))}
                    </Stack>
                  )}

                  {!state.isLoading && state.rows.length > 0 ? (
                    <PaginationControls
                      total={state.total}
                      page={state.page}
                      limit={state.limit}
                      isLoading={state.isCardsUpdating}
                      onPageChange={state.onPageChange}
                      onLimitChange={state.onLimitChange}
                    />
                  ) : null}
                </Stack>
              </Paper>
            </Stack>
          </Box>
        </Stack>
      </Paper>

      <InventoryReservationsFiltersDialog
        open={state.filtersOpen}
        title={inventoryUiText.reservationsPage.filtersTitle}
        typeTitle={inventoryUiText.reservationsPage.filterSections.type}
        createdDateTitle={inventoryUiText.reservationsPage.filterSections.createdDate}
        expiresBeforeTitle={inventoryUiText.reservationsPage.filterSections.expiresBefore}
        sortTitle={inventoryUiText.reservationsPage.filterSections.sort}
        fromDateLabel={inventoryUiText.reservationsPage.fromDateLabel}
        toDateLabel={inventoryUiText.reservationsPage.toDateLabel}
        expiresBeforeLabel={inventoryUiText.reservationsPage.expiresBeforeLabel}
        sortLabel={inventoryUiText.reservationsPage.sortLabel}
        typeValues={state.typeOptions}
        selectedType={state.type}
        selectedFromDate={state.fromDate}
        selectedToDate={state.toDate}
        selectedExpiresBefore={state.expiresBefore}
        selectedSortField={state.sortField}
        selectedSortOrder={state.sortOrder}
        onClose={() => state.setFiltersOpen(false)}
        onApply={state.applyFilters}
      />
    </Stack>
  )
}
