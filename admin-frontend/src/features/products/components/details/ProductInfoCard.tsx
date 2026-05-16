import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import { Chip, IconButton, Paper, Stack, Tooltip, Typography } from '@mui/material'
import type { Product } from '@/api/modules/products.api'
import type { ProductVariantsDraft } from '@/features/products/forms/productVariantsDraft'
import { productsUiText } from '@/features/products/products.ui-text'
import { ProductInfoEditForm } from '@/features/products/components/details/ProductInfoEditForm'

type Props = {
  product: Product
  draft: ProductVariantsDraft | null
  manufacturerOptions: string[]
  isInfoEditMode: boolean
  isReadOnlyMode: boolean
  isEditingDisabled: boolean
  isParentImageValid: boolean
  canSaveInfo: boolean
  isInteractionsLocked: boolean
  onEnterInfoMode: () => void
  onChangeField: (
    field: 'name' | 'manufacturer' | 'description' | 'imageUrl',
    value: string,
  ) => void
  onSaveInfo: () => void
  onCancelInfo: () => void
}

export function ProductInfoCard({
  product,
  draft,
  manufacturerOptions,
  isInfoEditMode,
  isReadOnlyMode,
  isEditingDisabled,
  isParentImageValid,
  canSaveInfo,
  isInteractionsLocked,
  onEnterInfoMode,
  onChangeField,
  onSaveInfo,
  onCancelInfo,
}: Props) {
  return (
    <Paper
      variant="outlined"
      sx={{ p: { xs: 1.5, md: 2 } }}
      data-testid="product-details-page-product-info-section"
    >
      <Stack spacing={1.5}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1}>
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {productsUiText.detailsPage.productInfoTitle}
            </Typography>
            <Tooltip title={productsUiText.detailsPage.actions.edit}>
              <span>
                <IconButton
                  size="small"
                  disabled={!isReadOnlyMode || isEditingDisabled}
                  onClick={onEnterInfoMode}
                  data-testid="product-details-page-product-info-edit-button"
                >
                  <EditOutlinedIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
        </Stack>

        {isInfoEditMode && draft ? (
          <ProductInfoEditForm
            draft={draft}
            manufacturerOptions={manufacturerOptions}
            isParentImageValid={isParentImageValid}
            canSaveInfo={canSaveInfo}
            isInteractionsLocked={isInteractionsLocked}
            onChangeField={onChangeField}
            onSave={onSaveInfo}
            onCancel={onCancelInfo}
          />
        ) : (
          <Stack spacing={1}>
            <Typography>
              <strong>Name:</strong> {product.name}
            </Typography>
            <Typography>
              <strong>Manufacturer:</strong> {product.manufacturer}
            </Typography>
            <Typography>
              <strong>Description:</strong> {product.description?.trim() || '-'}
            </Typography>
            <Typography>
              <strong>Image:</strong> {product.imageUrl?.trim() || '-'}
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <Typography sx={{ fontWeight: 700 }}>Attributes:</Typography>
              {product.attributes.length === 0 ? (
                <Typography color="text.secondary">No attributes</Typography>
              ) : (
                product.attributes.map((attribute) => (
                  <Chip
                    key={attribute.key}
                    label={`${attribute.name}: ${attribute.values.join(', ')}`}
                    size="small"
                    variant="outlined"
                  />
                ))
              )}
            </Stack>
          </Stack>
        )}
      </Stack>
    </Paper>
  )
}
