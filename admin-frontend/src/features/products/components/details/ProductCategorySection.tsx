import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded'
import { Alert, Button, Chip, IconButton, Paper, Stack, Tooltip, Typography } from '@mui/material'
import { Link } from 'react-router-dom'
import type { CategoryFlatNode, CategoryNode } from '@/api/modules/categories.api'
import type { Product } from '@/api/modules/products.api'
import { ProductCategorySelector } from '@/features/products/components/ProductCategorySelector'
import { productsUiText } from '@/features/products/products.ui-text'

type ProductCategorySectionProps = {
  product: Product
  tree: CategoryNode[]
  flat: CategoryFlatNode[]
  isCategoryEditMode: boolean
  isReadOnlyMode: boolean
  isEditingDisabled: boolean
  isInteractionsLocked: boolean
  isCategoriesLoading: boolean
  isCategoriesError: boolean
  categoryDraftId: string | null
  canSaveCategory: boolean
  onEnterCategoryMode: () => void
  onChangeCategoryDraft: (categoryId: string) => void
  onSaveCategory: () => void
  onCancelCategory: () => void
}

export function ProductCategorySection({
  product,
  tree,
  flat,
  isCategoryEditMode,
  isReadOnlyMode,
  isEditingDisabled,
  isInteractionsLocked,
  isCategoriesLoading,
  isCategoriesError,
  categoryDraftId,
  canSaveCategory,
  onEnterCategoryMode,
  onChangeCategoryDraft,
  onSaveCategory,
  onCancelCategory,
}: ProductCategorySectionProps) {
  const categoryPathItems = product.category?.path ?? []

  return (
    <Paper
      variant="outlined"
      sx={{ p: { xs: 1.5, md: 2 } }}
      data-testid="product-details-page-category-section"
    >
      <Stack spacing={1.5}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1}>
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {productsUiText.detailsPage.categoryTitle}
            </Typography>
            <Tooltip title={productsUiText.detailsPage.actions.edit}>
              <span>
                <IconButton
                  size="small"
                  disabled={
                    !isReadOnlyMode || isEditingDisabled || isCategoriesLoading || isCategoriesError
                  }
                  onClick={onEnterCategoryMode}
                  data-testid="product-details-page-category-edit-button"
                >
                  <EditOutlinedIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
        </Stack>

        {isCategoriesError ? (
          <Alert severity="warning" data-testid="product-details-page-category-load-error">
            {productsUiText.detailsPage.placeholders.categoriesUnavailable}
          </Alert>
        ) : null}

        {isCategoryEditMode ? (
          <Stack spacing={1.25}>
            <ProductCategorySelector
              tree={tree}
              flat={flat}
              selectedCategoryId={categoryDraftId}
              onChange={onChangeCategoryDraft}
              disabled={isInteractionsLocked}
              testIdPrefix="product-details-category-selector"
            />
            <Stack direction="row" spacing={1}>
              <Button
                variant="contained"
                disabled={!canSaveCategory}
                onClick={onSaveCategory}
                data-testid="product-details-page-save-category-button"
              >
                {productsUiText.detailsPage.actions.saveCategory}
              </Button>
              <Button
                onClick={onCancelCategory}
                disabled={isInteractionsLocked}
                data-testid="product-details-page-cancel-category-edit-button"
              >
                {productsUiText.detailsPage.actions.cancel}
              </Button>
            </Stack>
          </Stack>
        ) : (
          <Stack spacing={1} data-testid="product-details-page-category-readonly">
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <Typography sx={{ fontWeight: 700 }}>
                {productsUiText.detailsPage.labels.path}:
              </Typography>
              {categoryPathItems.length > 0 ? (
                <Typography
                  component={Link}
                  to={`/categories?selectedId=${encodeURIComponent(product.categoryId)}`}
                  sx={{
                    color: 'primary.main',
                    textDecoration: 'none',
                    '&:hover': { textDecoration: 'underline' },
                  }}
                  data-testid="product-details-page-category-path-link"
                >
                  {product.categoryPath || categoryPathItems.map((item) => item.name).join(' / ')}
                </Typography>
              ) : (
                <Typography color="text.secondary">-</Typography>
              )}
            </Stack>

            {categoryPathItems.length > 0 ? (
              <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap" useFlexGap>
                {categoryPathItems.map((item, index) => (
                  <Stack
                    key={`${item._id}-${index}`}
                    direction="row"
                    spacing={0.5}
                    alignItems="center"
                  >
                    <Chip size="small" label={item.name} />
                    {index < categoryPathItems.length - 1 ? (
                      <ChevronRightRoundedIcon fontSize="small" color="disabled" />
                    ) : null}
                  </Stack>
                ))}
              </Stack>
            ) : null}

            <Typography>
              <strong>{productsUiText.detailsPage.labels.root}:</strong>{' '}
              {product.rootCategory?.name ?? '-'}
            </Typography>
          </Stack>
        )}
      </Stack>
    </Paper>
  )
}
