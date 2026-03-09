import { Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TableSortLabel } from '@mui/material'

export type DataTableColumn<Row> = {
  key: keyof Row | string
  label: string
  sortable?: boolean
  render: (row: Row) => React.ReactNode
}

type Props<Row> = {
  rows: Row[]
  columns: DataTableColumn<Row>[]
  sortField: string
  sortOrder: 'asc' | 'desc'
  onSort: (field: string) => void
  emptyText?: string
}

export function DataTable<Row>({
  rows,
  columns,
  sortField,
  sortOrder,
  onSort,
  emptyText = 'No records created yet',
}: Props<Row>) {
  return (
    <TableContainer component={Paper}>
      <Table size="small">
        <TableHead>
          <TableRow>
            {columns.map((column) => (
              <TableCell key={String(column.key)}>
                {column.sortable ? (
                  <TableSortLabel
                    active={sortField === column.key}
                    direction={sortField === column.key ? sortOrder : 'asc'}
                    onClick={() => onSort(String(column.key))}
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
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length}>{emptyText}</TableCell>
            </TableRow>
          ) : (
            rows.map((row, index) => (
              <TableRow key={index}>
                {columns.map((column) => (
                  <TableCell key={String(column.key)}>{column.render(row)}</TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  )
}
