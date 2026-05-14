import { apiClient } from '@/api/client'
import type { ApiRequestConfig } from '@/api/types'

export type CategoryPathItem = {
  _id: string
  name: string
  slug: string
}

export type CategoryNode = {
  _id: string
  name: string
  slug: string
  description?: string
  imageUrl?: string
  productsCount?: number
  children: CategoryNode[]
  createdOn: string
  updatedOn: string
}

export type CategoryFlatNode = {
  _id: string
  name: string
  slug: string
  description?: string
  imageUrl?: string
  parentId?: string
  path: CategoryPathItem[]
  createdOn: string
  updatedOn: string
}

export type CreateCategoryNodePayload = {
  name: string
  slug?: string
  description?: string
  imageUrl?: string
  parentId?: string
}

export type PatchCategoryNodePayload = Partial<
  Pick<CreateCategoryNodePayload, 'name' | 'slug' | 'description' | 'imageUrl'>
>

export type MoveCategoryNodePayload = {
  targetParentId: string | null
}

type CategoryTreeResponse = {
  CategoriesTree: CategoryNode[]
  IsSuccess: boolean
  ErrorMessage: string | null
}

type CategoryFlatResponse = {
  Categories: CategoryFlatNode[]
  IsSuccess: boolean
  ErrorMessage: string | null
}

type CategoryNodeResponse = {
  Category: CategoryNode
  IsSuccess: boolean
  ErrorMessage: string | null
}

type CategoryWorkspaceResponse = {
  CategoriesTree?: CategoryNode[]
  Categories?: CategoryFlatNode[]
  IsSuccess: boolean
  ErrorMessage: string | null
}

export type CategoriesWorkspacePayload = {
  tree: CategoryNode[]
  flat: CategoryFlatNode[]
}

function normalizeId(value: unknown): string {
  if (typeof value === 'string') return value
  if (typeof value === 'number') return String(value)
  if (value && typeof value === 'object') {
    const objectValue = value as { $oid?: unknown; toString?: () => string }
    if (typeof objectValue.$oid === 'string') return objectValue.$oid
    if (typeof objectValue.toString === 'function') {
      const id = objectValue.toString()
      if (id && id !== '[object Object]') return id
    }
    try {
      const serialized = JSON.stringify(value)
      if (serialized && serialized !== '{}') {
        return serialized
      }
    } catch {
      return ''
    }
  }
  return ''
}

function normalizeCategoryPathItem(item: CategoryPathItem): CategoryPathItem {
  return {
    ...item,
    _id: normalizeId(item._id),
  }
}

function normalizeCategoryNode(node: CategoryNode): CategoryNode {
  return {
    ...node,
    _id: normalizeId(node._id),
    productsCount: Number(node.productsCount ?? 0),
    children: (node.children ?? []).map(normalizeCategoryNode),
  }
}

function normalizeCategoryFlatNode(node: CategoryFlatNode): CategoryFlatNode {
  return {
    ...node,
    _id: normalizeId(node._id),
    parentId: node.parentId ? normalizeId(node.parentId) : undefined,
    path: (node.path ?? []).map(normalizeCategoryPathItem),
  }
}

const silentRequestConfig: ApiRequestConfig = {
  skipErrorToast: true,
}

export async function getCategoriesTree() {
  const response = await apiClient.get<CategoryTreeResponse>('/categories/tree')
  return (response.data.CategoriesTree ?? []).map(normalizeCategoryNode)
}

export async function getCategoriesFlat() {
  const response = await apiClient.get<CategoryFlatResponse>('/categories/flat')
  return (response.data.Categories ?? []).map(normalizeCategoryFlatNode)
}

export async function getCategoriesWorkspace(): Promise<CategoriesWorkspacePayload> {
  const response = await apiClient.get<CategoryWorkspaceResponse>('/categories')
  return {
    tree: (response.data.CategoriesTree ?? []).map(normalizeCategoryNode),
    flat: (response.data.Categories ?? []).map(normalizeCategoryFlatNode),
  }
}

export async function createCategoryNode(payload: CreateCategoryNodePayload) {
  const response = await apiClient.post<CategoryNodeResponse>(
    '/categories/nodes',
    payload,
    silentRequestConfig,
  )
  return normalizeCategoryNode(response.data.Category)
}

export async function patchCategoryNode(categoryId: string, payload: PatchCategoryNodePayload) {
  const response = await apiClient.patch<CategoryNodeResponse>(
    `/categories/nodes/${categoryId}`,
    payload,
    silentRequestConfig,
  )
  return normalizeCategoryNode(response.data.Category)
}

export async function moveCategoryNode(categoryId: string, payload: MoveCategoryNodePayload) {
  const response = await apiClient.post<CategoryNodeResponse>(
    `/categories/nodes/${categoryId}/move`,
    payload,
    silentRequestConfig,
  )
  return normalizeCategoryNode(response.data.Category)
}

export async function deleteCategoryNode(categoryId: string) {
  await apiClient.delete(`/categories/nodes/${categoryId}`, silentRequestConfig)
}
