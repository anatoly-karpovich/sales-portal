import KeyboardBackspaceRoundedIcon from '@mui/icons-material/KeyboardBackspaceRounded'
import { Button, Chip, Stack, Typography } from '@mui/material'
import { Link } from 'react-router-dom'
import type { Product } from '@/api/modules/products.api'
import { productsUiText } from '@/features/products/products.ui-text'
import { formatDate } from '@/utils/date'

type Props = {
  product: Product
  statusChipColor: 'success' | 'default' | 'warning'
  statusActionLabel: string
  manageInventoryLabel: string
  statusActionColor: 'success' | 'warning'
  isReadOnlyMode: boolean
  isEditingDisabled: boolean
  backLabel: string
  onStatusAction: () => void
  onDeleteProduct: () => void
}

export function ProductDetailsHeader({
  product,
  statusChipColor,
  statusActionLabel,
  manageInventoryLabel,
  statusActionColor,
  isReadOnlyMode,
  isEditingDisabled,
  backLabel,
  onStatusAction,
  onDeleteProduct,
}: Props) {
  return (
    <Stack spacing={1.5}>
      <Button
        component={Link}
        to="/products"
        variant="text"
        startIcon={<KeyboardBackspaceRoundedIcon fontSize="small" />}
        sx={{ alignSelf: 'flex-start', px: 0, textTransform: 'none' }}
        data-testid="product-details-page-back-link"
      >
        {backLabel}
      </Button>

      <Stack
        direction={{ xs: 'column', md: 'row' }}
        alignItems={{ xs: 'flex-start', md: 'center' }}
        justifyContent="space-between"
        gap={1.5}
      >
        <Stack spacing={0.5}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Typography
              variant="h4"
              sx={{ fontWeight: 700 }}
              data-testid="product-details-page-title"
            >
              {product.name}
            </Typography>
            <Chip label={product.status} color={statusChipColor} variant="outlined" />
            <Button
              color={statusActionColor}
              variant="outlined"
              disabled={!isReadOnlyMode || isEditingDisabled}
              onClick={onStatusAction}
              data-testid="product-details-page-status-action-button"
            >
              {statusActionLabel}
            </Button>
          </Stack>
          <Typography color="text.secondary" data-testid="product-details-page-meta">
            {product.manufacturer} | {product.categoryPath || '-'} |{' '}
            {productsUiText.detailsPage.metadata.created} {formatDate(product.createdOn)} |{' '}
            {productsUiText.detailsPage.metadata.updated} {formatDate(product.updatedOn)}
          </Typography>
        </Stack>

        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <Button
            component={Link}
            to={`/inventory/${product._id}`}
            variant="outlined"
            disabled={!isReadOnlyMode}
            data-testid="product-details-page-manage-inventory-button"
          >
            {manageInventoryLabel}
          </Button>
          <Button
            color="error"
            variant="contained"
            disabled={!isReadOnlyMode || isEditingDisabled}
            onClick={onDeleteProduct}
            data-testid="product-details-page-delete-product-button"
          >
            {productsUiText.detailsPage.actions.deleteProduct}
          </Button>
        </Stack>
      </Stack>
    </Stack>
  )
}
