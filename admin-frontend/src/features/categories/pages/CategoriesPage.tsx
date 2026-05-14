import AddRoundedIcon from '@mui/icons-material/AddRounded'
import ArrowRightAltRoundedIcon from '@mui/icons-material/ArrowRightAltRounded'
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded'
import DragIndicatorRoundedIcon from '@mui/icons-material/DragIndicatorRounded'
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded'
import OpenWithRoundedIcon from '@mui/icons-material/OpenWithRounded'
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { useCallback, useMemo, useState, type DragEvent } from 'react'
import { useSnackbar } from 'notistack'
import type { CategoryFlatNode, CategoryNode } from '@/api/modules/categories.api'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import {
  categoriesUiText,
  getDeleteCategoryMessage,
} from '@/features/categories/categories.ui-text'
import {
  useCategoriesWorkspaceQuery,
  useCreateCategoryNodeMutation,
  useDeleteCategoryNodeMutation,
  useMoveCategoryNodeMutation,
  usePatchCategoryNodeMutation,
} from '@/features/categories/hooks/useCategoriesQuery'

type CategoryFormState = {
  name: string
  slug: string
  description: string
  imageUrl: string
}

type CategoryFormErrors = {
  name: string
  imageUrl: string
}

type MoveDialogState = {
  open: boolean
  sourceId: string | null
  targetParentId: string | null
  mode: 'picker' | 'confirm'
}

const EMPTY_FORM: CategoryFormState = {
  name: '',
  slug: '',
  description: '',
  imageUrl: '',
}
const EMPTY_TREE: CategoryNode[] = []
const EMPTY_FLAT: CategoryFlatNode[] = []

