import type { CategoryFlatNode, CategoryNode } from '@/api/modules/categories.api'
import { categoriesUiText } from '@/features/categories/categories.ui-text'

export type CategoryFormState = {
  name: string
  slug: string
  description: string
  imageUrl: string
}

export type CategoryFormErrors = {
  name: string
  imageUrl: string
}

export type MoveDialogState = {
  open: boolean
  sourceId: string | null
  targetParentId: string | null
  targetKind: 'unset' | 'root' | 'category'
  mode: 'picker' | 'confirm'
}

export type DetailsMode = 'view' | 'edit-general' | 'create-root' | 'create-child'

export const EMPTY_FORM: CategoryFormState = {
  name: '',
  slug: '',
  description: '',
  imageUrl: '',
}

export const EMPTY_TREE: CategoryNode[] = []
export const EMPTY_FLAT: CategoryFlatNode[] = []

export function toStableId(value: unknown): string {
  if (typeof value === 'string') return value
  if (typeof value === 'number') return String(value)
  if (value && typeof value === 'object') {
    const candidate = value as { $oid?: unknown; toString?: () => string }
    if (typeof candidate.$oid === 'string') return candidate.$oid
    if (typeof candidate.toString === 'function') {
      const asString = candidate.toString()
      if (asString && asString !== '[object Object]') return asString
    }
    try {
      const serialized = JSON.stringify(value)
      if (serialized && serialized !== '{}') return serialized
    } catch {
      return ''
    }
  }
  return ''
}

export function normalizeTreeNodes(nodes: CategoryNode[]): CategoryNode[] {
  return nodes.map((node) => ({
    ...node,
    _id: toStableId(node._id),
    children: normalizeTreeNodes(node.children ?? []),
  }))
}

export function normalizeFlatNodes(nodes: CategoryFlatNode[]): CategoryFlatNode[] {
  return nodes.map((node) => ({
    ...node,
    _id: toStableId(node._id),
    parentId: node.parentId ? toStableId(node.parentId) : undefined,
    path: (node.path ?? []).map((item) => ({
      ...item,
      _id: toStableId(item._id),
    })),
  }))
}

export function isValidHttpUrl(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

export function normalizeOptional(value: string) {
  const normalized = value.trim()
  return normalized.length > 0 ? normalized : undefined
}

export function validateCategoryForm(form: CategoryFormState): CategoryFormErrors {
  const name = form.name.trim()
  const imageUrl = form.imageUrl.trim()

  return {
    name: name.length === 0 ? categoriesUiText.validation.nameRequired : '',
    imageUrl:
      imageUrl.length > 0 && !isValidHttpUrl(imageUrl)
        ? categoriesUiText.validation.imageUrlInvalid
        : '',
  }
}

export function mapFormFromCategory(category: CategoryFlatNode): CategoryFormState {
  return {
    name: category.name,
    slug: category.slug,
    description: category.description ?? '',
    imageUrl: category.imageUrl ?? '',
  }
}

export function areFormsEqual(left: CategoryFormState, right: CategoryFormState) {
  return (
    left.name.trim() === right.name.trim() &&
    left.slug.trim() === right.slug.trim() &&
    left.description.trim() === right.description.trim() &&
    left.imageUrl.trim() === right.imageUrl.trim()
  )
}

export function getErrorStatus(error: unknown) {
  return (error as { response?: { status?: number } })?.response?.status
}

export function getErrorMessage(error: unknown) {
  return (error as { response?: { data?: { ErrorMessage?: string } } })?.response?.data?.ErrorMessage
}

export function buildPathLabel(path: CategoryFlatNode['path']) {
  return path.map((item) => item.name).join(' / ')
}

export function collectTreeNodeMap(nodes: CategoryNode[]) {
  const result = new Map<string, CategoryNode>()
  const walk = (items: CategoryNode[]) => {
    items.forEach((item) => {
      result.set(item._id, item)
      walk(item.children)
    })
  }
  walk(nodes)
  return result
}

export function filterTreeBySearch(nodes: CategoryNode[], matchedNodeIds: Set<string>) {
  const expandedIds = new Set<string>()

  const walk = (items: CategoryNode[]): CategoryNode[] => {
    return items.flatMap((item) => {
      const filteredChildren = walk(item.children)
      const isMatched = matchedNodeIds.has(item._id)

      if (!isMatched && filteredChildren.length === 0) {
        return []
      }

      if (filteredChildren.length > 0) {
        expandedIds.add(item._id)
      }

      return [{ ...item, children: filteredChildren }]
    })
  }

  return {
    tree: walk(nodes),
    expandedIds,
  }
}
