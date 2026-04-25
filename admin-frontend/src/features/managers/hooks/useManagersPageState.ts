import { useCallback, useMemo, useState, useTransition } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Manager } from '@/api/modules/managers.api'
import {
  isManagersSortField,
  type ManagersSortField,
  type ManagersSortOrder,
} from '@/features/managers/config/managersTableColumns'
import { useManagersQuery } from '@/features/managers/hooks/useManagersQuery'

const EMPTY_MANAGERS: Manager[] = []

function compareManagers(left: Manager, right: Manager, field: ManagersSortField) {
  if (field === 'createdOn') {
    return new Date(left.createdOn).getTime() - new Date(right.createdOn).getTime()
  }

  if (field === 'roles') {
    const leftRoles = left.roles.join(', ').toLocaleLowerCase()
    const rightRoles = right.roles.join(', ').toLocaleLowerCase()
    return leftRoles.localeCompare(rightRoles)
  }

  const leftValue = String(left[field] ?? '').toLocaleLowerCase()
  const rightValue = String(right[field] ?? '').toLocaleLowerCase()
  return leftValue.localeCompare(rightValue)
}

export function useManagersPageState() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [searchDraft, setSearchDraft] = useState('')
  const [sortField, setSortField] = useState<ManagersSortField>('createdOn')
  const [sortOrder, setSortOrder] = useState<ManagersSortOrder>('desc')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [isTransitionPending, startTransition] = useTransition()
  const { data, isLoading, isFetching } = useManagersQuery()

  const rows = data ?? EMPTY_MANAGERS

  const filteredRows = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase()
    if (!normalizedSearch) return rows

    return rows.filter((row) => {
      const rolesValue = row.roles.join(', ').toLocaleLowerCase()
      return (
        row.username.toLocaleLowerCase().includes(normalizedSearch) ||
        row.firstName.toLocaleLowerCase().includes(normalizedSearch) ||
        row.lastName.toLocaleLowerCase().includes(normalizedSearch) ||
        rolesValue.includes(normalizedSearch)
      )
    })
  }, [rows, search])

  const sortedRows = useMemo(() => {
    const result = [...filteredRows]
    result.sort((left, right) => {
      const orderResult = compareManagers(left, right, sortField)
      return sortOrder === 'asc' ? orderResult : -orderResult
    })
    return result
  }, [filteredRows, sortField, sortOrder])

  const pageCount = Math.max(Math.ceil(sortedRows.length / limit), 1)
  const currentPage = Math.min(page, pageCount)

  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * limit
    return sortedRows.slice(start, start + limit)
  }, [currentPage, limit, sortedRows])

  const onSearchApply = useCallback(() => {
    setSearch(searchDraft.trim())
    setSearchDraft('')
    setPage(1)
  }, [searchDraft])

  const onRemoveSearch = useCallback(() => {
    setSearch('')
    setSearchDraft('')
    setPage(1)
  }, [])

  const onSort = useCallback(
    (field: string) => {
      if (!isManagersSortField(field)) return
      setPage(1)
      setSortField(field)
      setSortOrder((currentOrder) =>
        field === sortField ? (currentOrder === 'asc' ? 'desc' : 'asc') : 'asc',
      )
    },
    [sortField],
  )

  const onPageChange = useCallback(
    (value: number) => {
      startTransition(() => {
        setPage(value)
      })
    },
    [startTransition],
  )

  const onLimitChange = useCallback(
    (value: number) => {
      startTransition(() => {
        setLimit(value)
        setPage(1)
      })
    },
    [startTransition],
  )

  return {
    search,
    searchDraft,
    sortField,
    sortOrder,
    page: currentPage,
    limit,
    total: sortedRows.length,
    rows: paginatedRows,
    isLoading,
    isTableUpdating: isFetching || isTransitionPending,
    setSearchDraft,
    onSearchApply,
    onRemoveSearch,
    onSort,
    onPageChange,
    onLimitChange,
    goToManagerDetails: (managerId: string) => {
      navigate(`/managers/${managerId}`)
    },
  }
}

