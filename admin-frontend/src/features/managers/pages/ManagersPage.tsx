import { Button, Paper, Stack, TextField, Typography } from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import { Link } from 'react-router-dom'
import { DataTable } from '@/components/shared/DataTable'
import { FilterChips } from '@/components/shared/FilterChips'
import { PaginationControls } from '@/components/shared/PaginationControls'
import { sharedUiText } from '@/components/shared/shared.ui-text'
import { useAuth } from '@/features/auth/useAuth'
import { getManagersTableColumns } from '@/features/managers/config/managersTableColumns'
import { useManagersPageState } from '@/features/managers/hooks/useManagersPageState'
import { managersUiText } from '@/features/managers/managers.ui-text'

const EMPTY_FILTERS: string[] = []

export function ManagersPage() {
  const state = useManagersPageState()
  const { user } = useAuth()
  const isAdmin = Boolean(user?.roles.includes('ADMIN'))
  const hasActiveCriteria = Boolean(state.search)
  const emptyText = hasActiveCriteria
    ? sharedUiText.table.emptyFiltered
    : managersUiText.listPage.emptyStateNoManagers

  const columns = getManagersTableColumns({
    onView: (manager) => state.goToManagerDetails(manager._id),
  })

  return (
    <Stack spacing={2.5} data-testid="managers-list-page">
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={1.5}
        justifyContent="space-between"
        alignItems={{ xs: 'stretch', md: 'center' }}
        data-testid="managers-list-page-header"
      >
        <Typography variant="h4" sx={{ fontWeight: 700 }} data-testid="managers-list-page-title">
          {managersUiText.listPage.title}
        </Typography>
        {isAdmin ? (
          <Button component={Link} to="/managers/add" variant="contained" data-testid="managers-list-add-button">
            {managersUiText.listPage.addButton}
          </Button>
        ) : null}
      </Stack>

      <Paper sx={{ p: 2 }} data-testid="managers-list-page-content">
        <Stack spacing={2} data-testid="managers-list-page-controls">
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={1.5}
            alignItems={{ xs: 'stretch', md: 'center' }}
            data-testid="managers-list-search-toolbar"
          >
            <TextField
              size="small"
              placeholder="Type a value..."
              value={state.searchDraft}
              onChange={(event) => state.setSearchDraft(event.target.value)}
              sx={{ minWidth: { xs: '100%', md: 320 } }}
              data-testid="managers-list-search-input"
              inputProps={{ 'data-testid': 'managers-list-search-input-field' }}
            />
            <Button
              variant="contained"
              startIcon={<SearchIcon />}
              disabled={!state.searchDraft.trim() || state.isTableUpdating}
              onClick={state.onSearchApply}
              data-testid="managers-list-search-button"
            >
              Search
            </Button>
          </Stack>

          <FilterChips
            search={state.search}
            filters={EMPTY_FILTERS}
            onRemoveSearch={state.onRemoveSearch}
            onRemoveFilter={() => undefined}
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
    </Stack>
  )
}


