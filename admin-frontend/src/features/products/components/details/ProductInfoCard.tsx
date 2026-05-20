import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import { Box, IconButton, Paper, Stack, Tooltip, Typography } from '@mui/material'
import type { Product } from '@/api/modules/products.api'
import noImageProduct from '@/assets/no-image-product.jpeg'
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
  const parentImageUrl = product.imageUrl?.trim() || noImageProduct

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
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems="flex-start">
            <Box
              component="img"
              src={parentImageUrl}
              alt={product.name}
              sx={{
                width: 120,
                height: 120,
                borderRadius: 1.5,
                border: 1,
                borderColor: 'divider',
                objectFit: 'cover',
                flexShrink: 0,
              }}
            />
            <Stack spacing={0.75} sx={{ minWidth: 0 }}>
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
                <strong>Image URL:</strong> {product.imageUrl?.trim() || '-'}
              </Typography>
            </Stack>
          </Stack>
        )}
      </Stack>
    </Paper>
  )
}
