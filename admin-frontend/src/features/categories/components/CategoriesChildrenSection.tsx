import { Alert, Box, Button, Paper, Stack, Typography } from '@mui/material'
import type { CategoryNode } from '@/api/modules/categories.api'
import { categoriesUiText } from '@/features/categories/categories.ui-text'
import { CategoriesCreateFormSection } from '@/features/categories/components/CategoriesCreateFormSection'
import type { CategoryFormState } from '@/features/categories/pages/categoriesPage.utils'

type CategoriesChildrenSectionProps = {
  selectedChildren: CategoryNode[]
  selectedCategoryName: string
  selectedPathLabel: string
  isActionsLocked: boolean
  isCreateChildMode: boolean
  createForm: CategoryFormState
  shouldShowCreateNameError: boolean
  shouldShowCreateImageError: boolean
  createNameError: string
  createImageUrlError: string
  canCreate: boolean
  isCreatePending: boolean
  onOpenCreateChild: () => void
  onSelectChild: (childId: string) => void
  onCreateFormChange: (next: CategoryFormState) => void
  onCreateSubmit: () => void
  onCreateCancel: () => void
}

export function CategoriesChildrenSection({
  selectedChildren,
  selectedCategoryName,
  selectedPathLabel,
  isActionsLocked,
  isCreateChildMode,
  createForm,
  shouldShowCreateNameError,
  shouldShowCreateImageError,
  createNameError,
  createImageUrlError,
  canCreate,
  isCreatePending,
  onOpenCreateChild,
  onSelectChild,
  onCreateFormChange,
  onCreateSubmit,
  onCreateCancel,
}: CategoriesChildrenSectionProps) {
  return (
    <Stack spacing={1.5}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          {categoriesUiText.details.sections.children}
        </Typography>
        <Button
          variant="outlined"
          onClick={onOpenCreateChild}
          disabled={isActionsLocked}
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
          {categoriesUiText.details.noChildrenPrefix} {selectedCategoryName}.
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
              key={`${child._id}-child-card-${childIndex}`}
              variant="outlined"
              sx={{
                p: 1.25,
                cursor: 'pointer',
                bgcolor: 'transparent',
                '&:hover': {
                  borderColor: 'primary.main',
                },
              }}
              onClick={() => onSelectChild(child._id)}
              data-testid={`categories-page-child-card-${child._id}`}
            >
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {child.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {child.productsCount ?? 0} products | {child.children.length} children
              </Typography>
            </Paper>
          ))}
        </Box>
      )}

      {isCreateChildMode ? (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <CategoriesCreateFormSection
            testId="categories-page-create-child-mode"
            title={categoriesUiText.details.sections.createChild}
            titleVariant="subtitle1"
            form={createForm}
            parentLabel={selectedPathLabel}
            nameError={shouldShowCreateNameError ? createNameError : ''}
            imageUrlError={shouldShowCreateImageError ? createImageUrlError : ''}
            isSubmitting={isCreatePending}
            canSubmit={canCreate}
            onChange={onCreateFormChange}
            onSubmit={onCreateSubmit}
            onCancel={onCreateCancel}
          />
        </Paper>
      ) : null}
    </Stack>
  )
}
