import { Paper, Skeleton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TableSortLabel } from '@mui/material'

export type DataTableColumn<Row> = {
  key: keyof Row | string
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
  emptyText?: string
}

export function DataTable<Row>({
  rows,
  columns,
  sortField,
  sortOrder,
  onSort,
  isLoading = false,
  loadingRowCount = 8,
  emptyText = 'No records created yet',
}: Props<Row>) {
  const isActionsColumn = (column: DataTableColumn<Row>) => String(column.key) === 'actions'
  const resolveBodyAlign = (column: DataTableColumn<Row>) => column.align ?? (isActionsColumn(column) ? 'right' : 'left')
  const resolveHeadAlign = (column: DataTableColumn<Row>) => (isActionsColumn(column) ? 'center' : (column.align ?? 'left'))
  const resolveWidth = (column: DataTableColumn<Row>) => column.width ?? (isActionsColumn(column) ? 150 : undefined)

  const getCellSx = (column: DataTableColumn<Row>, forHead = false) => ({
    width: resolveWidth(column),
    minWidth: column.minWidth,
    ...(isActionsColumn(column)
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
    <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
      <Table size="small" sx={{ tableLayout: 'fixed', minWidth: 980 }}>
        <colgroup>
          {columns.map((column) => (
            <col key={String(column.key)} style={{ width: resolveWidth(column), minWidth: column.minWidth }} />
          ))}
        </colgroup>
        <TableHead>
          <TableRow>
            {columns.map((column) => (
              <TableCell
                key={String(column.key)}
                align={resolveHeadAlign(column)}
                sx={{ ...getCellSx(column, true), fontWeight: 700 }}
              >
                {column.sortable ? (
                  <TableSortLabel
                    active={sortField === column.key}
                    direction={sortField === column.key ? sortOrder : 'asc'}
                    onClick={() => onSort(String(column.key))}
                    sx={{ fontWeight: 700 }}
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
        <TableBody>
          {isLoading ? (
            Array.from({ length: loadingRowCount }).map((_, rowIndex) => (
              <TableRow key={`skeleton-${rowIndex}`}>
                {columns.map((column) => (
                  <TableCell key={`${String(column.key)}-${rowIndex}`} align={resolveBodyAlign(column)} sx={getCellSx(column)}>
                    <Skeleton variant="text" width={isActionsColumn(column) ? 96 : '80%'} height={22} />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length}>{emptyText}</TableCell>
            </TableRow>
          ) : (
            rows.map((row, index) => (
              <TableRow key={index}>
                {columns.map((column) => (
                  <TableCell key={String(column.key)} align={resolveBodyAlign(column)} sx={getCellSx(column)}>
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
