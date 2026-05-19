import KeyboardBackspaceRoundedIcon from '@mui/icons-material/KeyboardBackspaceRounded'
import FilterAltOutlinedIcon from '@mui/icons-material/FilterAltOutlined'
import {
  Alert,
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  Typography,
} from '@mui/material'
import { Link, useParams } from 'react-router-dom'
import { DataTable } from '@/components/shared/DataTable'
import { PaginationControls } from '@/components/shared/PaginationControls'
import { sharedUiText } from '@/components/shared/shared.ui-text'
import { InventoryHistoryFilterChips } from '@/features/inventory/components/InventoryHistoryFilterChips'
import { InventoryHistoryFiltersDialog } from '@/features/inventory/components/InventoryHistoryFiltersDialog'
import { getInventoryHistoryTableColumns } from '@/features/inventory/config/inventoryHistoryTableColumns'
import { useInventoryHistoryPageState } from '@/features/inventory/hooks/useInventoryHistoryPageState'
import { inventoryUiText } from '@/features/inventory/inventory.ui-text'

export function InventoryHistoryPage() {
  const { productId } = useParams<{ productId: string }>()
  const state = useInventoryHistoryPageState(productId ?? '')
  const columns = getInventoryHistoryTableColumns()
  const hasActiveCriteria =
    !state.isAllVariantsSelected ||
    state.type.length > 0 ||
    Boolean(state.orderId) ||
    Boolean(state.fromDate) ||
    Boolean(state.toDate)
  const hasActiveChips = hasActiveCriteria || Boolean(state.sortLabel)
  const emptyText = hasActiveCriteria ? sharedUiText.table.emptyFiltered : sharedUiText.table.empty

  if (!productId) {
    return (
      <Paper sx={{ p: 3 }} data-testid="inventory-history-page-missing-id">
        <Typography color="error">
          {inventoryUiText.detailsPage.placeholders.missingProductId}
        </Typography>
      </Paper>
    )
  }

  if (state.isDataUnavailable) {
    return (
      <Paper sx={{ p: 3 }} data-testid="inventory-history-page-load-error">
        <Stack spacing={2} alignItems="flex-start">
          <Alert severity="error">{inventoryUiText.historyPage.placeholders.loadingFailed}</Alert>
          <Button
            component={Link}
            to={`/inventory/${productId}`}
            variant="outlined"
            data-testid="inventory-history-page-load-error-back-link"
          >
            {inventoryUiText.historyPage.backToDetails}
          </Button>
        </Stack>
      </Paper>
    )
  }

  return (
    <Stack spacing={2.5} data-testid="inventory-history-page">
      <Button
        component={Link}
        to={`/inventory/${productId}`}
        variant="text"
        startIcon={<KeyboardBackspaceRoundedIcon fontSize="small" />}
        sx={{ alignSelf: 'flex-start', px: 0, textTransform: 'none' }}
        data-testid="inventory-history-page-back-link"
      >
        {state.product
          ? `${state.product.name} ${inventoryUiText.historyPage.backToDetails}`
          : inventoryUiText.historyPage.backToDetails}
      </Button>

      <Paper
        variant="outlined"
        sx={{ overflow: 'hidden', borderColor: 'divider', p: { xs: 1.5, md: 2 } }}
        data-testid="inventory-history-page-shell"
      >
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2}
          sx={{ minHeight: { xs: 'auto', md: 640 }, alignItems: 'stretch' }}
        >
          <Paper
            variant="outlined"
            sx={{
              width: { xs: '100%', md: 320 },
              p: 2,
              borderColor: 'divider',
              alignSelf: 'stretch',
            }}
            data-testid="inventory-history-page-variants-sidebar"
          >
            <Stack spacing={0.5} sx={{ mb: 1.5 }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }} data-testid="inventory-history-page-variants-title">
                {inventoryUiText.historyPage.variantsTitle}
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                data-testid="inventory-history-page-variants-subtitle"
              >
                {inventoryUiText.historyPage.variantsSubtitle}
              </Typography>
            </Stack>

            {state.variantOptions.length === 0 ? (
              <Typography color="text.secondary" data-testid="inventory-history-page-variants-empty">
                {inventoryUiText.historyPage.placeholders.noVariants}
              </Typography>
            ) : (
              <Stack spacing={1} data-testid="inventory-history-page-variants-list">
                {state.variantOptions.map((variant, index) => (
                  <Paper
                    key={variant.id}
                    variant="outlined"
                    sx={{
                      p: 1.25,
                      cursor: 'pointer',
                      borderColor:
                        variant.id === state.selectedVariantId ? 'primary.main' : 'divider',
                      backgroundColor:
                        variant.id === state.selectedVariantId ? 'action.hover' : 'transparent',
                      transition: 'border-color 120ms ease, transform 120ms ease',
                      '&:hover': {
                        borderColor: 'text.secondary',
                        transform: 'translateY(-1px)',
                      },
                    }}
                    onClick={() => state.onSelectVariant(variant.id)}
                    data-testid={`inventory-history-page-variant-item-${index}`}
                  >
                    <Stack spacing={0.5}>
                      <Typography
                        sx={{ fontWeight: 700, overflowWrap: 'anywhere' }}
                        data-testid={`inventory-history-page-variant-item-${index}-label`}
                      >
                        {variant.label}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        data-testid={`inventory-history-page-variant-item-${index}-meta`}
                      >
                        {variant.meta}
                      </Typography>
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            )}
          </Paper>

          <Paper
            variant="outlined"
            sx={{ flex: 1, borderColor: 'divider', overflow: 'hidden' }}
            data-testid="inventory-history-page-main"
          >
            <Stack spacing={0}>
              <Stack
                direction={{ xs: 'column', md: 'row' }}
                spacing={1.5}
                justifyContent="space-between"
                alignItems={{ xs: 'stretch', md: 'center' }}
                sx={{
                  px: { xs: 2, md: 2.5 },
                  py: { xs: 2, md: 2.5 },
                  borderBottom: 1,
                  borderColor: 'divider',
                }}
                data-testid="inventory-history-page-header"
              >
                <Stack spacing={0.5}>
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                    <Typography
                      variant="h4"
                      sx={{ fontWeight: 700 }}
                      data-testid="inventory-history-page-title"
                    >
                      {inventoryUiText.historyPage.title}
                    </Typography>
                    <Chip
                      size="small"
                      variant="outlined"
                      label={state.product?.name ?? '-'}
                      data-testid="inventory-history-page-product-chip"
                    />
                  </Stack>
                  <Typography
                    color="text.secondary"
                    data-testid="inventory-history-page-meta"
                  >
                    <Stack
                      component="span"
                      direction={{ xs: 'column', sm: 'row' }}
                      spacing={{ xs: 0.25, sm: 1 }}
                      useFlexGap
                    >
                      <Box component="span">{state.product?.manufacturer ?? '-'}</Box>
                      <Box component="span">{state.product?.categoryPath || '-'}</Box>
                      <Box component="span">{inventoryUiText.historyPage.metaTrailing}</Box>
                    </Stack>
                  </Typography>
                </Stack>
                <Button
                  variant="outlined"
                  startIcon={<FilterAltOutlinedIcon />}
                  onClick={() => state.setFiltersOpen(true)}
                  data-testid="inventory-history-page-filter-button"
                >
                  Filter
                </Button>
              </Stack>

              {hasActiveChips ? (
                <Box
                  sx={{
                    px: { xs: 2, md: 2.5 },
                    py: { xs: 1.5, md: 2 },
                    borderBottom: 1,
                    borderColor: 'divider',
                  }}
                  data-testid="inventory-history-page-filters-block"
                >
                  <InventoryHistoryFilterChips
                    selectedVariantLabel={state.selectedVariantLabel}
                    variantPrefix={inventoryUiText.historyPage.chips.variantPrefix}
                    isAllVariantsSelected={state.isAllVariantsSelected}
                    typeFilters={state.type}
                    typePrefix={inventoryUiText.historyPage.chips.typePrefix}
                    orderId={state.orderId}
                    orderIdPrefix={inventoryUiText.historyPage.chips.orderIdPrefix}
                    fromDate={state.fromDate}
                    fromDatePrefix={inventoryUiText.historyPage.chips.fromDatePrefix}
                    toDate={state.toDate}
                    toDatePrefix={inventoryUiText.historyPage.chips.toDatePrefix}
                    sortLabel={state.sortLabel}
                    sortPrefix={inventoryUiText.historyPage.chips.sortPrefix}
                    onResetVariant={state.onResetVariant}
                    onRemoveType={state.onRemoveType}
                    onRemoveOrderId={state.onRemoveOrderId}
                    onRemoveFromDate={state.onRemoveFromDate}
                    onRemoveToDate={state.onRemoveToDate}
                    onRemoveSort={state.onResetSort}
                  />
                </Box>
              ) : null}

              <Box
                sx={{ px: { xs: 2, md: 2.5 }, py: { xs: 2, md: 2.5 } }}
                data-testid="inventory-history-page-results-block"
              >
                <Stack spacing={2}>
                  <DataTable
                    rows={state.rows}
                    columns={columns}
                    sortField={state.sortField}
                    sortOrder={state.sortOrder}
                    onSort={state.onSort}
                    isLoading={state.isPageLoading || state.isTableLoading}
                    emptyText={emptyText}
                  />

                  {!state.isPageLoading ? (
                    <PaginationControls
                      total={state.total}
                      page={state.page}
                      limit={state.limit}
                      isLoading={state.isTableLoading}
                      onPageChange={state.onPageChange}
                      onLimitChange={state.onLimitChange}
                    />
                  ) : null}
                </Stack>
              </Box>
            </Stack>
          </Paper>
        </Stack>
      </Paper>

      <InventoryHistoryFiltersDialog
        open={state.filtersOpen}
        title={inventoryUiText.historyPage.filtersTitle}
        typeTitle={inventoryUiText.historyPage.filterSections.type}
        sortTitle={inventoryUiText.historyPage.filterSections.sortOrder}
        orderIdLabel={inventoryUiText.historyPage.orderIdLabel}
        dateFromLabel={inventoryUiText.historyPage.dateFromLabel}
        dateToLabel={inventoryUiText.historyPage.dateToLabel}
        sortNewestLabel={inventoryUiText.historyPage.sortOrder.newestFirst}
        sortOldestLabel={inventoryUiText.historyPage.sortOrder.oldestFirst}
        typeValues={state.typeOptions}
        selectedType={state.type}
        selectedOrderId={state.orderId}
        selectedFromDate={state.fromDate}
        selectedToDate={state.toDate}
        selectedSortOrder={state.sortOrder}
        onClose={() => state.setFiltersOpen(false)}
        onApply={state.applyFilters}
      />
    </Stack>
  )
}
