import { Box, Button, CircularProgress, Stack, TextField, Typography } from '@mui/material'
import { categoriesUiText } from '@/features/categories/categories.ui-text'
import type { CategoryFormState } from '@/features/categories/pages/categoriesPage.utils'

type CategoriesCreateFormSectionProps = {
  title: string
  form: CategoryFormState
  parentLabel: string
  nameError: string
  imageUrlError: string
  isSubmitting: boolean
  canSubmit: boolean
  onChange: (next: CategoryFormState) => void
  onSubmit: () => void
  onCancel: () => void
  testId?: string
  titleVariant?: 'h6' | 'subtitle1'
}

export function CategoriesCreateFormSection({
  title,
  form,
  parentLabel,
  nameError,
  imageUrlError,
  isSubmitting,
  canSubmit,
  onChange,
  onSubmit,
  onCancel,
  testId,
  titleVariant = 'h6',
}: CategoriesCreateFormSectionProps) {
  return (
    <Stack spacing={2} data-testid={testId}>
      <Typography variant={titleVariant} sx={{ fontWeight: 700 }}>
        {title}
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
          value={form.name}
          onChange={(event) =>
            onChange({
              ...form,
              name: event.target.value,
            })
          }
          error={Boolean(nameError)}
          helperText={nameError || ' '}
          data-testid="categories-page-create-name-input"
          inputProps={{ 'data-testid': 'categories-page-create-name-input-field' }}
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
          data-testid="categories-page-create-description-input"
          inputProps={{
            'data-testid': 'categories-page-create-description-input-field',
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
          error={Boolean(imageUrlError)}
          helperText={imageUrlError || ' '}
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
          onClick={onSubmit}
          disabled={!canSubmit}
          data-testid="categories-page-create-submit-button"
        >
          {isSubmitting ? (
            <CircularProgress size={16} color="inherit" />
          ) : (
            categoriesUiText.details.create.submit
          )}
        </Button>
        <Button
          onClick={onCancel}
          disabled={isSubmitting}
          data-testid="categories-page-create-cancel-button"
        >
          {categoriesUiText.details.create.cancel}
        </Button>
      </Stack>
    </Stack>
  )
}
