import { useMemo } from 'react'
import CloseIcon from '@mui/icons-material/Close'
import {
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
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

function formatManagerLabel(manager: User) {
  return `${resolveManagerName(manager)} (${manager.username})`
}

export function AssignManagerDialog({
  open,
  managers,
  currentManagerId,
  selectedManagerId,
  isInitialLoading,
  isUpdating,
  isSubmitting,
  onSearchChange,
  onSelectManager,
  onClose,
  onSave,
}: Props) {
  const selectedManager = useMemo(
    () => managers.find((manager) => manager._id === selectedManagerId) ?? null,
    [managers, selectedManagerId],
  )

  const isSaveDisabled =
    isInitialLoading ||
    isSubmitting ||
    !selectedManagerId ||
    selectedManagerId === currentManagerId

  const isLoading = isInitialLoading || isUpdating
  const requestClose = () => {
    onSearchChange('')
    onClose()
  }

  return (
    <Dialog
      open={open}
      onClose={isSubmitting ? undefined : requestClose}
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
          onClick={requestClose}
          disabled={isSubmitting}
          sx={{ position: 'absolute', right: 16, top: 12 }}
          data-testid="order-details-assign-manager-close-button"
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={2}>
          <Autocomplete
            options={managers}
            value={selectedManager}
            openOnFocus
            disableClearable
            forcePopupIcon={false}
            loading={isLoading}
            filterOptions={(options) => options}
            getOptionLabel={formatManagerLabel}
            isOptionEqualToValue={(option, value) => option._id === value._id}
            onClose={() => {
              onSearchChange('')
            }}
            onChange={(_, manager) => {
              if (!manager) return
              onSelectManager(manager._id)
              onSearchChange('')
            }}
            onInputChange={(_, value, reason) => {
              if (reason === 'reset') return
              onSearchChange(value)
            }}
            noOptionsText={
              <Typography data-testid="order-details-assign-manager-list-empty" color="text.secondary">
                {ordersUiText.dialogs.details.assignManagerNoResults}
              </Typography>
            }
            loadingText={
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                data-testid="order-details-assign-manager-list-loading"
              >
                <CircularProgress size={16} />
                <Typography color="text.secondary">
                  {ordersUiText.dialogs.details.assignManagerLoading}
                </Typography>
              </Stack>
            }
            slotProps={{
              popper: {
                sx: { zIndex: (theme) => theme.zIndex.modal + 1 },
              },
            }}
            renderOption={(props, manager, state) => {
              const { key, ...optionProps } = props
              return (
                <li key={key} {...optionProps} data-testid={`order-details-assign-manager-item-${state.index}`}>
                  <Typography sx={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
                    {formatManagerLabel(manager)}
                  </Typography>
                </li>
              )
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label={ordersUiText.dialogs.details.assignManagerSearchLabel}
                placeholder={ordersUiText.dialogs.details.assignManagerSearchPlaceholder}
                disabled={isSubmitting}
                data-testid="order-details-assign-manager-search-input"
                inputProps={{
                  ...params.inputProps,
                  'data-testid': 'order-details-assign-manager-search-input-field',
                }}
              />
            )}
          />
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
          {isSubmitting ? (
            <CircularProgress size={18} color="inherit" />
          ) : (
            ordersUiText.dialogs.details.assignManagerSave
          )}
        </Button>
        <Button
          onClick={requestClose}
          disabled={isSubmitting}
          data-testid="order-details-assign-manager-cancel-button"
        >
          {ordersUiText.dialogs.cancel}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
