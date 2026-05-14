import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded'
import { Button, Chip, Stack, Tooltip, Typography } from '@mui/material'
import type { CategoryFlatNode } from '@/api/modules/categories.api'
import { categoriesUiText } from '@/features/categories/categories.ui-text'
import { toStableId } from '@/features/categories/pages/categoriesPage.utils'

type CategoriesDetailsHeaderProps = {
  selectedCategory: CategoryFlatNode
  selectedPath: CategoryFlatNode['path']
  selectedChildrenCount: number
  selectedProductsCount: number
  selectedPathLabel: string
  canDelete: boolean
  deleteButtonDisabled: boolean
  deleteDisabledTooltip: string
  isActionsLocked: boolean
  onMove: () => void
  onDelete: () => void
}

export function CategoriesDetailsHeader({
  selectedCategory,
  selectedPath,
  selectedChildrenCount,
  selectedProductsCount,
  selectedPathLabel,
  canDelete,
  deleteButtonDisabled,
  deleteDisabledTooltip,
  isActionsLocked,
  onMove,
  onDelete,
}: CategoriesDetailsHeaderProps) {
  return (
    <Stack
      direction={{ xs: 'column', md: 'row' }}
      justifyContent="space-between"
      alignItems={{ xs: 'stretch', md: 'flex-start' }}
      spacing={1.5}
    >
      <Stack spacing={1}>
        <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
          {selectedPath.map((item, index) => (
            <Stack
              key={`${toStableId(item._id)}-path-${index}`}
              direction="row"
              spacing={0.5}
              alignItems="center"
            >
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
              selectedChildrenCount > 0
                ? categoriesUiText.details.parentBadge
                : categoriesUiText.details.leafBadge
            }
          />
        </Stack>
        <Stack
          direction="row"
          spacing={2}
          flexWrap="wrap"
          useFlexGap
          sx={{ color: 'text.secondary' }}
          data-testid="categories-page-details-usage-inline"
        >
          <Typography variant="body2">
            <Typography component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>
              Products:
            </Typography>{' '}
            {selectedProductsCount} products
          </Typography>
          <Typography variant="body2">
            <Typography component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>
              {categoriesUiText.details.usage.rootCategory}:
            </Typography>{' '}
            {selectedPath[0]?.name ?? '-'}
          </Typography>
          <Typography variant="body2">
            <Typography component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>
              {categoriesUiText.details.usage.depth}:
            </Typography>{' '}
            {selectedPath.length}
          </Typography>
          <Typography variant="body2" sx={{ overflowWrap: 'anywhere' }}>
            <Typography component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>
              {categoriesUiText.details.usage.fullPath}:
            </Typography>{' '}
            {selectedPathLabel}
          </Typography>
        </Stack>
      </Stack>

      <Stack direction="row" spacing={1}>
        <Button
          variant="outlined"
          onClick={onMove}
          disabled={isActionsLocked}
          data-testid="categories-page-details-move-button"
        >
          {categoriesUiText.details.actions.move}
        </Button>
        <Tooltip title={canDelete ? '' : deleteDisabledTooltip} disableHoverListener={canDelete}>
          <span>
            <Button
              variant="contained"
              color="error"
              disabled={deleteButtonDisabled}
              onClick={onDelete}
              data-testid="categories-page-delete-button"
            >
              {categoriesUiText.details.danger.deleteButton}
            </Button>
          </span>
        </Tooltip>
      </Stack>
    </Stack>
  )
}
