export const categoriesQueryKeys = {
  all: ['categories'] as const,
  workspace: () => [...categoriesQueryKeys.all, 'workspace'] as const,
  tree: () => [...categoriesQueryKeys.all, 'tree'] as const,
  flat: () => [...categoriesQueryKeys.all, 'flat'] as const,
}
