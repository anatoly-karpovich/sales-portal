import CloseIcon from '@mui/icons-material/Close'
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  LinearProgress,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import type { User } from '@/api/modules/users.api'
import { ordersUiText } from '@/features/orders/orders.ui-text'

type Props = {
  open: boolean
  managers: User[]
  currentManagerId: string | null
  search: string
  selectedManagerId: string
  isInitialLoading: boolean
  isUpdating: boolean
  isSubmitting: boolean
  onSearchChange: (value: string) => void
  onSelectManager: (managerId: string) => void
  onClose: () => void
  onSave: (managerId: string) => Promise<void> | void
}

function resolveManagerName(manager: User) {
  const fullName = `${manager.firstName ?? ''} ${manager.lastName ?? ''}`.trim()
  return fullName || manager.username
}

export function AssignManagerDialog({
  open,
  managers,
  currentManagerId,
  search,
  selectedManagerId,
  isInitialLoading,
  isUpdating,
  isSubmitting,
  onSearchChange,
  onSelectManager,
  onClose,
  onSave,
}: Props) {
  const isSaveDisabled =
    isInitialLoading ||
    isSubmitting ||
    !selectedManagerId ||
    selectedManagerId === currentManagerId

  return (
    <Dialog
      open={open}
      onClose={isSubmitting ? undefined : onClose}
      fullWidth
      maxWidth="sm"
      data-testid="order-details-assign-manager-dialog"
    >
      <DialogTitle sx={{ pr: 6 }} data-testid="order-details-assign-manager-dialog-title">
        {currentManagerId
          ? ordersUiText.dialogs.details.editAssignedManagerTitle
          : ordersUiText.dialogs.details.assignManagerTitle}
        <IconButton
          aria-label="close"
          onClick={onClose}
          disabled={isSubmitting}
          sx={{ position: 'absolute', right: 16, top: 12 }}
          data-testid="order-details-assign-manager-close-button"
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={2}>
          <TextField
            label={ordersUiText.dialogs.details.assignManagerSearchLabel}
            placeholder={ordersUiText.dialogs.details.assignManagerSearchPlaceholder}
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            disabled={isInitialLoading || isSubmitting}
            data-testid="order-details-assign-manager-search-input"
            inputProps={{ 'data-testid': 'order-details-assign-manager-search-input-field' }}
          />

          <Paper
            variant="outlined"
            sx={{ maxHeight: 320, overflowY: 'auto', position: 'relative' }}
            data-testid="order-details-assign-manager-list"
          >
            {isUpdating && managers.length > 0 ? (
              <LinearProgress
                sx={{ position: 'sticky', top: 0, left: 0, right: 0, zIndex: 1 }}
                data-testid="order-details-assign-manager-list-updating"
              />
            ) : null}

            {isInitialLoading ? (
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                justifyContent="center"
                sx={{ py: 4 }}
                data-testid="order-details-assign-manager-list-loading"
              >
                <CircularProgress size={18} />
                <Typography color="text.secondary">
                  {ordersUiText.dialogs.details.assignManagerLoading}
                </Typography>
              </Stack>
            ) : managers.length === 0 ? (
              <Typography
                sx={{ py: 3, px: 2 }}
                color="text.secondary"
                data-testid="order-details-assign-manager-list-empty"
              >
                {ordersUiText.dialogs.details.assignManagerNoResults}
              </Typography>
            ) : (
              <List disablePadding>
                {managers.map((manager, index) => (
                  <ListItemButton
                    key={manager._id}
                    selected={selectedManagerId === manager._id}
                    onClick={() => onSelectManager(manager._id)}
                    disabled={isSubmitting || isInitialLoading}
                    data-testid={`order-details-assign-manager-item-${index}`}
                  >
                    <ListItemText
                      primary={
                        <Typography sx={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
                          {resolveManagerName(manager)} ({manager.username})
                        </Typography>
                      }
                    />
                  </ListItemButton>
                ))}
              </List>
            )}
          </Paper>
        </Stack>
      </DialogContent>

      <DialogActions>
        <Box sx={{ flexGrow: 1 }} />
        <Button
          variant="contained"
          onClick={() => void onSave(selectedManagerId)}
          disabled={isSaveDisabled}
          data-testid="order-details-assign-manager-save-button"
        >
          {isSubmitting ? <CircularProgress size={18} color="inherit" /> : ordersUiText.dialogs.details.assignManagerSave}
        </Button>
        <Button
          onClick={onClose}
          disabled={isSubmitting}
          data-testid="order-details-assign-manager-cancel-button"
        >
          {ordersUiText.dialogs.cancel}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