function toStableId(value: unknown): string {
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

function normalizeTreeNodes(nodes: CategoryNode[]): CategoryNode[] {
  return nodes.map((node) => ({
    ...node,
    _id: toStableId(node._id),
    children: normalizeTreeNodes(node.children ?? []),
  }))
}

function normalizeFlatNodes(nodes: CategoryFlatNode[]): CategoryFlatNode[] {
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

function isValidHttpUrl(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function normalizeOptional(value: string) {
  const normalized = value.trim()
  return normalized.length > 0 ? normalized : undefined
}

function validateCategoryForm(form: CategoryFormState): CategoryFormErrors {
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

function mapFormFromCategory(category: CategoryFlatNode): CategoryFormState {
  return {
    name: category.name,
    slug: category.slug,
    description: category.description ?? '',
    imageUrl: category.imageUrl ?? '',
  }
}

function areFormsEqual(left: CategoryFormState, right: CategoryFormState) {
  return (
    left.name.trim() === right.name.trim() &&
    left.slug.trim() === right.slug.trim() &&
    left.description.trim() === right.description.trim() &&
    left.imageUrl.trim() === right.imageUrl.trim()
  )
}

function getErrorStatus(error: unknown) {
  return (error as { response?: { status?: number } })?.response?.status
}

function getErrorMessage(error: unknown) {
  return (error as { response?: { data?: { ErrorMessage?: string } } })?.response?.data?.ErrorMessage
}

function buildPathLabel(path: CategoryFlatNode['path']) {
  return path.map((item) => item.name).join(' / ')
}

function collectTreeNodeMap(nodes: CategoryNode[]) {
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

function filterTreeBySearch(nodes: CategoryNode[], matchedNodeIds: Set<string>) {
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

type TreeNodeRowProps = {
  node: CategoryNode
  depth: number
  selectedId: string | null
  expandedIds: Set<string>
  forceExpandedIds: Set<string>
  searchActive: boolean
  dragOverId: string | null
  draggedId: string | null
  onToggleExpand: (categoryId: string) => void
  onSelect: (categoryId: string) => void
  onAddChild: (categoryId: string) => void
  onOpenMovePicker: (categoryId: string) => void
  onDragStart: (categoryId: string, event: DragEvent<HTMLDivElement>) => void
  onDragEnd: () => void
  onDragOver: (categoryId: string, event: DragEvent<HTMLDivElement>) => void
  onDrop: (categoryId: string, event: DragEvent<HTMLDivElement>) => void
}

function TreeNodeRow({
  node,
  depth,
  selectedId,
  expandedIds,
  forceExpandedIds,
  searchActive,
  dragOverId,
  draggedId,
  onToggleExpand,
  onSelect,
  onAddChild,
  onOpenMovePicker,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
}: TreeNodeRowProps) {
  const isSelected = selectedId === node._id
  const hasChildren = node.children.length > 0
  const isExpanded = searchActive ? forceExpandedIds.has(node._id) : expandedIds.has(node._id)
  const isDragOver = dragOverId === node._id
  const isDragging = draggedId === node._id

  return (
    <Box>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: '28px minmax(0, 1fr) auto auto',
          alignItems: 'center',
          gap: 0.75,
          py: 0.5,
          pr: 0.5,
          pl: `${0.5 + depth * 1.75}rem`,
          borderRadius: 1.5,
          border: '1px solid',
          borderColor: isDragOver ? 'success.main' : 'transparent',
          bgcolor: isDragOver ? 'success.main' : isSelected ? 'action.hover' : 'transparent',
          opacity: isDragging ? 0.45 : 1,
          color: isDragOver ? 'primary.contrastText' : 'text.primary',
          '&:hover': {
            bgcolor: isDragOver ? 'success.main' : 'action.hover',
          },
          '&:hover .categories-tree-row-action': {
            opacity: 1,
            transform: 'translateX(0)',
          },
          '&:hover .categories-tree-row-drag-handle': {
            opacity: 1,
          },
        }}
        draggable
        onDragStart={(event) => onDragStart(node._id, event)}
        onDragEnd={onDragEnd}
        onDragOver={(event) => onDragOver(node._id, event)}
        onDrop={(event) => onDrop(node._id, event)}
        data-testid={`categories-tree-node-${node._id}`}
      >
        <IconButton
          size="small"
          onClick={(event) => {
            event.stopPropagation()
            if (!hasChildren) return
            onToggleExpand(node._id)
          }}
          sx={{ color: 'inherit' }}
          data-testid={`categories-tree-node-toggle-${node._id}`}
        >
          {hasChildren ? (
            isExpanded ? (
              <ExpandMoreRoundedIcon fontSize="small" />
            ) : (
              <ChevronRightRoundedIcon fontSize="small" />
            )
          ) : (
            <Box
              component="span"
              sx={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                bgcolor: 'currentColor',
                display: 'inline-block',
              }}
            />
          )}
        </IconButton>

        <Stack
          direction="row"
          spacing={0.75}
          sx={{ minWidth: 0, alignItems: 'center', cursor: 'pointer' }}
          onClick={() => onSelect(node._id)}
          data-testid={`categories-tree-node-select-${node._id}`}
        >
          <DragIndicatorRoundedIcon
            fontSize="small"
            className="categories-tree-row-drag-handle"
            sx={{ opacity: isSelected ? 1 : 0, color: 'text.secondary' }}
          />
          <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
            {node.name}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
            {node.productsCount ?? 0} products
          </Typography>
        </Stack>

        <Tooltip title="Add child category">
          <span>
            <IconButton
              size="small"
              className="categories-tree-row-action"
              onClick={(event) => {
                event.stopPropagation()
                onAddChild(node._id)
              }}
              sx={{
                opacity: isSelected ? 1 : 0,
                transform: isSelected ? 'translateX(0)' : 'translateX(4px)',
                transition: 'all 150ms ease',
              }}
              data-testid={`categories-tree-node-add-child-${node._id}`}
            >
              <AddRoundedIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>

        <Tooltip title="Move category">
          <span>
            <IconButton
              size="small"
              className="categories-tree-row-action"
              onClick={(event) => {
                event.stopPropagation()
                onOpenMovePicker(node._id)
              }}
              sx={{
                opacity: isSelected ? 1 : 0,
                transform: isSelected ? 'translateX(0)' : 'translateX(4px)',
                transition: 'all 150ms ease',
              }}
              data-testid={`categories-tree-node-move-${node._id}`}
            >
              <OpenWithRoundedIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </Box>

      {hasChildren && isExpanded ? (
        <Stack spacing={0.4}>
          {node.children.map((child, childIndex) => (
            <TreeNodeRow
              key={`${toStableId(child._id)}-${depth + 1}-${childIndex}`}
              node={child}
              depth={depth + 1}
              selectedId={selectedId}
              expandedIds={expandedIds}
              forceExpandedIds={forceExpandedIds}
              searchActive={searchActive}
              dragOverId={dragOverId}
              draggedId={draggedId}
              onToggleExpand={onToggleExpand}
              onSelect={onSelect}
              onAddChild={onAddChild}
              onOpenMovePicker={onOpenMovePicker}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onDragOver={onDragOver}
              onDrop={onDrop}
            />
          ))}
        </Stack>
      ) : null}
    </Box>
  )
}

export function CategoriesPage() {
  const { enqueueSnackbar } = useSnackbar()
  const workspaceQuery = useCategoriesWorkspaceQuery()
  const createMutation = useCreateCategoryNodeMutation()
  const patchMutation = usePatchCategoryNodeMutation()
  const moveMutation = useMoveCategoryNodeMutation()
  const deleteMutation = useDeleteCategoryNodeMutation()

  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [mode, setMode] = useState<'view' | 'create'>('view')
  const [createParentId, setCreateParentId] = useState<string | null>(null)
  const [createForm, setCreateForm] = useState<CategoryFormState>(EMPTY_FORM)
  const [createSubmitAttempted, setCreateSubmitAttempted] = useState(false)
  const [editDraftByCategoryId, setEditDraftByCategoryId] = useState<
    Record<string, CategoryFormState>
  >({})
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteConflictByCategoryId, setDeleteConflictByCategoryId] = useState<
    Record<string, string>
  >({})
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const [moveDialog, setMoveDialog] = useState<MoveDialogState>({
    open: false,
    sourceId: null,
    targetParentId: null,
    mode: 'picker',
  })
  const [moveSubmitAttempted, setMoveSubmitAttempted] = useState(false)

  const treeNodes = useMemo(
    () => normalizeTreeNodes(workspaceQuery.data?.tree ?? EMPTY_TREE),
    [workspaceQuery.data?.tree],
  )
  const flatNodes = useMemo(
    () => normalizeFlatNodes(workspaceQuery.data?.flat ?? EMPTY_FLAT),
    [workspaceQuery.data?.flat],
  )
  const isLoading = workspaceQuery.isLoading
  const hasLoadError = workspaceQuery.isError

  const flatById = useMemo(
    () => new Map(flatNodes.map((item) => [item._id, item])),
    [flatNodes],
  )
  const treeById = useMemo(() => collectTreeNodeMap(treeNodes), [treeNodes])

  const searchNormalized = search.trim().toLowerCase()
  const matchingNodeIds = useMemo(() => {
    if (!searchNormalized) return new Set<string>()

    return new Set(
      flatNodes
        .filter((item) => {
          const pathLabel = buildPathLabel(item.path).toLowerCase()
          return (
            item.name.toLowerCase().includes(searchNormalized) ||
            item.slug.toLowerCase().includes(searchNormalized) ||
            pathLabel.includes(searchNormalized)
          )
        })
        .map((item) => item._id),
    )
  }, [flatNodes, searchNormalized])

  const filteredTree = useMemo(() => {
    if (!searchNormalized) {
      return {
        tree: treeNodes,
        expandedIds: new Set<string>(),
      }
    }
    return filterTreeBySearch(treeNodes, matchingNodeIds)
  }, [matchingNodeIds, searchNormalized, treeNodes])

  const displayTree = filteredTree.tree

  const effectiveSelectedId =
    selectedId && flatById.has(selectedId) ? selectedId : flatNodes[0]?._id ?? null
  const selectedCategory = effectiveSelectedId ? flatById.get(effectiveSelectedId) ?? null : null
  const selectedTreeCategory = effectiveSelectedId
    ? treeById.get(effectiveSelectedId) ?? null
    : null
  const selectedChildren = selectedTreeCategory?.children ?? []
  const selectedProductsCount = selectedTreeCategory?.productsCount ?? 0
  const selectedPath = selectedCategory?.path ?? []
  const selectedPathLabel = selectedCategory ? buildPathLabel(selectedCategory.path) : ''
  const selectedParentLabel =
    selectedPath.length > 1 ? buildPathLabel(selectedPath.slice(0, -1)) : categoriesUiText.details.parentRootLabel

  const editForm = selectedCategory
    ? editDraftByCategoryId[selectedCategory._id] ?? mapFormFromCategory(selectedCategory)
    : EMPTY_FORM

  const editErrors = validateCategoryForm(editForm)
  const createErrors = validateCategoryForm(createForm)
  const shouldShowCreateNameError = createSubmitAttempted && Boolean(createErrors.name)
  const shouldShowCreateImageError = createSubmitAttempted && Boolean(createErrors.imageUrl)

  const hasEditChanges = selectedCategory
    ? !areFormsEqual(editForm, mapFormFromCategory(selectedCategory))
    : false
  const canSaveEdit =
    Boolean(selectedCategory) &&
    hasEditChanges &&
    !editErrors.name &&
    !editErrors.imageUrl &&
    !patchMutation.isPending

  const canCreate =
    !createErrors.name && !createErrors.imageUrl && !createMutation.isPending && Boolean(createForm.name.trim())

  const deleteBlockedReason = selectedCategory
    ? selectedChildren.length > 0
      ? categoriesUiText.details.danger.deleteBlockedChildren
      : deleteConflictByCategoryId[selectedCategory._id] ??
        ''
    : ''
  const canDelete = Boolean(selectedCategory) && deleteBlockedReason.length === 0
  const deleteDisabledTooltip =
    'Category can be deleted only if it has no child categories and no assigned products.'

  const moveSourceCategory =
    moveDialog.sourceId ? flatById.get(moveDialog.sourceId) ?? null : null
  const moveTargetCategory =
    moveDialog.targetParentId ? flatById.get(moveDialog.targetParentId) ?? null : null

  const isInvalidMoveTarget = useCallback(
    (sourceCategoryId: string, targetCategoryId: string) => {
      if (sourceCategoryId === targetCategoryId) return true
      const target = flatById.get(targetCategoryId)
      if (!target) return true
      return target.path.some((item) => item._id === sourceCategoryId)
    },
    [flatById],
  )

  const moveTargetOptions = useMemo(() => {
    if (!moveDialog.sourceId) return []
    return flatNodes.filter((item) => !isInvalidMoveTarget(moveDialog.sourceId, item._id))
  }, [flatNodes, isInvalidMoveTarget, moveDialog.sourceId])

  const effectiveExpandedIds = useMemo(() => {
    if (expandedIds.size > 0) return expandedIds
    return new Set(treeNodes.map((item) => item._id))
  }, [expandedIds, treeNodes])

  const moveTargetSelectionError =
    moveSubmitAttempted && moveDialog.mode === 'picker' && !moveDialog.targetParentId
      ? categoriesUiText.dialogs.moveTargetRequired
      : ''

  const refreshQueries = async () => {
    try {
      const result = await workspaceQuery.refetch()
      return {
        nextTree: normalizeTreeNodes(result.data?.tree ?? EMPTY_TREE),
        nextFlat: normalizeFlatNodes(result.data?.flat ?? EMPTY_FLAT),
      }
    } catch {
      enqueueSnackbar(categoriesUiText.toasts.refreshFailed, { variant: 'error' })
      return {
        nextTree: treeNodes,
        nextFlat: flatNodes,
      }
    }
  }

  const openCreateRoot = () => {
    setMode('create')
    setCreateParentId(null)
    setCreateForm(EMPTY_FORM)
    setCreateSubmitAttempted(false)
  }

  const openCreateChild = (parentId: string) => {
    const normalizedParentId = toStableId(parentId)
    setSelectedId(normalizedParentId)
    setMode('create')
    setCreateParentId(normalizedParentId)
    setCreateForm(EMPTY_FORM)
    setCreateSubmitAttempted(false)
  }

  const closeCreateMode = () => {
    setMode('view')
    setCreateParentId(null)
    setCreateForm(EMPTY_FORM)
    setCreateSubmitAttempted(false)
  }

  const handleCreateSubmit = async () => {
    setCreateSubmitAttempted(true)
    if (!canCreate) return

    try {
      const createdCategory = await createMutation.mutateAsync({
        name: createForm.name.trim(),
        slug: normalizeOptional(createForm.slug),
        description: normalizeOptional(createForm.description),
        imageUrl: normalizeOptional(createForm.imageUrl),
        parentId: createParentId ?? undefined,
      })
      await refreshQueries()
      setSelectedId(toStableId(createdCategory._id))
      setMode('view')
      enqueueSnackbar(categoriesUiText.toasts.createSuccess, { variant: 'success' })
    } catch (error) {
      enqueueSnackbar(getErrorMessage(error) ?? categoriesUiText.errors.actionFailed, {
        variant: 'error',
      })
    }
  }

  const handleEditSave = async () => {
    if (!selectedCategory || !canSaveEdit) return

    try {
      await patchMutation.mutateAsync({
        categoryId: selectedCategory._id,
        payload: {
          name: editForm.name.trim(),
          slug: normalizeOptional(editForm.slug),
          description: normalizeOptional(editForm.description),
          imageUrl: normalizeOptional(editForm.imageUrl),
        },
      })
      await refreshQueries()
      setEditDraftByCategoryId((previous) => {
        const next = { ...previous }
        delete next[selectedCategory._id]
        return next
      })
      enqueueSnackbar(categoriesUiText.toasts.updateSuccess, { variant: 'success' })
    } catch (error) {
      enqueueSnackbar(getErrorMessage(error) ?? categoriesUiText.errors.actionFailed, {
        variant: 'error',
      })
    }
  }

  const handleEditCancel = () => {
    if (!selectedCategory) return
    setEditDraftByCategoryId((previous) => {
      const next = { ...previous }
      delete next[selectedCategory._id]
      return next
    })
  }

  const openMovePicker = (sourceId: string) => {
    setMoveDialog({
      open: true,
      sourceId,
      targetParentId: null,
      mode: 'picker',
    })
    setMoveSubmitAttempted(false)
  }

  const openMoveConfirmFromDrop = (sourceId: string, targetParentId: string) => {
    setMoveDialog({
      open: true,
      sourceId,
      targetParentId,
      mode: 'confirm',
    })
    setMoveSubmitAttempted(false)
  }

  const closeMoveDialog = () => {
    setMoveDialog({
      open: false,
      sourceId: null,
      targetParentId: null,
      mode: 'picker',
    })
    setMoveSubmitAttempted(false)
  }

  const handleMoveConfirm = async () => {
    if (!moveDialog.sourceId) return

    setMoveSubmitAttempted(true)

    if (!moveDialog.targetParentId) return

    try {
      await moveMutation.mutateAsync({
        categoryId: moveDialog.sourceId,
        payload: {
          targetParentId: moveDialog.targetParentId,
        },
      })
      await refreshQueries()
      setSelectedId(toStableId(moveDialog.sourceId))
      closeMoveDialog()
      enqueueSnackbar(categoriesUiText.toasts.moveSuccess, { variant: 'success' })
    } catch (error) {
      enqueueSnackbar(getErrorMessage(error) ?? categoriesUiText.errors.actionFailed, {
        variant: 'error',
      })
    }
  }

  const handleDeleteConfirm = async () => {
    if (!selectedCategory || !canDelete) return

    const parentId = selectedCategory.parentId
    const deletedCategoryId = selectedCategory._id

    try {
      await deleteMutation.mutateAsync(selectedCategory._id)
      const { nextFlat } = await refreshQueries()
      const nextSelectedId =
        (parentId && nextFlat.some((item) => item._id === parentId) ? parentId : nextFlat[0]?._id) ??
        null
      setSelectedId(nextSelectedId)
      setEditDraftByCategoryId((previous) => {
        const next = { ...previous }
        delete next[deletedCategoryId]
        return next
      })
      setDeleteDialogOpen(false)
      enqueueSnackbar(categoriesUiText.toasts.deleteSuccess, { variant: 'success' })
    } catch (error) {
      const status = getErrorStatus(error)
      const message = getErrorMessage(error)
      if (status === 409 && deletedCategoryId) {
        setDeleteConflictByCategoryId((previous) => ({
          ...previous,
          [deletedCategoryId]: categoriesUiText.details.danger.deleteBlockedProducts,
        }))
      }
      enqueueSnackbar(message ?? categoriesUiText.errors.actionFailed, {
        variant: 'error',
      })
    }
  }

  const handleToggleExpand = (categoryId: string) => {
    setExpandedIds((previous) => {
      const next =
        previous.size > 0 ? new Set(previous) : new Set(treeNodes.map((item) => item._id))
      if (next.has(categoryId)) {
        next.delete(categoryId)
      } else {
        next.add(categoryId)
      }
      return next
    })
  }

  const handleDragStart = (categoryId: string, event: DragEvent<HTMLDivElement>) => {
    setDraggedId(categoryId)
    event.dataTransfer.effectAllowed = 'move'
  }

  const handleDragEnd = () => {
    setDraggedId(null)
    setDragOverId(null)
  }

  const handleDragOver = (targetCategoryId: string, event: DragEvent<HTMLDivElement>) => {
    if (!draggedId || isInvalidMoveTarget(draggedId, targetCategoryId)) {
      return
    }
    event.preventDefault()
    setDragOverId(targetCategoryId)
  }

  const handleDrop = (targetCategoryId: string, event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()

    if (!draggedId || isInvalidMoveTarget(draggedId, targetCategoryId)) {
      setDraggedId(null)
      setDragOverId(null)
      return
    }

    setDragOverId(null)
    setDraggedId(null)
    openMoveConfirmFromDrop(draggedId, targetCategoryId)
  }

  const renderDetailsContent = () => {
    if (mode === 'create') {
      const createParentCategory = createParentId ? flatById.get(createParentId) ?? null : null
      const parentLabel = createParentCategory
        ? buildPathLabel(createParentCategory.path)
        : categoriesUiText.details.parentRootLabel
      const createTitle = createParentCategory
        ? categoriesUiText.details.sections.createChild
        : categoriesUiText.details.sections.createRoot

      return (
        <Stack spacing={2} data-testid="categories-page-create-mode">
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Stack spacing={2}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {createTitle}
              </Typography>

              <Box
                sx={{
                  display: 'grid',
                  gap: 2,
                  gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                }}
              >
                <TextField
                  label={categoriesUiText.details.fields.name}
                  value={createForm.name}
                  onChange={(event) =>
                    setCreateForm((previous) => ({
                      ...previous,
                      name: event.target.value,
                    }))
                  }
                  error={shouldShowCreateNameError}
                  helperText={shouldShowCreateNameError ? createErrors.name : ' '}
                  data-testid="categories-page-create-name-input"
                  inputProps={{ 'data-testid': 'categories-page-create-name-input-field' }}
                />
                <TextField
                  label={categoriesUiText.details.fields.slug}
                  value={createForm.slug}
                  onChange={(event) =>
                    setCreateForm((previous) => ({
                      ...previous,
                      slug: event.target.value,
                    }))
                  }
                  helperText=" "
                  data-testid="categories-page-create-slug-input"
                  inputProps={{ 'data-testid': 'categories-page-create-slug-input-field' }}
                />
                <TextField
                  label={categoriesUiText.details.fields.parent}
                  value={parentLabel}
                  disabled
                  sx={{ gridColumn: '1 / -1' }}
                  data-testid="categories-page-create-parent-input"
                  inputProps={{ 'data-testid': 'categories-page-create-parent-input-field' }}
                />
                <TextField
                  label={categoriesUiText.details.fields.description}
                  value={createForm.description}
                  onChange={(event) =>
                    setCreateForm((previous) => ({
                      ...previous,
                      description: event.target.value,
                    }))
                  }
                  multiline
                  minRows={3}
                  sx={{ gridColumn: '1 / -1' }}
                  data-testid="categories-page-create-description-input"
                  inputProps={{
                    'data-testid': 'categories-page-create-description-input-field',
                  }}
                />
                <TextField
                  label={categoriesUiText.details.fields.imageUrl}
                  value={createForm.imageUrl}
                  onChange={(event) =>
                    setCreateForm((previous) => ({
                      ...previous,
                      imageUrl: event.target.value,
                    }))
                  }
                  error={shouldShowCreateImageError}
                  helperText={shouldShowCreateImageError ? createErrors.imageUrl : ' '}
                  sx={{ gridColumn: '1 / -1' }}
                  data-testid="categories-page-create-image-url-input"
                  inputProps={{
                    'data-testid': 'categories-page-create-image-url-input-field',
                  }}
                />
              </Box>

              <Stack direction="row" spacing={1}>
                <Button
                  variant="contained"
                  onClick={() => void handleCreateSubmit()}
                  disabled={!canCreate}
                  data-testid="categories-page-create-submit-button"
                >
                  {createMutation.isPending ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : (
                    categoriesUiText.details.create.submit
                  )}
                </Button>
                <Button
                  onClick={closeCreateMode}
                  disabled={createMutation.isPending}
                  data-testid="categories-page-create-cancel-button"
                >
                  {categoriesUiText.details.create.cancel}
                </Button>
              </Stack>
            </Stack>
          </Paper>
        </Stack>
      )
    }

    if (!selectedCategory) {
      return (
        <Paper variant="outlined" sx={{ p: 3 }} data-testid="categories-page-empty-selection">
          <Stack spacing={1}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {categoriesUiText.details.placeholderTitle}
            </Typography>
            <Typography color="text.secondary">
              {categoriesUiText.details.placeholderText}
            </Typography>
          </Stack>
        </Paper>
      )
    }

    return (
      <Stack spacing={2} data-testid="categories-page-view-mode">
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack spacing={2}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {categoriesUiText.details.sections.generalInfo}
            </Typography>

            <Box
              sx={{
                display: 'grid',
                gap: 2,
                gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
              }}
            >
              <TextField
                label={categoriesUiText.details.fields.name}
                value={editForm.name}
                onChange={(event) =>
                  setEditDraftByCategoryId((previous) => ({
                    ...previous,
                    [selectedCategory._id]: {
                      ...editForm,
                      name: event.target.value,
                    },
                  }))
                }
                error={Boolean(editErrors.name)}
                helperText={editErrors.name || ' '}
                data-testid="categories-page-edit-name-input"
                inputProps={{ 'data-testid': 'categories-page-edit-name-input-field' }}
              />
              <TextField
                label={categoriesUiText.details.fields.slug}
                value={editForm.slug}
                onChange={(event) =>
                  setEditDraftByCategoryId((previous) => ({
                    ...previous,
                    [selectedCategory._id]: {
                      ...editForm,
                      slug: event.target.value,
                    },
                  }))
                }
                helperText=" "
                data-testid="categories-page-edit-slug-input"
                inputProps={{ 'data-testid': 'categories-page-edit-slug-input-field' }}
              />
              <TextField
                label={categoriesUiText.details.fields.parentPath}
                value={selectedParentLabel}
                disabled
                sx={{ gridColumn: '1 / -1' }}
                data-testid="categories-page-edit-parent-path-input"
                inputProps={{
                  'data-testid': 'categories-page-edit-parent-path-input-field',
                }}
              />
              <TextField
                label={categoriesUiText.details.fields.description}
                value={editForm.description}
                onChange={(event) =>
                  setEditDraftByCategoryId((previous) => ({
                    ...previous,
                    [selectedCategory._id]: {
                      ...editForm,
                      description: event.target.value,
                    },
                  }))
                }
                multiline
                minRows={3}
                sx={{ gridColumn: '1 / -1' }}
                data-testid="categories-page-edit-description-input"
                inputProps={{
                  'data-testid': 'categories-page-edit-description-input-field',
                }}
              />
              <TextField
                label={categoriesUiText.details.fields.imageUrl}
                value={editForm.imageUrl}
                onChange={(event) =>
                  setEditDraftByCategoryId((previous) => ({
                    ...previous,
                    [selectedCategory._id]: {
                      ...editForm,
                      imageUrl: event.target.value,
                    },
                  }))
                }
                error={Boolean(editErrors.imageUrl)}
                helperText={editErrors.imageUrl || ' '}
                sx={{ gridColumn: '1 / -1' }}
                data-testid="categories-page-edit-image-url-input"
                inputProps={{
                  'data-testid': 'categories-page-edit-image-url-input-field',
                }}
              />
            </Box>

            <Stack direction="row" justifyContent="flex-start" spacing={1}>
              <Button
                variant="contained"
                onClick={() => void handleEditSave()}
                disabled={!canSaveEdit}
                data-testid="categories-page-edit-save-button"
              >
                {patchMutation.isPending ? (
                  <CircularProgress size={16} color="inherit" />
                ) : (
                  categoriesUiText.details.update.submit
                )}
              </Button>
              <Button
                variant="text"
                onClick={handleEditCancel}
                disabled={patchMutation.isPending || !hasEditChanges}
                data-testid="categories-page-edit-cancel-button"
              >
                {categoriesUiText.details.create.cancel}
              </Button>
            </Stack>
          </Stack>
        </Paper>

        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack spacing={1.5}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {categoriesUiText.details.sections.children}
              </Typography>
              <Button
                variant="outlined"
                onClick={() => openCreateChild(selectedCategory._id)}
                data-testid="categories-page-details-add-child-button"
              >
                {categoriesUiText.details.actions.addChild}
              </Button>
            </Stack>

            {selectedChildren.length === 0 ? (
              <Alert
                severity="info"
                sx={{ bgcolor: 'transparent' }}
                data-testid="categories-page-children-empty-state"
              >
                {categoriesUiText.details.noChildrenPrefix} {selectedCategory.name}.
              </Alert>
            ) : (
              <Box
                sx={{
                  display: 'grid',
                  gap: 1,
                  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                }}
                data-testid="categories-page-children-grid"
              >
                {selectedChildren.map((child, childIndex) => (
                  <Paper
                    key={`${toStableId(child._id)}-child-card-${childIndex}`}
                    variant="outlined"
                    sx={{
                      p: 1.25,
                      cursor: 'pointer',
                      '&:hover': {
                        borderColor: 'primary.main',
                      },
                    }}
                    onClick={() => {
                      setSelectedId(child._id)
                      setMode('view')
                    }}
                    data-testid={`categories-page-child-card-${child._id}`}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {child.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {child.productsCount ?? 0} products · {child.children.length} children
                    </Typography>
                  </Paper>
                ))}
              </Box>
            )}
          </Stack>
        </Paper>

        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack spacing={1.5}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {categoriesUiText.details.sections.usage}
            </Typography>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '170px minmax(0, 1fr)' },
                rowGap: 1,
                columnGap: 2,
              }}
            >
              <Typography fontWeight={700}>Products</Typography>
              <Typography>{selectedProductsCount} products</Typography>

              <Typography fontWeight={700}>
                {categoriesUiText.details.usage.rootCategory}
              </Typography>
              <Typography>{selectedPath[0]?.name ?? '-'}</Typography>

              <Typography fontWeight={700}>{categoriesUiText.details.usage.depth}</Typography>
              <Typography>{selectedPath.length}</Typography>

              <Typography fontWeight={700}>{categoriesUiText.details.usage.fullPath}</Typography>
              <Typography>{selectedPathLabel}</Typography>
            </Box>
          </Stack>
        </Paper>

      </Stack>
    )
  }

  return (
    <Stack spacing={2.5} data-testid="categories-page">
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={1.5}
        justifyContent="space-between"
        alignItems={{ xs: 'stretch', md: 'center' }}
        data-testid="categories-page-header"
      >
        <Stack spacing={0.5}>
          <Typography variant="h4" sx={{ fontWeight: 700 }} data-testid="categories-page-title">
            {categoriesUiText.page.title}
          </Typography>
          <Typography color="text.secondary" data-testid="categories-page-subtitle">
            {categoriesUiText.page.subtitle}
          </Typography>
        </Stack>
        <Button
          variant="contained"
          onClick={openCreateRoot}
          data-testid="categories-page-header-add-root-button"
        >
          {categoriesUiText.page.addRootButton}
        </Button>
      </Stack>

      {isLoading ? (
        <Paper variant="outlined" sx={{ p: 3 }} data-testid="categories-page-loading">
          <Stack direction="row" spacing={1.25} alignItems="center">
            <CircularProgress size={18} />
            <Typography>Loading categories...</Typography>
          </Stack>
        </Paper>
      ) : null}

      {hasLoadError ? (
        <Alert severity="error" data-testid="categories-page-load-error">
          {categoriesUiText.errors.loadTreeFailed}
        </Alert>
      ) : null}

      {!isLoading && !hasLoadError ? (
        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: { xs: '1fr', lg: 'minmax(360px, 460px) minmax(0, 1fr)' },
            alignItems: 'start',
          }}
          data-testid="categories-page-workspace"
        >
          <Paper variant="outlined" sx={{ overflow: 'hidden' }} data-testid="categories-page-tree-panel">
            <Stack spacing={1.5} sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  {categoriesUiText.tree.title}
                </Typography>
                <Chip
                  label={`${flatNodes.length} nodes`}
                  size="small"
                  data-testid="categories-page-node-count-chip"
                />
              </Stack>
              <TextField
                placeholder={categoriesUiText.tree.searchPlaceholder}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                data-testid="categories-page-tree-search-input"
                inputProps={{ 'data-testid': 'categories-page-tree-search-input-field' }}
              />
            </Stack>

            <Stack spacing={1} sx={{ p: 1.5, maxHeight: { xs: 420, lg: 'calc(100vh - 290px)' }, overflowY: 'auto' }}>
              {displayTree.length === 0 ? (
                <Alert severity="info" data-testid="categories-page-tree-empty-state">
                  {categoriesUiText.tree.empty}
                </Alert>
              ) : (
                <Stack spacing={0.4} data-testid="categories-page-tree-list">
                  {displayTree.map((node) => (
                    <TreeNodeRow
                      key={`${toStableId(node._id)}-root`}
                      node={node}
                      depth={0}
                      selectedId={effectiveSelectedId}
                      expandedIds={effectiveExpandedIds}
                      forceExpandedIds={filteredTree.expandedIds}
                      searchActive={Boolean(searchNormalized)}
                      dragOverId={dragOverId}
                      draggedId={draggedId}
                      onToggleExpand={handleToggleExpand}
                      onSelect={(categoryId) => {
                        setSelectedId(categoryId)
                        setMode('view')
                      }}
                      onAddChild={openCreateChild}
                      onOpenMovePicker={openMovePicker}
                      onDragStart={handleDragStart}
                      onDragEnd={handleDragEnd}
                      onDragOver={handleDragOver}
                      onDrop={handleDrop}
                    />
                  ))}
                </Stack>
              )}

              <Button
                variant="outlined"
                onClick={openCreateRoot}
                data-testid="categories-page-tree-add-root-button"
              >
                {categoriesUiText.tree.addRootInlineButton}
              </Button>
            </Stack>
          </Paper>

          <Paper variant="outlined" sx={{ p: 2 }} data-testid="categories-page-details-panel">
            <Stack spacing={2}>
              {selectedCategory && mode === 'view' ? (
                <Stack
                  direction={{ xs: 'column', md: 'row' }}
                  justifyContent="space-between"
                  alignItems={{ xs: 'stretch', md: 'flex-start' }}
                  spacing={1.5}
                >
                  <Stack spacing={1}>
                    <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                      {selectedPath.map((item, index) => (
                        <Stack key={`${toStableId(item._id)}-path-${index}`} direction="row" spacing={0.5} alignItems="center">
                          <Chip size="small" label={item.name} />
                          {index < selectedPath.length - 1 ? (
                            <ChevronRightRoundedIcon fontSize="small" color="disabled" />
                          ) : null}
                        </Stack>
                      ))}
                    </Stack>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="h5" sx={{ fontWeight: 700 }} data-testid="categories-page-details-title">
                        {selectedCategory.name}
                      </Typography>
                      <Chip
                        size="small"
                        label={
                          selectedChildren.length > 0
                            ? categoriesUiText.details.parentBadge
                            : categoriesUiText.details.leafBadge
                        }
                      />
                    </Stack>
                  </Stack>

                  <Stack direction="row" spacing={1}>
                    <Button
                      variant="outlined"
                      onClick={() => openMovePicker(selectedCategory._id)}
                      data-testid="categories-page-details-move-button"
                    >
                      {categoriesUiText.details.actions.move}
                    </Button>
                    <Tooltip
                      title={canDelete ? '' : deleteDisabledTooltip}
                      disableHoverListener={canDelete}
                    >
                      <span>
                        <Button
                          variant="contained"
                          color="error"
                          disabled={!canDelete}
                          onClick={() => setDeleteDialogOpen(true)}
                          data-testid="categories-page-delete-button"
                        >
                          {categoriesUiText.details.danger.deleteButton}
                        </Button>
                      </span>
                    </Tooltip>
                  </Stack>
                </Stack>
              ) : null}

              {renderDetailsContent()}
            </Stack>
          </Paper>
        </Box>
      ) : null}

      <ConfirmDialog
        open={deleteDialogOpen}
        title={categoriesUiText.dialogs.deleteTitle}
        message={selectedCategory ? `${categoriesUiText.dialogs.deleteMessage}\n\n${getDeleteCategoryMessage(selectedCategory.name)}` : categoriesUiText.dialogs.deleteMessage}
        confirmLabel={categoriesUiText.dialogs.deleteConfirm}
        cancelLabel={categoriesUiText.dialogs.cancel}
        isSubmitting={deleteMutation.isPending}
        onCancel={() => setDeleteDialogOpen(false)}
        onConfirm={handleDeleteConfirm}
      />

      <Dialog
        open={moveDialog.open}
        onClose={moveMutation.isPending ? undefined : closeMoveDialog}
        fullWidth
        maxWidth="sm"
        data-testid="categories-page-move-dialog"
      >
        <DialogTitle>{categoriesUiText.dialogs.moveTitle}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Paper variant="outlined" sx={{ p: 1.25 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                {categoriesUiText.dialogs.moveSourceLabel}
              </Typography>
              <Typography sx={{ fontWeight: 600 }}>{moveSourceCategory?.name ?? '-'}</Typography>
            </Paper>

            <Paper variant="outlined" sx={{ p: 1.25 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                {categoriesUiText.dialogs.moveFromLabel}
              </Typography>
              <Typography>{moveSourceCategory ? buildPathLabel(moveSourceCategory.path) : '-'}</Typography>
            </Paper>

            {moveDialog.mode === 'picker' ? (
              <Autocomplete
                options={moveTargetOptions}
                value={moveTargetCategory}
                getOptionLabel={(option) => buildPathLabel(option.path)}
                onChange={(_, value) => {
                  setMoveDialog((previous) => ({
                    ...previous,
                    targetParentId: value?._id ?? null,
                  }))
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label={categoriesUiText.dialogs.moveTargetLabel}
                    placeholder={categoriesUiText.dialogs.moveTargetPlaceholder}
                    error={Boolean(moveTargetSelectionError)}
                    helperText={moveTargetSelectionError || ' '}
                    data-testid="categories-page-move-target-autocomplete"
                    inputProps={{
                      ...params.inputProps,
                      'data-testid':
                        'categories-page-move-target-autocomplete-field',
                    }}
                  />
                )}
                renderOption={(props, option, state) => {
                  const { key, ...optionProps } = props
                  return (
                    <Box
                      component="li"
                      key={key}
                      {...optionProps}
                      data-testid={`categories-page-move-target-option-${state.index}`}
                    >
                      {buildPathLabel(option.path)}
                    </Box>
                  )
                }}
              />
            ) : null}

            <Paper variant="outlined" sx={{ p: 1.25 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                {categoriesUiText.dialogs.moveToLabel}
              </Typography>
              <Stack direction="row" spacing={0.75} alignItems="center">
                <Typography>
                  {moveTargetCategory ? buildPathLabel(moveTargetCategory.path) : '-'}
                </Typography>
                {moveTargetCategory ? <ArrowRightAltRoundedIcon fontSize="small" /> : null}
                <Typography sx={{ fontWeight: 600 }}>{moveSourceCategory?.name ?? '-'}</Typography>
              </Stack>
            </Paper>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={closeMoveDialog}
            disabled={moveMutation.isPending}
            data-testid="categories-page-move-dialog-cancel-button"
          >
            {categoriesUiText.dialogs.cancel}
          </Button>
          <Button
            variant="contained"
            onClick={() => void handleMoveConfirm()}
            disabled={moveMutation.isPending || !moveDialog.targetParentId}
            data-testid="categories-page-move-dialog-confirm-button"
          >
            {moveMutation.isPending ? (
              <CircularProgress size={16} color="inherit" />
            ) : (
              categoriesUiText.dialogs.moveConfirm
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}
