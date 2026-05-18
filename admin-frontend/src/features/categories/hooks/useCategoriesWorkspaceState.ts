import { useCallback, useMemo, useState, type DragEvent } from 'react'
import { useSnackbar } from 'notistack'
import { useSearchParams } from 'react-router-dom'
import { categoriesUiText } from '@/features/categories/categories.ui-text'
import {
  useCategoriesWorkspaceQuery,
  useCreateCategoryNodeMutation,
  useDeleteCategoryNodeMutation,
  useMoveCategoryNodeMutation,
  usePatchCategoryNodeMutation,
} from '@/features/categories/hooks/useCategoriesQuery'
import {
  areFormsEqual,
  buildPathLabel,
  collectTreeNodeMap,
  EMPTY_FLAT,
  EMPTY_FORM,
  EMPTY_TREE,
  filterTreeBySearch,
  getErrorMessage,
  getErrorStatus,
  mapFormFromCategory,
  normalizeFlatNodes,
  normalizeOptional,
  normalizeTreeNodes,
  toStableId,
  type CategoryFormState,
  type DetailsMode,
  type MoveDialogState,
  validateCategoryForm,
} from '@/features/categories/pages/categoriesPage.utils'

const EMPTY_MOVE_DIALOG: MoveDialogState = {
  open: false,
  sourceId: null,
  targetParentId: null,
  targetKind: 'unset',
  mode: 'picker',
}

