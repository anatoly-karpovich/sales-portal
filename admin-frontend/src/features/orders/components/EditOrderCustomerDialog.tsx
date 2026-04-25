import { useMemo } from 'react'
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
import CloseIcon from '@mui/icons-material/Close'
import type { Customer } from '@/api/modules/customers.api'
import { ordersUiText } from '@/features/orders/orders.ui-text'

type Props = {
  open: boolean
  customers: Customer[]
  currentCustomerId: string
  selectedCustomerId: string
  isInitialLoading: boolean
  isUpdating: boolean
  isSubmitting: boolean
  onSearchChange: (value: string) => void
  onSelectCustomer: (customerId: string) => void
  onClose: () => void
  onSave: (customerId: string) => Promise<void> | void
}

function formatCustomerLabel(customer: Customer) {
  return `${customer.name} | ${customer.email}`
}

export function EditOrderCustomerDialog({
  open,
  customers,
  currentCustomerId,
  selectedCustomerId,
  isInitialLoading,
  isUpdating,
  isSubmitting,
  onSearchChange,
  onSelectCustomer,
  onClose,
  onSave,
}: Props) {
  const selectedCustomer = useMemo(
    () => customers.find((customer) => customer._id === selectedCustomerId) ?? null,
    [customers, selectedCustomerId],
  )

  const isSaveDisabled =
    isInitialLoading ||
    isSubmitting ||
    !selectedCustomerId ||
    selectedCustomerId === currentCustomerId

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
      data-testid="order-details-customer-edit-dialog"
    >
      <DialogTitle sx={{ pr: 6 }} data-testid="order-details-customer-edit-dialog-title">
        {ordersUiText.dialogs.details.editCustomerTitle}
        <IconButton
          aria-label="close"
          onClick={requestClose}
          disabled={isSubmitting}
          sx={{ position: 'absolute', right: 16, top: 12 }}
          data-testid="order-details-customer-edit-dialog-close-button"
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={2}>
          <Autocomplete
            options={customers}
            value={selectedCustomer}
            openOnFocus
            disableClearable
            forcePopupIcon={false}
            loading={isLoading}
            filterOptions={(options) => options}
            getOptionLabel={formatCustomerLabel}
            isOptionEqualToValue={(option, value) => option._id === value._id}
            onClose={() => {
              onSearchChange('')
            }}
            onChange={(_, customer) => {
              if (!customer) return
              onSelectCustomer(customer._id)
              onSearchChange('')
            }}
            onInputChange={(_, value, reason) => {
              if (reason === 'reset') return
              onSearchChange(value)
            }}
            noOptionsText={
              <Typography data-testid="order-details-customer-edit-list-empty" color="text.secondary">
                {ordersUiText.dialogs.details.editCustomerNoResults}
              </Typography>
            }
            loadingText={
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                data-testid="order-details-customer-edit-list-loading"
              >
                <CircularProgress size={16} />
                <Typography color="text.secondary">
                  {ordersUiText.dialogs.details.editCustomerLoading}
                </Typography>
              </Stack>
            }
            slotProps={{
              popper: {
                sx: { zIndex: (theme) => theme.zIndex.modal + 1 },
              },
            }}
            renderOption={(props, customer, state) => {
              const { key, ...optionProps } = props
              return (
                <li key={key} {...optionProps} data-testid={`order-details-customer-edit-item-${state.index}`}>
                  <Stack spacing={0.25}>
                    <Typography
                      sx={{ whiteSpace: 'normal', wordBreak: 'break-word' }}
                      data-testid={`order-details-customer-edit-item-${state.index}-name`}
                    >
                      {customer.name}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ whiteSpace: 'normal', wordBreak: 'break-word' }}
                      data-testid={`order-details-customer-edit-item-${state.index}-email`}
                    >
                      {customer.email}
                    </Typography>
                  </Stack>
                </li>
              )
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label={ordersUiText.dialogs.details.editCustomerSearchLabel}
                placeholder={ordersUiText.dialogs.details.editCustomerSearchPlaceholder}
                disabled={isSubmitting}
                data-testid="order-details-customer-edit-search-input"
                inputProps={{
                  ...params.inputProps,
                  'data-testid': 'order-details-customer-edit-search-input-field',
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
          onClick={() => void onSave(selectedCustomerId)}
          disabled={isSaveDisabled}
          data-testid="order-details-customer-edit-save-button"
        >
          {isSubmitting ? (
            <CircularProgress size={18} color="inherit" />
          ) : (
            ordersUiText.dialogs.details.editCustomerSave
          )}
        </Button>
        <Button
          onClick={requestClose}
          disabled={isSubmitting}
          data-testid="order-details-customer-edit-cancel-button"
        >
          {ordersUiText.dialogs.cancel}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
