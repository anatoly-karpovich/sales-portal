import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createCategoryNode,
  deleteCategoryNode,
  getCategoriesWorkspace,
  moveCategoryNode,
  patchCategoryNode,
  type CategoriesWorkspacePayload,
  type CreateCategoryNodePayload,
  type MoveCategoryNodePayload,
  type PatchCategoryNodePayload,
} from '@/api/modules/categories.api'
import { categoriesQueryKeys } from '@/features/categories/hooks/categoriesQueryKeys'

export function useCategoriesWorkspaceQuery() {
  return useQuery({
    queryKey: categoriesQueryKeys.workspace(),
    queryFn: getCategoriesWorkspace,
    placeholderData: (previousData): CategoriesWorkspacePayload | undefined => previousData,
  })
}

export function useCreateCategoryNodeMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateCategoryNodePayload) => createCategoryNode(payload),
    retry: false,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: categoriesQueryKeys.all })
    },
  })
}

export function usePatchCategoryNodeMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      categoryId,
      payload,
    }: {
      categoryId: string
      payload: PatchCategoryNodePayload
    }) => patchCategoryNode(categoryId, payload),
    retry: false,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: categoriesQueryKeys.all })
    },
  })
}

export function useMoveCategoryNodeMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      categoryId,
      payload,
    }: {
      categoryId: string
      payload: MoveCategoryNodePayload
    }) => moveCategoryNode(categoryId, payload),
    retry: false,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: categoriesQueryKeys.all })
    },
  })
}

export function useDeleteCategoryNodeMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (categoryId: string) => deleteCategoryNode(categoryId),
    retry: false,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: categoriesQueryKeys.all })
    },
  })
}
