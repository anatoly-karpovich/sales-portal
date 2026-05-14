import ArrowRightAltRoundedIcon from '@mui/icons-material/ArrowRightAltRounded'
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useCallback, useMemo, useState, type DragEvent } from 'react'
import { useSnackbar } from 'notistack'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { categoriesUiText, getDeleteCategoryMessage } from '@/features/categories/categories.ui-text'
import { CategoriesChildrenSection } from '@/features/categories/components/CategoriesChildrenSection'
import { CategoriesCreateFormSection } from '@/features/categories/components/CategoriesCreateFormSection'
import { CategoriesDetailsHeader } from '@/features/categories/components/CategoriesDetailsHeader'
import { CategoriesGeneralInfoSection } from '@/features/categories/components/CategoriesGeneralInfoSection'
import { CategoriesTreePanel } from '@/features/categories/components/CategoriesTreePanel'
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
  const [mode, setMode] = useState<DetailsMode>('view')
  const [createParentId, setCreateParentId] = useState<string | null>(null)
  const [createForm, setCreateForm] = useState<CategoryFormState>(EMPTY_FORM)
  const [createSubmitAttempted, setCreateSubmitAttempted] = useState(false)
  const [editDraftByCategoryId, setEditDraftByCategoryId] = useState<Record<string, CategoryFormState>>({})
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteConflictByCategoryId, setDeleteConflictByCategoryId] = useState<Record<string, string>>({})
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

  const flatById = useMemo(() => new Map(flatNodes.map((item) => [item._id, item])), [flatNodes])
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
  const selectedTreeCategory = effectiveSelectedId ? treeById.get(effectiveSelectedId) ?? null : null
  const selectedChildren = selectedTreeCategory?.children ?? []
  const selectedProductsCount = selectedTreeCategory?.productsCount ?? 0
  const selectedPath = selectedCategory?.path ?? []
  const selectedPathLabel = selectedCategory ? buildPathLabel(selectedCategory.path) : ''
  const selectedParentLabel =
    selectedPath.length > 1
      ? buildPathLabel(selectedPath.slice(0, -1))
      : categoriesUiText.details.parentRootLabel

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
      : deleteConflictByCategoryId[selectedCategory._id] ?? ''
    : ''

  const canDelete = Boolean(selectedCategory) && deleteBlockedReason.length === 0
  const deleteButtonDisabled = !canDelete || areCategoryActionsLocked
  const deleteDisabledTooltip =
    'Category can be deleted only if it has no child categories and no assigned products.'

  const moveSourceCategory = moveDialog.sourceId ? flatById.get(moveDialog.sourceId) ?? null : null
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
    setSelectedId(normalizedParentId)
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
      setSelectedId(createdCategoryId)
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
      [selectedCategory._id]: previous[selectedCategory._id] ?? mapFormFromCategory(selectedCategory),
    }))
    setMode('edit-general')
  }

  const openMovePicker = (sourceId: string) => {
    if (areCategoryActionsLocked) return
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

    const targetParentPathIds =
      flatById.get(moveDialog.targetParentId)?.path.map((pathItem) => pathItem._id) ?? []

    try {
      await moveMutation.mutateAsync({
        categoryId: moveDialog.sourceId,
        payload: { targetParentId: moveDialog.targetParentId },
      })
      const movedCategoryId = toStableId(moveDialog.sourceId)
      const { nextFlat } = await refreshQueries()
      const movedCategoryFromFlat = nextFlat.find((item) => item._id === movedCategoryId)
      const nextExpandedPathIds =
        movedCategoryFromFlat?.path.map((pathItem) => pathItem._id) ?? targetParentPathIds
      expandByPathIds(nextExpandedPathIds)
      setSelectedId(movedCategoryId)
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
      const next = previous.size > 0 ? new Set(previous) : new Set(treeNodes.map((item) => item._id))
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
  }

  const handleDragOver = (targetCategoryId: string, event: DragEvent<HTMLDivElement>) => {
    if (areCategoryActionsLocked) return
    if (!draggedId || isInvalidMoveTarget(draggedId, targetCategoryId)) return

    event.preventDefault()
    setDragOverId(targetCategoryId)
  }

  const handleDrop = (targetCategoryId: string, event: DragEvent<HTMLDivElement>) => {
    if (areCategoryActionsLocked) return

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
    if (isCreatingRoot) {
      const createParentCategory = createParentId ? flatById.get(createParentId) ?? null : null
      const parentLabel = createParentCategory
        ? buildPathLabel(createParentCategory.path)
        : categoriesUiText.details.parentRootLabel

      return (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <CategoriesCreateFormSection
            testId="categories-page-create-root-mode"
            title={categoriesUiText.details.sections.createRoot}
            form={createForm}
            parentLabel={parentLabel}
            nameError={shouldShowCreateNameError ? createErrors.name : ''}
            imageUrlError={shouldShowCreateImageError ? createErrors.imageUrl : ''}
            isSubmitting={createMutation.isPending}
            canSubmit={canCreate}
            onChange={setCreateForm}
            onSubmit={() => void handleCreateSubmit()}
            onCancel={closeCreateMode}
          />
        </Paper>
      )
    }

    if (!selectedCategory) {
      return (
        <Paper variant="outlined" sx={{ p: 3 }} data-testid="categories-page-empty-selection">
          <Stack spacing={1}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {categoriesUiText.details.placeholderTitle}
            </Typography>
            <Typography color="text.secondary">{categoriesUiText.details.placeholderText}</Typography>
          </Stack>
        </Paper>
      )
    }

    return (
      <Stack spacing={2} data-testid="categories-page-view-mode">
        <Paper variant="outlined" sx={{ p: 2 }}>
          <CategoriesGeneralInfoSection
            selectedCategory={selectedCategory}
            selectedParentLabel={selectedParentLabel}
            isEditing={isEditingGeneralInfo}
            form={editForm}
            errors={editErrors}
            canSave={canSaveEdit}
            isSavePending={patchMutation.isPending}
            isActionLocked={areCategoryActionsLocked}
            onStartEdit={openEditGeneralInfo}
            onCancelEdit={handleEditCancel}
            onSaveEdit={() => void handleEditSave()}
            onChange={(nextForm) =>
              setEditDraftByCategoryId((previous) => ({
                ...previous,
                [selectedCategory._id]: nextForm,
              }))
            }
          />
        </Paper>

        <Paper variant="outlined" sx={{ p: 2 }}>
          <CategoriesChildrenSection
            selectedChildren={selectedChildren}
            selectedCategoryName={selectedCategory.name}
            selectedPathLabel={selectedPathLabel}
            isActionsLocked={areCategoryActionsLocked}
            isCreateChildMode={isCreatingChild}
            createForm={createForm}
            shouldShowCreateNameError={shouldShowCreateNameError}
            shouldShowCreateImageError={shouldShowCreateImageError}
            createNameError={createErrors.name}
            createImageUrlError={createErrors.imageUrl}
            canCreate={canCreate}
            isCreatePending={createMutation.isPending}
            onOpenCreateChild={() => openCreateChild(selectedCategory._id)}
            onSelectChild={(childId) => {
              setSelectedId(childId)
              if (isCreatingChild) {
                setCreateParentId(childId)
              }
            }}
            onCreateFormChange={setCreateForm}
            onCreateSubmit={() => void handleCreateSubmit()}
            onCreateCancel={closeCreateMode}
          />
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
          disabled={areCategoryActionsLocked}
          data-testid="categories-page-header-add-root-button"
        >
          {categoriesUiText.page.addRootButton}
        </Button>
      </Stack>

      {workspaceQuery.isLoading ? (
        <Paper variant="outlined" sx={{ p: 3 }} data-testid="categories-page-loading">
          <Stack direction="row" spacing={1.25} alignItems="center">
            <CircularProgress size={18} />
            <Typography>Loading categories...</Typography>
          </Stack>
        </Paper>
      ) : null}

      {workspaceQuery.isError ? (
        <Alert severity="error" data-testid="categories-page-load-error">
          {categoriesUiText.errors.loadTreeFailed}
        </Alert>
      ) : null}

      {!workspaceQuery.isLoading && !workspaceQuery.isError ? (
        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: { xs: '1fr', lg: 'minmax(360px, 460px) minmax(0, 1fr)' },
            alignItems: 'start',
          }}
          data-testid="categories-page-workspace"
        >
          <CategoriesTreePanel
            flatNodesCount={flatNodes.length}
            search={search}
            onSearchChange={setSearch}
            displayTree={displayTree}
            effectiveSelectedId={effectiveSelectedId}
            effectiveExpandedIds={effectiveExpandedIds}
            forcedExpandedIds={filteredTree.expandedIds}
            searchActive={Boolean(searchNormalized)}
            dragOverId={dragOverId}
            draggedId={draggedId}
            areActionsLocked={areCategoryActionsLocked}
            onToggleExpand={handleToggleExpand}
            onSelectNode={(categoryId) => {
              setSelectedId(categoryId)
              if (isCreatingChild) {
                setCreateParentId(categoryId)
              }
            }}
            onAddChild={openCreateChild}
            onOpenMovePicker={openMovePicker}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onOpenCreateRoot={openCreateRoot}
          />

          <Paper variant="outlined" sx={{ p: 2 }} data-testid="categories-page-details-panel">
            <Stack spacing={2}>
              {selectedCategory && mode !== 'create-root' ? (
                <CategoriesDetailsHeader
                  selectedCategory={selectedCategory}
                  selectedPath={selectedPath}
                  selectedChildrenCount={selectedChildren.length}
                  selectedProductsCount={selectedProductsCount}
                  selectedPathLabel={selectedPathLabel}
                  canDelete={canDelete}
                  deleteButtonDisabled={deleteButtonDisabled}
                  deleteDisabledTooltip={deleteDisabledTooltip}
                  isActionsLocked={areCategoryActionsLocked}
                  onMove={() => openMovePicker(selectedCategory._id)}
                  onDelete={() => setDeleteDialogOpen(true)}
                />
              ) : null}

              {renderDetailsContent()}
            </Stack>
          </Paper>
        </Box>
      ) : null}

      <ConfirmDialog
        open={deleteDialogOpen}
        title={categoriesUiText.dialogs.deleteTitle}
        message={
          selectedCategory
            ? `${categoriesUiText.dialogs.deleteMessage}\n\n${getDeleteCategoryMessage(selectedCategory.name)}`
            : categoriesUiText.dialogs.deleteMessage
        }
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
                      'data-testid': 'categories-page-move-target-autocomplete-field',
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
                <Typography>{moveTargetCategory ? buildPathLabel(moveTargetCategory.path) : '-'}</Typography>
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
