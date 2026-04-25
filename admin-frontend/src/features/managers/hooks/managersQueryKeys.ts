const MANAGERS_QUERY_KEY_BASE = ['managers'] as const

export const managersQueryKeys = {
  all: MANAGERS_QUERY_KEY_BASE,
  lists: () => [...MANAGERS_QUERY_KEY_BASE, 'lists'] as const,
  list: () => [...managersQueryKeys.lists(), 'all'] as const,
  details: () => [...MANAGERS_QUERY_KEY_BASE, 'details'] as const,
  detail: (managerId: string) => [...managersQueryKeys.details(), managerId] as const,
}
