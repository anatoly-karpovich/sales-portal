import { useMemo } from 'react'
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
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
  isLoading: boolean
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
  isLoading,
  isSubmitting,
  onSearchChange,
  onSelectCustomer,
  onClose,
  onSave,
}: Props) {
  const sortedCustomers = useMemo(() => {
    return [...customers].sort((a, b) => {
      const byName = a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
      if (byName !== 0) return byName
      return a.email.localeCompare(b.email, undefined, { sensitivity: 'base' })
    })
  }, [customers])

  const normalizedSearch = search.trim().toLowerCase()
  const filteredCustomers = useMemo(() => {
    if (!normalizedSearch) {
      return sortedCustomers
    }

    return sortedCustomers.filter((customer) => {
      const searchText = `${customer.name} ${customer.email}`.toLowerCase()
      return searchText.includes(normalizedSearch)
    })
  }, [normalizedSearch, sortedCustomers])

  const isSaveDisabled =
    isLoading ||
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
            disabled={isLoading || isSubmitting}
            data-testid="order-details-customer-edit-search-input"
            inputProps={{ 'data-testid': 'order-details-customer-edit-search-input-field' }}
          />

          <Paper
            variant="outlined"
            sx={{ maxHeight: 320, overflowY: 'auto' }}
            data-testid="order-details-customer-edit-list"
          >
            {isLoading ? (
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
            ) : filteredCustomers.length === 0 ? (
              <Typography sx={{ py: 3, px: 2 }} color="text.secondary" data-testid="order-details-customer-edit-list-empty">
                {ordersUiText.dialogs.details.editCustomerNoResults}
              </Typography>
            ) : (
              <List disablePadding>
                {filteredCustomers.map((customer, index) => (
                  <ListItemButton
                    key={customer._id}
                    selected={selectedCustomerId === customer._id}
                    onClick={() => onSelectCustomer(customer._id)}
                    disabled={isSubmitting}
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
