import { Box, Button, CircularProgress, Stack, TextField } from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import FilterAltOutlinedIcon from '@mui/icons-material/FilterAltOutlined'
import DownloadIcon from '@mui/icons-material/Download'

type Props = {
  searchDraft: string
  hasActiveSearch?: boolean
  onSearchDraftChange: (value: string) => void
  onSearchApply: () => void
  onOpenFilters: () => void
  onOpenExport: () => void
  isSearching?: boolean
  disableFilterButton?: boolean
}

export function SearchToolbar({
  searchDraft,
  onSearchDraftChange,
  onSearchApply,
  onOpenFilters,
  onOpenExport,
  isSearching = false,
  disableFilterButton = false,
}: Props) {
  const canApplySearch = Boolean(searchDraft.trim())

  return (
    <Stack
      direction={{ xs: 'column', md: 'row' }}
      spacing={1.5}
      alignItems={{ xs: 'stretch', md: 'center' }}
      sx={{ pr: { md: 1.5 } }}
      data-testid="search-toolbar"
    >
      <TextField
        size="small"
        placeholder="Type a value..."
        value={searchDraft}
        onChange={(event) => onSearchDraftChange(event.target.value)}
        sx={{ minWidth: { xs: '100%', md: 320 } }}
        data-testid="search-toolbar-search-input"
        inputProps={{ 'data-testid': 'search-toolbar-search-input-field' }}
      />
      <Button
        variant="contained"
        startIcon={isSearching ? <CircularProgress size={14} color="inherit" /> : <SearchIcon />}
        disabled={!canApplySearch || isSearching}
        onClick={onSearchApply}
        data-testid="search-toolbar-search-button"
      >
        Search
      </Button>
      <Button
        variant="outlined"
        startIcon={<FilterAltOutlinedIcon />}
        onClick={onOpenFilters}
        disabled={disableFilterButton}
        data-testid="search-toolbar-filter-button"
      >
        Filter
      </Button>
      <Box sx={{ flexGrow: 1 }} />
      <Button variant="contained" startIcon={<DownloadIcon />} onClick={onOpenExport} data-testid="search-toolbar-export-button">
        Export
      </Button>
    </Stack>
  )
}
