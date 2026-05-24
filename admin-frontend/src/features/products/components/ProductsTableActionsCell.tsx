import { IconButton, Stack, Tooltip } from '@mui/material'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined'
import type { Product } from '@/api/modules/products.api'
import { productsUiText } from '@/features/products/products.ui-text'

type Props = {
  product: Product
  onView: (product: Product) => void
  onDelete: (product: Product) => void
}

export function ProductsTableActionsCell({ product, onView, onDelete }: Props) {
  const detailsLabel =
    product.setup?.completed === false
      ? productsUiText.listPage.actions.continueSetup
      : productsUiText.listPage.actions.details

  return (
    <Stack
      direction="row"
      spacing={0.5}
      justifyContent="flex-end"
      data-testid="products-table-actions-cell"
    >
      <Tooltip title={detailsLabel}>
        <IconButton
          size="small"
          onClick={() => onView(product)}
          data-testid={
            product.setup?.completed === false
              ? 'products-table-continue-setup-button'
              : 'products-table-details-button'
          }
        >
          <VisibilityOutlinedIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title={productsUiText.listPage.actions.delete}>
        <IconButton
          size="small"
          color="error"
          onClick={() => onDelete(product)}
          data-testid="products-table-delete-button"
        >
          <DeleteOutlineOutlinedIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Stack>
  )
}
