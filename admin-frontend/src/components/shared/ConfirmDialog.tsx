import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Typography,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined'
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined'

type Props = {
  open: boolean
  title: string
  message: string | string[]
  confirmLabel?: string
  confirmColor?: 'error' | 'primary' | 'success' | 'warning' | 'info'
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
  confirmColor = 'error',
  cancelLabel = 'Cancel',
  isSubmitting = false,
  onCancel,
  onConfirm,
}: Props) {
  const messageLines = Array.isArray(message) ? message : message.split('\n')

  return (
    <Dialog
      open={open}
      onClose={isSubmitting ? undefined : onCancel}
      fullWidth
      maxWidth="xs"
      data-testid="confirm-dialog"
    >
      <DialogTitle sx={{ pr: 6 }} data-testid="confirm-dialog-title-section">
        <Stack
          direction="row"
          alignItems="center"
          spacing={1}
          data-testid="confirm-dialog-title-row"
        >
          <DeleteOutlineOutlinedIcon color="action" fontSize="small" />
          <Typography
            variant="h6"
            component="span"
            sx={{ fontWeight: 700 }}
            data-testid="confirm-dialog-title-text"
          >
            {title}
          </Typography>
        </Stack>
        <IconButton
          aria-label="close"
          onClick={onCancel}
          disabled={isSubmitting}
          sx={{ position: 'absolute', right: 16, top: 12 }}
          data-testid="confirm-dialog-close-button"
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ px: 3, py: 2.5 }} data-testid="confirm-dialog-content">
        <Stack spacing={0.75} data-testid="confirm-dialog-message">
          {messageLines.map((line, index) => {
            const normalizedLine = line.trim().toLowerCase()

            if (normalizedLine.length === 0) {
              return (
              <Box key={`confirm-dialog-message-space-${index}`} sx={{ height: 4 }} />
              )
            }

            if (normalizedLine === 'please note:') {
              return (
                <Stack
                  key={`confirm-dialog-message-line-${index}`}
                  direction="row"
                  spacing={0.75}
                  alignItems="center"
                >
                  <WarningAmberOutlinedIcon sx={{ color: 'warning.main', fontSize: 18 }} />
                  <Typography sx={{ fontWeight: 700 }}>{line}</Typography>
                </Stack>
              )
            }

            return (
              <Typography key={`confirm-dialog-message-line-${index}`}>{line}</Typography>
            )
          })}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }} data-testid="confirm-dialog-actions">
        <Box sx={{ flexGrow: 1 }} />
        <Button
          color={confirmColor}
          variant="contained"
          onClick={() => void onConfirm()}
          disabled={isSubmitting}
          data-testid="confirm-dialog-confirm-button"
        >
          {isSubmitting ? <CircularProgress size={18} color="inherit" /> : confirmLabel}
        </Button>
        <Button
          onClick={onCancel}
          disabled={isSubmitting}
          data-testid="confirm-dialog-cancel-button"
        >
          {cancelLabel}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
