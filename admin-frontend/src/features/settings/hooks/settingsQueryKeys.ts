const SETTINGS_QUERY_KEY_BASE = ['settings'] as const

export const settingsQueryKeys = {
  all: SETTINGS_QUERY_KEY_BASE,
  current: () => [...SETTINGS_QUERY_KEY_BASE, 'current'] as const,
}
