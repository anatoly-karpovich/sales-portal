import { Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Stack, Typography } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined'

type Props = {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  isSubmitting?: boolean
  onCancel: () => void
  onConfirm: () => Promise<void> | void
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isSubmitting = false,
  onCancel,
  onConfirm,
}: Props) {
  return (
    <Dialog open={open} onClose={isSubmitting ? undefined : onCancel} fullWidth maxWidth="xs">
      <DialogTitle sx={{ pr: 6 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <DeleteOutlineOutlinedIcon color="action" fontSize="small" />
          <Typography variant="h6" component="span" sx={{ fontWeight: 700 }}>
            {title}
          </Typography>
        </Stack>
        <IconButton
          aria-label="close"
          onClick={onCancel}
          disabled={isSubmitting}
          sx={{ position: 'absolute', right: 16, top: 12 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ px: 3, py: 2.5 }}>
        <Typography>{message}</Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Box sx={{ flexGrow: 1 }} />
        <Button color="error" variant="contained" onClick={() => void onConfirm()} disabled={isSubmitting}>
          {isSubmitting ? <CircularProgress size={18} color="inherit" /> : confirmLabel}
        </Button>
        <Button onClick={onCancel} disabled={isSubmitting}>
          {cancelLabel}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
