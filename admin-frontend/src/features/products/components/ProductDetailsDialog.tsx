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
  return (
    <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2.5} sx={{ py: 1.1 }}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <Box sx={{ color: 'primary.main', display: 'inline-flex' }}>{icon}</Box>
        <Typography component="strong" sx={{ fontWeight: 700 }}>
          {label}:
        </Typography>
      </Stack>
      <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'right', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
        {value ?? '-'}
      </Typography>
    </Stack>
  )
}

export function ProductDetailsDialog({ open, product, onClose, onEdit }: Props) {
  if (!product) return null

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ pr: 6 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Inventory2OutlinedIcon color="action" fontSize="small" />
          <Typography variant="h6" component="span" sx={{ fontWeight: 700 }}>
            {product.name} Details
          </Typography>
        </Stack>
        <IconButton aria-label="close" onClick={onClose} sx={{ position: 'absolute', right: 16, top: 12 }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ px: 4, py: 2.5 }}>
        <Stack spacing={0.45}>
          <DetailsRow label="Name" value={product.name} icon={<SellOutlinedIcon fontSize="small" />} />
          <DetailsRow label="Amount" value={product.amount} icon={<InventoryOutlinedIcon fontSize="small" />} />
          <DetailsRow label="Price" value={product.price} icon={<PaidOutlinedIcon fontSize="small" />} />
          <DetailsRow label="Manufacturer" value={product.manufacturer} icon={<FactoryOutlinedIcon fontSize="small" />} />
          <DetailsRow label="Created On" value={formatDateTime(product.createdOn)} icon={<CalendarMonthOutlinedIcon fontSize="small" />} />
          <DetailsRow label="Notes" value={product.notes?.trim() ? product.notes : '-'} icon={<NotesOutlinedIcon fontSize="small" />} />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 4, py: 2 }}>
        <Box sx={{ flexGrow: 1 }} />
        <Button
          variant="contained"
          onClick={() => {
            onClose()
            onEdit(product)
          }}
        >
          Edit Product
        </Button>
        <Button onClick={onClose}>Cancel</Button>
      </DialogActions>
    </Dialog>
  )
}