export function useCategoriesWorkspaceState() {
  const { enqueueSnackbar } = useSnackbar()
  const [searchParams, setSearchParams] = useSearchParams()
  const workspaceQuery = useCategoriesWorkspaceQuery()
  const createMutation = useCreateCategoryNodeMutation()
  const patchMutation = usePatchCategoryNodeMutation()
  const moveMutation = useMoveCategoryNodeMutation()
  const deleteMutation = useDeleteCategoryNodeMutation()

  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [mode, setMode] = useState<DetailsMode>('view')
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
  const [isRootDragOver, setIsRootDragOver] = useState(false)
  const [moveDialog, setMoveDialog] = useState<MoveDialogState>(EMPTY_MOVE_DIALOG)
  const [moveSubmitAttempted, setMoveSubmitAttempted] = useState(false)
  const [hasUserSelection, setHasUserSelection] = useState(false)

  const treeNodes = useMemo(
    () => normalizeTreeNodes(workspaceQuery.data?.tree ?? EMPTY_TREE),
    [workspaceQuery.data?.tree],
  )
  const flatNodes = useMemo(
    () => normalizeFlatNodes(workspaceQuery.data?.flat ?? EMPTY_FLAT),
    [workspaceQuery.data?.flat],
  )

  const flatById = useMemo(() => new Map(flatNodes.map((item) => [item._id, item])), [flatNodes])
  const treeById = useMemo(() => collectTreeNodeMap(treeNodes), [treeNodes])
  const querySelectedId = searchParams.get('selectedId')?.trim() ?? ''
  const selectedIdFromQuery =
    !hasUserSelection && querySelectedId && flatById.has(querySelectedId) ? querySelectedId : null

  const clearSelectedIdQuery = useCallback(() => {
    if (!searchParams.has('selectedId')) return
    const nextParams = new URLSearchParams(searchParams)
    nextParams.delete('selectedId')
    setSearchParams(nextParams, { replace: true })
  }, [searchParams, setSearchParams])

  const selectCategory = useCallback(
    (categoryId: string | null) => {
      setHasUserSelection(true)
      setSelectedId(categoryId)
      clearSelectedIdQuery()
    },
    [clearSelectedIdQuery],
  )

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
    selectedIdFromQuery ??
    (selectedId && flatById.has(selectedId) ? selectedId : (flatNodes[0]?._id ?? null))
  const selectedCategory = effectiveSelectedId ? (flatById.get(effectiveSelectedId) ?? null) : null
  const selectedTreeCategory = effectiveSelectedId
    ? (treeById.get(effectiveSelectedId) ?? null)
    : null
  const selectedChildren = selectedTreeCategory?.children ?? []
  const selectedProductsCount = selectedTreeCategory?.productsCount ?? 0
  const selectedDirectProductsCount = selectedTreeCategory?.directProductsCount ?? 0
  const selectedPath = selectedCategory?.path ?? []
  const selectedPathLabel = selectedCategory ? buildPathLabel(selectedCategory.path) : ''
  const selectedParentLabel =
    selectedPath.length > 1
      ? buildPathLabel(selectedPath.slice(0, -1))
      : categoriesUiText.details.parentRootLabel

  const editForm = selectedCategory
    ? (editDraftByCategoryId[selectedCategory._id] ?? mapFormFromCategory(selectedCategory))
    : EMPTY_FORM

  const editErrors = validateCategoryForm(editForm)
  const createErrors = validateCategoryForm(createForm)
  const shouldShowCreateNameError = createSubmitAttempted && Boolean(createErrors.name)
  const shouldShowCreateImageError = createSubmitAttempted && Boolean(createErrors.imageUrl)

  const hasEditChanges = selectedCategory
    ? !areFormsEqual(editForm, mapFormFromCategory(selectedCategory))
    : false

  const isEditingGeneralInfo = mode === 'edit-general'
  const isCreatingRoot = mode === 'create-root'
  const isCreatingChild = mode === 'create-child'
  const areCategoryActionsLocked = isEditingGeneralInfo || isCreatingRoot || isCreatingChild

  const canSaveEdit =
    Boolean(selectedCategory) &&
    hasEditChanges &&
    !editErrors.name &&
    !editErrors.imageUrl &&
    !patchMutation.isPending

  const canCreate =
    !createErrors.name &&
    !createErrors.imageUrl &&
    !createMutation.isPending &&
    Boolean(createForm.name.trim())

  const deleteBlockedReason = selectedCategory
    ? selectedChildren.length > 0
      ? categoriesUiText.details.danger.deleteBlockedChildren
      : (deleteConflictByCategoryId[selectedCategory._id] ?? '')
    : ''

  const canDelete = Boolean(selectedCategory) && deleteBlockedReason.length === 0
  const deleteButtonDisabled = !canDelete || areCategoryActionsLocked
  const deleteDisabledTooltip =
    'Category can be deleted only if it has no child categories and no assigned products.'

  const moveSourceCategory = moveDialog.sourceId
    ? (flatById.get(moveDialog.sourceId) ?? null)
    : null
  const moveTargetCategory = moveDialog.targetParentId
    ? (flatById.get(moveDialog.targetParentId) ?? null)
    : null

  const isInvalidMoveTarget = useCallback(
    (sourceCategoryId: string, targetCategoryId: string) => {
      if (sourceCategoryId === targetCategoryId) return true
      const target = flatById.get(targetCategoryId)
      if (!target) return true
      if (target.path.some((item) => item._id === sourceCategoryId)) return true
      const targetTreeCategory = treeById.get(targetCategoryId)
      if (!targetTreeCategory) return true
      return (targetTreeCategory.directProductsCount ?? 0) > 0
    },
    [flatById, treeById],
  )

  const moveTargetOptions = useMemo(() => {
    if (!moveDialog.sourceId) return []
    return flatNodes.filter((item) => !isInvalidMoveTarget(moveDialog.sourceId, item._id))
  }, [flatNodes, isInvalidMoveTarget, moveDialog.sourceId])

  const effectiveExpandedIds = useMemo(() => {
    const next =
      expandedIds.size > 0 ? new Set(expandedIds) : new Set(treeNodes.map((item) => item._id))
    if (selectedIdFromQuery) {
      const querySelectedCategory = flatById.get(selectedIdFromQuery)
      querySelectedCategory?.path.forEach((pathItem) => next.add(pathItem._id))
    }
    return next
  }, [expandedIds, flatById, selectedIdFromQuery, treeNodes])

  const moveTargetSelectionError =
    moveSubmitAttempted && moveDialog.mode === 'picker' && moveDialog.targetKind === 'unset'
      ? categoriesUiText.dialogs.moveTargetRequired
      : ''

  const refreshQueries = async () => {
    try {
      const result = await workspaceQuery.refetch()
      return {
        nextFlat: normalizeFlatNodes(result.data?.flat ?? EMPTY_FLAT),
      }
    } catch {
      enqueueSnackbar(categoriesUiText.toasts.refreshFailed, { variant: 'error' })
      return {
        nextFlat: flatNodes,
      }
    }
  }

  const expandByPathIds = (pathIds: string[]) => {
    if (pathIds.length === 0) return
    setExpandedIds((previous) => {
      const next = new Set(previous)
      pathIds.forEach((categoryId) => next.add(categoryId))
      return next
    })
  }

  const selectCategoryWithPathExpansion = (categoryId: string | null) => {
    if (categoryId) {
      expandByPathIds(flatById.get(categoryId)?.path.map((pathItem) => pathItem._id) ?? [])
    }
    selectCategory(categoryId)
  }

  const isCreateChildBlocked = (categoryId: string) =>
    (treeById.get(categoryId)?.directProductsCount ?? 0) > 0

  const openCreateRoot = () => {
    if (areCategoryActionsLocked) return
    setMode('create-root')
    setCreateParentId(null)
    setCreateForm(EMPTY_FORM)
    setCreateSubmitAttempted(false)
  }

  const openCreateChild = (parentId: string) => {
    if (areCategoryActionsLocked) return
    const normalizedParentId = toStableId(parentId)
    if (isCreateChildBlocked(normalizedParentId)) {
      enqueueSnackbar(categoriesUiText.details.createChildBlockedDirectProducts, {
        variant: 'warning',
      })
      return
    }
    selectCategoryWithPathExpansion(normalizedParentId)
    setMode('create-child')
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
    if (createParentId && isCreateChildBlocked(createParentId)) {
      enqueueSnackbar(categoriesUiText.details.createChildBlockedDirectProducts, {
        variant: 'warning',
      })
      return
    }

    try {
      const createdCategory = await createMutation.mutateAsync({
        name: createForm.name.trim(),
        slug: normalizeOptional(createForm.slug),
        description: normalizeOptional(createForm.description),
        imageUrl: normalizeOptional(createForm.imageUrl),
        parentId: createParentId ?? undefined,
      })
      const createdCategoryId = toStableId(createdCategory._id)
      const { nextFlat } = await refreshQueries()
      const createdCategoryFromFlat = nextFlat.find((item) => item._id === createdCategoryId)
      expandByPathIds(createdCategoryFromFlat?.path.map((pathItem) => pathItem._id) ?? [])
      selectCategory(createdCategoryId)
      setCreateParentId(null)
      setCreateForm(EMPTY_FORM)
      setCreateSubmitAttempted(false)
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
      setMode('view')
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
    setMode('view')
  }

  const openEditGeneralInfo = () => {
    if (!selectedCategory || areCategoryActionsLocked) return

    setEditDraftByCategoryId((previous) => ({
      ...previous,
      [selectedCategory._id]:
        previous[selectedCategory._id] ?? mapFormFromCategory(selectedCategory),
    }))
    setMode('edit-general')
  }

  const openMovePicker = (sourceId: string) => {
    if (areCategoryActionsLocked) return
    setMoveDialog({
      open: true,
      sourceId,
      targetParentId: null,
      targetKind: 'unset',
      mode: 'picker',
    })
    setMoveSubmitAttempted(false)
  }

  const openMoveConfirmFromDrop = (sourceId: string, targetParentId: string) => {
    setMoveDialog({
      open: true,
      sourceId,
      targetParentId,
      targetKind: 'category',
      mode: 'confirm',
    })
    setMoveSubmitAttempted(false)
  }

  const openMoveRootConfirmFromDrop = (sourceId: string) => {
    setMoveDialog({
      open: true,
      sourceId,
      targetParentId: null,
      targetKind: 'root',
      mode: 'confirm',
    })
    setMoveSubmitAttempted(false)
  }

  const closeMoveDialog = () => {
    setMoveDialog(EMPTY_MOVE_DIALOG)
    setMoveSubmitAttempted(false)
  }

  const handleMoveConfirm = async () => {
    if (!moveDialog.sourceId) return

    setMoveSubmitAttempted(true)

    if (moveDialog.targetKind === 'unset') return

    const resolvedTargetParentId =
      moveDialog.targetKind === 'root' ? null : moveDialog.targetParentId
    const targetParentPathIds =
      resolvedTargetParentId === null
        ? []
        : (flatById.get(resolvedTargetParentId)?.path.map((pathItem) => pathItem._id) ?? [])

    try {
      await moveMutation.mutateAsync({
        categoryId: moveDialog.sourceId,
        payload: { targetParentId: resolvedTargetParentId },
      })
      const movedCategoryId = toStableId(moveDialog.sourceId)
      const { nextFlat } = await refreshQueries()
      const movedCategoryFromFlat = nextFlat.find((item) => item._id === movedCategoryId)
      const nextExpandedPathIds =
        movedCategoryFromFlat?.path.map((pathItem) => pathItem._id) ?? targetParentPathIds
      expandByPathIds(nextExpandedPathIds)
      selectCategory(movedCategoryId)
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
        (parentId && nextFlat.some((item) => item._id === parentId)
          ? parentId
          : nextFlat[0]?._id) ?? null
      selectCategory(nextSelectedId)
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
    if (areCategoryActionsLocked) {
      event.preventDefault()
      return
    }
    setDraggedId(categoryId)
    event.dataTransfer.effectAllowed = 'move'
  }

  const handleDragEnd = () => {
    setDraggedId(null)
    setDragOverId(null)
    setIsRootDragOver(false)
  }

  const handleDragOver = (targetCategoryId: string, event: DragEvent<HTMLDivElement>) => {
    if (areCategoryActionsLocked) return
    if (!draggedId || isInvalidMoveTarget(draggedId, targetCategoryId)) return

    event.preventDefault()
    setIsRootDragOver(false)
    setDragOverId(targetCategoryId)
  }

  const handleDrop = (targetCategoryId: string, event: DragEvent<HTMLDivElement>) => {
    if (areCategoryActionsLocked) return

    event.preventDefault()

    if (!draggedId || isInvalidMoveTarget(draggedId, targetCategoryId)) {
      setDraggedId(null)
      setDragOverId(null)
      setIsRootDragOver(false)
      return
    }

    setDragOverId(null)
    setIsRootDragOver(false)
    setDraggedId(null)
    openMoveConfirmFromDrop(draggedId, targetCategoryId)
  }

  const handleRootDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (areCategoryActionsLocked || !draggedId) return
    const draggedNode = flatById.get(draggedId)
    if (!draggedNode?.parentId) return
    event.preventDefault()
    setDragOverId(null)
    setIsRootDragOver(true)
  }

  const handleRootDrop = (event: DragEvent<HTMLDivElement>) => {
    if (areCategoryActionsLocked) return
    event.preventDefault()

    if (!draggedId) {
      setIsRootDragOver(false)
      return
    }

    const draggedNode = flatById.get(draggedId)
    if (!draggedNode?.parentId) {
      setDraggedId(null)
      setIsRootDragOver(false)
      return
    }

    setDraggedId(null)
    setIsRootDragOver(false)
    openMoveRootConfirmFromDrop(draggedId)
  }

  const selectedAddChildBlocked = selectedCategory
    ? isCreateChildBlocked(selectedCategory._id)
    : false
  const isMoveToRootDisabled = !moveDialog.sourceId || !flatById.get(moveDialog.sourceId)?.parentId

  return {
    workspaceQuery,
    treeNodes,
    flatNodes,
    search,
    setSearch,
    displayTree,
    filteredTree,
    searchNormalized,
    effectiveSelectedId,
    selectedCategory,
    selectedChildren,
    selectedPath,
    selectedPathLabel,
    selectedParentLabel,
    selectedProductsCount,
    selectedDirectProductsCount,
    editForm,
    editErrors,
    createForm,
    setCreateForm,
    createErrors,
    shouldShowCreateNameError,
    shouldShowCreateImageError,
    isEditingGeneralInfo,
    isCreatingRoot,
    isCreatingChild,
    areCategoryActionsLocked,
    canSaveEdit,
    canCreate,
    canDelete,
    deleteButtonDisabled,
    deleteDisabledTooltip,
    deleteDialogOpen,
    setDeleteDialogOpen,
    moveDialog,
    setMoveDialog,
    moveTargetOptions,
    moveTargetCategory,
    moveSourceCategory,
    moveTargetSelectionError,
    moveMutation,
    deleteMutation,
    createMutation,
    patchMutation,
    draggedId,
    dragOverId,
    isRootDragOver,
    effectiveExpandedIds,
    selectedAddChildBlocked,
    isMoveToRootDisabled,
    setSelectedId: selectCategoryWithPathExpansion,
    setCreateParentId,
    setEditDraftByCategoryId,
    openCreateRoot,
    openCreateChild,
    closeCreateMode,
    handleCreateSubmit,
    handleEditSave,
    handleEditCancel,
    openEditGeneralInfo,
    openMovePicker,
    closeMoveDialog,
    handleMoveConfirm,
    handleDeleteConfirm,
    handleToggleExpand,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDrop,
    handleRootDragOver,
    handleRootDrop,
    buildPathLabel,
    categoriesUiText,
  }
}
