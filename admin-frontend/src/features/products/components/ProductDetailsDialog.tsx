import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Typography,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined'
import SellOutlinedIcon from '@mui/icons-material/SellOutlined'
import InventoryOutlinedIcon from '@mui/icons-material/InventoryOutlined'
import PaidOutlinedIcon from '@mui/icons-material/PaidOutlined'
import FactoryOutlinedIcon from '@mui/icons-material/FactoryOutlined'
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined'
import NotesOutlinedIcon from '@mui/icons-material/NotesOutlined'
import type { ReactNode } from 'react'
import type { Product } from '@/api/modules/products.api'
import { formatDateTime } from '@/utils/date'

type Props = {
  open: boolean
  product: Product | null
  onClose: () => void
  onEdit: (product: Product) => void
}

function DetailsRow({ label, value, icon }: { label: string; value: ReactNode; icon: ReactNode }) {
  const rowTestId = `product-details-${label.toLowerCase().replace(/\s+/g, '-')}-row`
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 190px) minmax(0, 1fr)',
        alignItems: 'start',
        columnGap: 1.5,
        py: 1.1,
      }}
      data-testid={rowTestId}
    >
      <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }} data-testid={`${rowTestId}-label`}>
        <Box sx={{ color: 'primary.main', display: 'inline-flex', flexShrink: 0 }}>{icon}</Box>
        <Typography component="strong" sx={{ fontWeight: 700 }}>
          {label}:
        </Typography>
      </Stack>
      <Typography
        variant="body1"
        color="text.secondary"
        sx={{ textAlign: 'right', pl: 0.5, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', wordBreak: 'break-word' }}
        data-testid={`${rowTestId}-value`}
      >
        {value ?? '-'}
      </Typography>
    </Box>
  )
}

export function ProductDetailsDialog({ open, product, onClose, onEdit }: Props) {
  if (!product) return null

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" data-testid="product-details-dialog">
      <DialogTitle sx={{ px: 4.5, pr: 6 }} data-testid="product-details-dialog-title-section">
        <Stack direction="row" alignItems="center" spacing={1} data-testid="product-details-dialog-title-row">
          <Inventory2OutlinedIcon color="action" fontSize="small" />
          <Typography variant="h6" component="span" sx={{ fontWeight: 700 }} data-testid="product-details-dialog-title-text">
            {product.name} Details
          </Typography>
        </Stack>
        <IconButton aria-label="close" onClick={onClose} sx={{ position: 'absolute', right: 16, top: 12 }} data-testid="product-details-dialog-close-button">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ px: 4.5, py: 2.5 }} data-testid="product-details-dialog-content">
        <Stack spacing={0.45} data-testid="product-details-dialog-rows">
          <DetailsRow label="Name" value={product.name} icon={<SellOutlinedIcon fontSize="small" />} />
          <DetailsRow label="Amount" value={product.amount} icon={<InventoryOutlinedIcon fontSize="small" />} />
          <DetailsRow label="Price" value={product.price} icon={<PaidOutlinedIcon fontSize="small" />} />
          <DetailsRow label="Manufacturer" value={product.manufacturer} icon={<FactoryOutlinedIcon fontSize="small" />} />
          <DetailsRow label="Created On" value={formatDateTime(product.createdOn)} icon={<CalendarMonthOutlinedIcon fontSize="small" />} />
          <DetailsRow label="Notes" value={product.notes?.trim() ? product.notes : '-'} icon={<NotesOutlinedIcon fontSize="small" />} />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 4.5, py: 2 }} data-testid="product-details-dialog-actions">
        <Box sx={{ flexGrow: 1 }} />
        <Button
          variant="contained"
          onClick={() => {
            onClose()
            onEdit(product)
          }}
          data-testid="product-details-dialog-edit-button"
        >
          Edit Product
        </Button>
        <Button onClick={onClose} data-testid="product-details-dialog-cancel-button">Cancel</Button>
      </DialogActions>
    </Dialog>
  )
}
