import EditRoundedIcon from '@mui/icons-material/EditRounded'
import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import type { CategoryFlatNode } from '@/api/modules/categories.api'
import { categoriesUiText } from '@/features/categories/categories.ui-text'
import type {
  CategoryFormErrors,
  CategoryFormState,
} from '@/features/categories/pages/categoriesPage.utils'

type CategoriesGeneralInfoSectionProps = {
  selectedCategory: CategoryFlatNode
  selectedParentLabel: string
  isEditing: boolean
  form: CategoryFormState
  errors: CategoryFormErrors
  canSave: boolean
  isSavePending: boolean
  isActionLocked: boolean
  onStartEdit: () => void
  onCancelEdit: () => void
  onSaveEdit: () => void
  onChange: (next: CategoryFormState) => void
}

export function CategoriesGeneralInfoSection({
  selectedCategory,
  selectedParentLabel,
  isEditing,
  form,
  errors,
  canSave,
  isSavePending,
  isActionLocked,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onChange,
}: CategoriesGeneralInfoSectionProps) {
  return (
    <Stack spacing={2}>
      <Stack direction="row" alignItems="center" spacing={0.25}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          {categoriesUiText.details.sections.generalInfo}
        </Typography>
        <IconButton
          size="small"
          onClick={onStartEdit}
          disabled={isActionLocked}
          data-testid="categories-page-general-info-edit-button"
        >
          <EditRoundedIcon fontSize="small" />
        </IconButton>
      </Stack>

      {isEditing ? (
        <Stack spacing={2}>
          <Box
            sx={{
              display: 'grid',
              gap: 2,
              gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
            }}
          >
            <TextField
              label={categoriesUiText.details.fields.name}
              value={form.name}
              onChange={(event) =>
                onChange({
                  ...form,
                  name: event.target.value,
                })
              }
              error={Boolean(errors.name)}
              helperText={errors.name || ' '}
              data-testid="categories-page-edit-name-input"
              inputProps={{ 'data-testid': 'categories-page-edit-name-input-field' }}
            />
            <TextField
              label={categoriesUiText.details.fields.slug}
              value={form.slug}
              onChange={(event) =>
                onChange({
                  ...form,
                  slug: event.target.value,
                })
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
              value={form.description}
              onChange={(event) =>
                onChange({
                  ...form,
                  description: event.target.value,
                })
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
              value={form.imageUrl}
              onChange={(event) =>
                onChange({
                  ...form,
                  imageUrl: event.target.value,
                })
              }
              error={Boolean(errors.imageUrl)}
              helperText={errors.imageUrl || ' '}
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
              onClick={onSaveEdit}
              disabled={!canSave}
              data-testid="categories-page-edit-save-button"
            >
              {isSavePending ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                categoriesUiText.details.update.submit
              )}
            </Button>
            <Button
              variant="text"
              onClick={onCancelEdit}
              disabled={isSavePending}
              data-testid="categories-page-edit-cancel-button"
            >
              {categoriesUiText.details.create.cancel}
            </Button>
          </Stack>
        </Stack>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '170px minmax(0, 1fr)' },
            rowGap: 1,
            columnGap: 2,
          }}
          data-testid="categories-page-general-info-readonly"
        >
          <Typography fontWeight={700}>{categoriesUiText.details.fields.name}</Typography>
          <Typography>{selectedCategory.name}</Typography>

          <Typography fontWeight={700}>{categoriesUiText.details.fields.slug}</Typography>
          <Typography>{selectedCategory.slug}</Typography>

          <Typography fontWeight={700}>{categoriesUiText.details.fields.parentPath}</Typography>
          <Typography>{selectedParentLabel}</Typography>

          <Typography fontWeight={700}>{categoriesUiText.details.fields.description}</Typography>
          <Typography>{selectedCategory.description?.trim() || '-'}</Typography>

          <Typography fontWeight={700}>{categoriesUiText.details.fields.imageUrl}</Typography>
          <Typography sx={{ overflowWrap: 'anywhere' }}>
            {selectedCategory.imageUrl?.trim() || '-'}
          </Typography>
        </Box>
      )}
    </Stack>
  )
}
