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
import CloseIcon from '@mui/icons-material/Close'
import type { Customer } from '@/api/modules/customers.api'
import { ordersUiText } from '@/features/orders/orders.ui-text'

type Props = {
  open: boolean
  customers: Customer[]
  currentCustomerId: string
  search: string
  selectedCustomerId: string
  isInitialLoading: boolean
  isUpdating: boolean
  isSubmitting: boolean
  onSearchChange: (value: string) => void
  onSelectCustomer: (customerId: string) => void
  onClose: () => void
  onSave: (customerId: string) => Promise<void> | void
}

export function EditOrderCustomerDialog({
  open,
  customers,
  currentCustomerId,
  search,
  selectedCustomerId,
  isInitialLoading,
  isUpdating,
  isSubmitting,
  onSearchChange,
  onSelectCustomer,
  onClose,
  onSave,
}: Props) {
  const isSaveDisabled =
    isInitialLoading ||
    isSubmitting ||
    !selectedCustomerId ||
    selectedCustomerId === currentCustomerId

  return (
    <Dialog
      open={open}
      onClose={isSubmitting ? undefined : onClose}
      fullWidth
      maxWidth="sm"
      data-testid="order-details-customer-edit-dialog"
    >
      <DialogTitle sx={{ pr: 6 }} data-testid="order-details-customer-edit-dialog-title">
        {ordersUiText.dialogs.details.editCustomerTitle}
        <IconButton
          aria-label="close"
          onClick={onClose}
          disabled={isSubmitting}
          sx={{ position: 'absolute', right: 16, top: 12 }}
          data-testid="order-details-customer-edit-dialog-close-button"
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={2}>
          <TextField
            label={ordersUiText.dialogs.details.editCustomerSearchLabel}
            placeholder={ordersUiText.dialogs.details.editCustomerSearchPlaceholder}
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            disabled={isInitialLoading || isSubmitting}
            data-testid="order-details-customer-edit-search-input"
            inputProps={{ 'data-testid': 'order-details-customer-edit-search-input-field' }}
          />

          <Paper
            variant="outlined"
            sx={{ maxHeight: 320, overflowY: 'auto', position: 'relative' }}
            data-testid="order-details-customer-edit-list"
          >
            {isUpdating && customers.length > 0 ? (
              <LinearProgress
                sx={{ position: 'sticky', top: 0, left: 0, right: 0, zIndex: 1 }}
                data-testid="order-details-customer-edit-list-updating"
              />
            ) : null}

            {isInitialLoading ? (
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                justifyContent="center"
                sx={{ py: 4 }}
                data-testid="order-details-customer-edit-list-loading"
              >
                <CircularProgress size={18} />
                <Typography color="text.secondary">
                  {ordersUiText.dialogs.details.editCustomerLoading}
                </Typography>
              </Stack>
            ) : customers.length === 0 ? (
              <Typography sx={{ py: 3, px: 2 }} color="text.secondary" data-testid="order-details-customer-edit-list-empty">
                {ordersUiText.dialogs.details.editCustomerNoResults}
              </Typography>
            ) : (
              <List disablePadding>
                {customers.map((customer, index) => (
                  <ListItemButton
                    key={customer._id}
                    selected={selectedCustomerId === customer._id}
                    onClick={() => onSelectCustomer(customer._id)}
                    disabled={isSubmitting || isInitialLoading}
                    data-testid={`order-details-customer-edit-item-${index}`}
                  >
                    <ListItemText
                      primary={
                        <Typography
                          sx={{ whiteSpace: 'normal', wordBreak: 'break-word' }}
                          data-testid={`order-details-customer-edit-item-${index}-name`}
                        >
                          {customer.name}
                        </Typography>
                      }
                      secondary={
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ whiteSpace: 'normal', wordBreak: 'break-word' }}
                          data-testid={`order-details-customer-edit-item-${index}-email`}
                        >
                          {customer.email}
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
          onClick={() => void onSave(selectedCustomerId)}
          disabled={isSaveDisabled}
          data-testid="order-details-customer-edit-save-button"
        >
          {isSubmitting ? <CircularProgress size={18} color="inherit" /> : ordersUiText.dialogs.details.editCustomerSave}
        </Button>
        <Button
          onClick={onClose}
          disabled={isSubmitting}
          data-testid="order-details-customer-edit-cancel-button"
        >
          {ordersUiText.dialogs.cancel}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
