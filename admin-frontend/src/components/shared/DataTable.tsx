import {
  Alert,
  Paper,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
} from '@mui/material'
import { sharedUiText } from '@/components/shared/shared.ui-text'

export type DataTableColumnKey<Row> = Extract<keyof Row, string> | (string & {})

export type DataTableColumn<Row> = {
  key: DataTableColumnKey<Row>
  label: string
  sortable?: boolean
  width?: number | string
  minWidth?: number
  align?: 'left' | 'right' | 'center'
  stickyRight?: boolean
  render: (row: Row) => React.ReactNode
}

type Props<Row> = {
  rows: Row[]
  columns: DataTableColumn<Row>[]
  sortField: string
  sortOrder: 'asc' | 'desc'
  onSort: (field: string) => void
  isLoading?: boolean
  loadingRowCount?: number
  emptyText?: React.ReactNode
}

export function DataTable<Row>({
  rows,
  columns,
  sortField,
  sortOrder,
  onSort,
  isLoading = false,
  loadingRowCount = 8,
  emptyText = sharedUiText.table.empty,
}: Props<Row>) {
  const resolveBodyAlign = (column: DataTableColumn<Row>) => column.align ?? 'left'
  const resolveHeadAlign = (column: DataTableColumn<Row>) => column.align ?? 'left'
  const resolveWidth = (column: DataTableColumn<Row>) => column.width
  const toColumnTestId = (key: string) => key.toLowerCase().replace(/\s+/g, '-')

  const getCellSx = (column: DataTableColumn<Row>, forHead = false) => ({
    width: resolveWidth(column),
    minWidth: column.minWidth,
    ...(column.stickyRight
      ? {
          pr: 3,
          position: { xs: 'static', md: 'sticky' },
          right: { xs: 'auto', md: 0 },
          zIndex: { xs: 'auto', md: forHead ? 3 : 2 },
          backgroundColor: 'background.paper',
          boxShadow: { xs: 'none', md: '-8px 0 8px -8px rgba(0,0,0,0.35)' },
        }
      : null),
  })

  return (
    <TableContainer component={Paper} sx={{ overflowX: 'auto' }} data-testid="data-table-container">
      <Table size="small" sx={{ tableLayout: 'fixed', minWidth: 980 }} data-testid="data-table">
        <colgroup>
          {columns.map((column) => (
            <col
              key={String(column.key)}
              style={{ width: resolveWidth(column), minWidth: column.minWidth }}
            />
          ))}
        </colgroup>
        <TableHead data-testid="data-table-head">
          <TableRow data-testid="data-table-head-row">
            {columns.map((column) => (
              <TableCell
                key={String(column.key)}
                align={resolveHeadAlign(column)}
                sx={{ ...getCellSx(column, true), fontWeight: 700 }}
                data-testid={`data-table-header-${toColumnTestId(String(column.key))}`}
              >
                {column.sortable ? (
                  <TableSortLabel
                    active={sortField === column.key}
                    direction={sortField === column.key ? sortOrder : 'asc'}
                    onClick={() => onSort(String(column.key))}
                    sx={{ fontWeight: 700 }}
                    data-testid={`data-table-sort-${toColumnTestId(String(column.key))}`}
                  >
                    {column.label}
                  </TableSortLabel>
                ) : (
                  column.label
                )}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody data-testid="data-table-body">
          {isLoading ? (
            Array.from({ length: loadingRowCount }).map((_, rowIndex) => (
              <TableRow
                key={`skeleton-${rowIndex}`}
                data-testid={`data-table-loading-row-${rowIndex}`}
              >
                {columns.map((column) => (
                  <TableCell
                    key={`${String(column.key)}-${rowIndex}`}
                    align={resolveBodyAlign(column)}
                    sx={getCellSx(column)}
                    data-testid={`data-table-loading-cell-${toColumnTestId(String(column.key))}`}
                  >
                    <Skeleton variant="text" width="80%" height={22} />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : rows.length === 0 ? (
            <TableRow data-testid="data-table-empty-row">
              <TableCell colSpan={columns.length} data-testid="data-table-empty-text">
                <Alert
                  severity="info"
                  variant="outlined"
                  sx={{
                    alignSelf: 'flex-start',
                    width: 'fit-content',
                    px: 1.25,
                    py: 0.25,
                    border: 'none',
                    '& .MuiAlert-icon': {
                      py: 0,
                      my: 'auto',
                      mr: 1,
                    },
                    '& .MuiAlert-message': {
                      py: 0,
                      pr: 0.5,
                      display: 'flex',
                      alignItems: 'center',
                      minHeight: 24,
                    },
                  }}
                  data-testid="data-table-empty-alert"
                >
                  {emptyText}
                </Alert>
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row, index) => (
              <TableRow key={index} data-testid={`data-table-row-${index}`}>
                {columns.map((column) => (
                  <TableCell
                    key={String(column.key)}
                    align={resolveBodyAlign(column)}
                    sx={getCellSx(column)}
                    data-testid={`data-table-cell-${index}-${toColumnTestId(String(column.key))}`}
                  >
                    {column.render(row)}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  )
}
