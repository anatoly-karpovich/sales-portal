const USERS_QUERY_KEY_BASE = ['users'] as const

export const usersQueryKeys = {
  all: USERS_QUERY_KEY_BASE,
  lists: () => [...USERS_QUERY_KEY_BASE, 'lists'] as const,
  list: () => [...usersQueryKeys.lists(), 'all'] as const,
  details: () => [...USERS_QUERY_KEY_BASE, 'details'] as const,
  detail: (userId: string) => [...usersQueryKeys.details(), userId] as const,
}
