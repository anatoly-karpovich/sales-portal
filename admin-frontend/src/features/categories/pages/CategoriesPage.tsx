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
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { categoriesUiText, getDeleteCategoryMessage } from '@/features/categories/categories.ui-text'
import { CategoriesChildrenSection } from '@/features/categories/components/CategoriesChildrenSection'
import { CategoriesCreateFormSection } from '@/features/categories/components/CategoriesCreateFormSection'
import { CategoriesDetailsHeader } from '@/features/categories/components/CategoriesDetailsHeader'
import { CategoriesGeneralInfoSection } from '@/features/categories/components/CategoriesGeneralInfoSection'
import { CategoriesTreePanel } from '@/features/categories/components/CategoriesTreePanel'
import { useCategoriesWorkspaceState } from '@/features/categories/hooks/useCategoriesWorkspaceState'

export function CategoriesPage() {
  const state = useCategoriesWorkspaceState()

  const renderDetailsContent = () => {
    if (state.isCreatingRoot) {
      return (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <CategoriesCreateFormSection
            testId="categories-page-create-root-mode"
            title={categoriesUiText.details.sections.createRoot}
            form={state.createForm}
            parentLabel={categoriesUiText.details.parentRootLabel}
            nameError={state.shouldShowCreateNameError ? state.createErrors.name : ''}
            imageUrlError={state.shouldShowCreateImageError ? state.createErrors.imageUrl : ''}
            isSubmitting={state.createMutation.isPending}
            canSubmit={state.canCreate}
            onChange={state.setCreateForm}
            onSubmit={() => void state.handleCreateSubmit()}
            onCancel={state.closeCreateMode}
          />
        </Paper>
      )
    }

    if (!state.selectedCategory) {
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

    const selectedCategory = state.selectedCategory

    return (
      <Stack spacing={2} data-testid="categories-page-view-mode">
        <Paper variant="outlined" sx={{ p: 2 }}>
          <CategoriesGeneralInfoSection
            selectedCategory={selectedCategory}
            selectedParentLabel={state.selectedParentLabel}
            isEditing={state.isEditingGeneralInfo}
            form={state.editForm}
            errors={state.editErrors}
            canSave={state.canSaveEdit}
            isSavePending={state.patchMutation.isPending}
            isActionLocked={state.areCategoryActionsLocked}
            onStartEdit={state.openEditGeneralInfo}
            onCancelEdit={state.handleEditCancel}
            onSaveEdit={() => void state.handleEditSave()}
            onChange={(nextForm) =>
              state.setEditDraftByCategoryId((previous) => ({
                ...previous,
                [selectedCategory._id]: nextForm,
              }))
            }
          />
        </Paper>

        <Paper variant="outlined" sx={{ p: 2 }}>
          <CategoriesChildrenSection
            selectedChildren={state.selectedChildren}
            selectedCategoryName={selectedCategory.name}
            selectedPathLabel={state.selectedPathLabel}
            isActionsLocked={state.areCategoryActionsLocked}
            isAddChildDisabled={state.selectedAddChildBlocked}
            addChildDisabledReason={categoriesUiText.details.createChildBlockedDirectProducts}
            isCreateChildMode={state.isCreatingChild}
            createForm={state.createForm}
            shouldShowCreateNameError={state.shouldShowCreateNameError}
            shouldShowCreateImageError={state.shouldShowCreateImageError}
            createNameError={state.createErrors.name}
            createImageUrlError={state.createErrors.imageUrl}
            canCreate={state.canCreate}
            isCreatePending={state.createMutation.isPending}
            onOpenCreateChild={() => state.openCreateChild(selectedCategory._id)}
            onSelectChild={(childId) => {
              state.setSelectedId(childId)
              if (state.isCreatingChild) {
                state.setCreateParentId(childId)
              }
            }}
            onCreateFormChange={state.setCreateForm}
            onCreateSubmit={() => void state.handleCreateSubmit()}
            onCreateCancel={state.closeCreateMode}
          />
        </Paper>
      </Stack>
    )
  }

  const moveToLabel =
    state.moveDialog.targetKind === 'root'
      ? categoriesUiText.dialogs.moveTargetRootOption
      : state.moveTargetCategory
        ? state.buildPathLabel(state.moveTargetCategory.path)
        : '-'

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
          onClick={state.openCreateRoot}
          disabled={state.areCategoryActionsLocked}
          data-testid="categories-page-header-add-root-button"
        >
          {categoriesUiText.page.addRootButton}
        </Button>
      </Stack>

      {state.workspaceQuery.isLoading ? (
        <Paper variant="outlined" sx={{ p: 3 }} data-testid="categories-page-loading">
          <Stack direction="row" spacing={1.25} alignItems="center">
            <CircularProgress size={18} />
            <Typography>Loading categories...</Typography>
          </Stack>
        </Paper>
      ) : null}

      {state.workspaceQuery.isError ? (
        <Alert severity="error" data-testid="categories-page-load-error">
          {categoriesUiText.errors.loadTreeFailed}
        </Alert>
      ) : null}

      {!state.workspaceQuery.isLoading && !state.workspaceQuery.isError ? (
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
            flatNodesCount={state.flatNodes.length}
            search={state.search}
            onSearchChange={state.setSearch}
            addChildBlockedReason={categoriesUiText.details.createChildBlockedDirectProducts}
            displayTree={state.displayTree}
            effectiveSelectedId={state.effectiveSelectedId}
            effectiveExpandedIds={state.effectiveExpandedIds}
            forcedExpandedIds={state.filteredTree.expandedIds}
            searchActive={Boolean(state.searchNormalized)}
            dragOverId={state.dragOverId}
            draggedId={state.draggedId}
            areActionsLocked={state.areCategoryActionsLocked}
            onToggleExpand={state.handleToggleExpand}
            onSelectNode={(categoryId) => {
              state.setSelectedId(categoryId)
              if (state.isCreatingChild) {
                state.setCreateParentId(categoryId)
              }
            }}
            onAddChild={state.openCreateChild}
            onOpenMovePicker={state.openMovePicker}
            onDragStart={state.handleDragStart}
            onDragEnd={state.handleDragEnd}
            onDragOver={state.handleDragOver}
            onDrop={state.handleDrop}
            onRootDragOver={state.handleRootDragOver}
            onRootDrop={state.handleRootDrop}
            isRootDragOver={state.isRootDragOver}
            onOpenCreateRoot={state.openCreateRoot}
          />

          <Paper variant="outlined" sx={{ p: 2 }} data-testid="categories-page-details-panel">
            <Stack spacing={2}>
              {state.selectedCategory && !state.isCreatingRoot ? (
                <CategoriesDetailsHeader
                  selectedCategory={state.selectedCategory}
                  selectedPath={state.selectedPath}
                  selectedChildrenCount={state.selectedChildren.length}
                  selectedDirectProductsCount={state.selectedDirectProductsCount}
                  selectedProductsCount={state.selectedProductsCount}
                  selectedPathLabel={state.selectedPathLabel}
                  canDelete={state.canDelete}
                  deleteButtonDisabled={state.deleteButtonDisabled}
                  deleteDisabledTooltip={state.deleteDisabledTooltip}
                  isActionsLocked={state.areCategoryActionsLocked}
                  onMove={() => state.openMovePicker(state.selectedCategory._id)}
                  onDelete={() => state.setDeleteDialogOpen(true)}
                />
              ) : null}

              {renderDetailsContent()}
            </Stack>
          </Paper>
        </Box>
      ) : null}

      <ConfirmDialog
        open={state.deleteDialogOpen}
        title={categoriesUiText.dialogs.deleteTitle}
        message={
          state.selectedCategory
            ? `${categoriesUiText.dialogs.deleteMessage}\n\n${getDeleteCategoryMessage(
                state.selectedCategory.name,
              )}`
            : categoriesUiText.dialogs.deleteMessage
        }
        confirmLabel={categoriesUiText.dialogs.deleteConfirm}
        cancelLabel={categoriesUiText.dialogs.cancel}
        isSubmitting={state.deleteMutation.isPending}
        onCancel={() => state.setDeleteDialogOpen(false)}
        onConfirm={state.handleDeleteConfirm}
      />

      <Dialog
        open={state.moveDialog.open}
        onClose={state.moveMutation.isPending ? undefined : state.closeMoveDialog}
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
              <Typography sx={{ fontWeight: 600 }}>{state.moveSourceCategory?.name ?? '-'}</Typography>
            </Paper>

            <Paper variant="outlined" sx={{ p: 1.25 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                {categoriesUiText.dialogs.moveFromLabel}
              </Typography>
              <Typography>
                {state.moveSourceCategory ? state.buildPathLabel(state.moveSourceCategory.path) : '-'}
              </Typography>
            </Paper>

            {state.moveDialog.mode === 'picker' ? (
              <Stack spacing={1}>
                <Autocomplete
                  options={state.moveTargetOptions}
                  value={state.moveTargetCategory}
                  getOptionLabel={(option) => state.buildPathLabel(option.path)}
                  onChange={(_, value) => {
                    state.setMoveDialog((previous) => ({
                      ...previous,
                      targetParentId: value?._id ?? null,
                      targetKind: value ? 'category' : 'unset',
                    }))
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label={categoriesUiText.dialogs.moveTargetLabel}
                      placeholder={categoriesUiText.dialogs.moveTargetPlaceholder}
                      error={Boolean(state.moveTargetSelectionError)}
                      helperText={state.moveTargetSelectionError || ' '}
                      data-testid="categories-page-move-target-autocomplete"
                      inputProps={{
                        ...params.inputProps,
                        'data-testid': 'categories-page-move-target-autocomplete-field',
                      }}
                    />
                  )}
                  renderOption={(props, option, optionState) => {
                    const { key, ...optionProps } = props
                    return (
                      <Box
                        component="li"
                        key={key}
                        {...optionProps}
                        data-testid={`categories-page-move-target-option-${optionState.index}`}
                      >
                        {state.buildPathLabel(option.path)}
                      </Box>
                    )
                  }}
                />
                <Button
                  variant="outlined"
                  disabled={state.isMoveToRootDisabled}
                  onClick={() =>
                    state.setMoveDialog((previous) => ({
                      ...previous,
                      targetParentId: null,
                      targetKind: 'root',
                    }))
                  }
                  data-testid="categories-page-move-to-root-button"
                >
                  Move to root category
                </Button>
              </Stack>
            ) : null}

            <Paper variant="outlined" sx={{ p: 1.25 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                {categoriesUiText.dialogs.moveToLabel}
              </Typography>
              <Stack direction="row" spacing={0.75} alignItems="center">
                <Typography>{moveToLabel}</Typography>
                {state.moveDialog.targetKind !== 'unset' ? (
                  <ArrowRightAltRoundedIcon fontSize="small" />
                ) : null}
                <Typography sx={{ fontWeight: 600 }}>{state.moveSourceCategory?.name ?? '-'}</Typography>
              </Stack>
            </Paper>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={state.closeMoveDialog}
            disabled={state.moveMutation.isPending}
            data-testid="categories-page-move-dialog-cancel-button"
          >
            {categoriesUiText.dialogs.cancel}
          </Button>
          <Button
            variant="contained"
            onClick={() => void state.handleMoveConfirm()}
            disabled={state.moveMutation.isPending || state.moveDialog.targetKind === 'unset'}
            data-testid="categories-page-move-dialog-confirm-button"
          >
            {state.moveMutation.isPending ? (
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
