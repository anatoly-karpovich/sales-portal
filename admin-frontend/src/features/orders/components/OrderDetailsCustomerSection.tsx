import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import {
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useEffect, useMemo, useState } from 'react'
import type { Customer } from '@/api/modules/customers.api'
import type { OrderDetails } from '@/api/modules/orders.api'
import { ORDER_DETAILS_SEARCH_DEBOUNCE_MS } from '@/features/orders/config/orderDetails.config'
import { useOrderCustomerOptionsQuery } from '@/features/orders/hooks/useOrdersQuery'
import { ordersUiText } from '@/features/orders/orders.ui-text'

type OrderDetailsCustomerSectionProps = {
  order: OrderDetails
  isCustomerEditable: boolean
  isCustomerEditMode: boolean
  isCustomerEditSavePending: boolean
  isEmbedded?: boolean
  onStartCustomerEdit: () => void
  onCancelCustomerEdit: () => void
  onSaveCustomerEdit: (payload: { customer: string }) => Promise<boolean> | boolean
}

type InlineCustomerEditorProps = {
  order: OrderDetails
  isSubmitting: boolean
  onCancel: () => void
  onSave: (payload: { customer: string }) => Promise<boolean> | boolean
}

function normalizeValue(value: string | number | null | undefined) {
  if (value === null || value === undefined) return '-'
  if (typeof value === 'string' && value.trim().length === 0) return '-'
  return String(value)
}

function formatAddress(order: OrderDetails) {
  const apartmentPart = typeof order.customer.apartment === 'number' ? `, Apt ${order.customer.apartment}` : ''
  return `${order.customer.house} ${order.customer.street}${apartmentPart}, ${order.customer.city}, ${order.customer.state} ${order.customer.zipCode}`
}

function formatCustomerLabel(customer: Customer) {
  return `${customer.name} | ${customer.email}`
}

function InlineCustomerEditor({
  order,
  isSubmitting,
  onCancel,
  onSave,
}: InlineCustomerEditorProps) {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedCustomerId, setSelectedCustomerId] = useState(order.customer._id)

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearch(search.trim())
    }, ORDER_DETAILS_SEARCH_DEBOUNCE_MS)
    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [search])

  const customerOptionsQuery = useOrderCustomerOptionsQuery(debouncedSearch, true)
  const availableCustomers = useMemo(() => {
    const customers = customerOptionsQuery.data?.Customers ?? []
    if (customers.some((customer) => customer._id === order.customer._id)) {
      return customers
    }

    const fallbackCurrentCustomer: Customer = {
      _id: order.customer._id,
      email: order.customer.email,
      name: order.customer.name,
      state: order.customer.state,
      city: order.customer.city,
      street: order.customer.street,
      house: order.customer.house,
      apartment: order.customer.apartment,
      zipCode: order.customer.zipCode,
      phone: order.customer.phone,
      notes: order.customer.notes,
      createdOn: order.customer.createdOn,
    }

    return [fallbackCurrentCustomer, ...customers]
  }, [customerOptionsQuery.data?.Customers, order.customer])

  const selectedCustomer = useMemo(
    () => availableCustomers.find((customer) => customer._id === selectedCustomerId) ?? null,
    [availableCustomers, selectedCustomerId],
  )
  const isSaveDisabled =
    (customerOptionsQuery.isLoading && availableCustomers.length === 0) ||
    isSubmitting ||
    !selectedCustomerId ||
    selectedCustomerId === order.customer._id

  return (
    <Paper
      variant="outlined"
      sx={{ p: 1.25, borderColor: 'divider' }}
      data-testid="order-details-customer-inline-edit-mode"
    >
      <Stack spacing={1.25}>
        <Autocomplete
          options={availableCustomers}
          value={selectedCustomer}
          openOnFocus
          disableClearable
          forcePopupIcon={false}
          loading={customerOptionsQuery.isLoading || customerOptionsQuery.isFetching}
          filterOptions={(options) => options}
          getOptionLabel={formatCustomerLabel}
          isOptionEqualToValue={(option, value) => option._id === value._id}
          onClose={() => setSearch('')}
          onChange={(_, customer) => {
            if (!customer) return
            setSelectedCustomerId(customer._id)
            setSearch('')
          }}
          onInputChange={(_, value, reason) => {
            if (reason === 'reset') return
            setSearch(value)
          }}
          noOptionsText={
            <Typography data-testid="order-details-customer-inline-list-empty" color="text.secondary">
              {ordersUiText.dialogs.details.editCustomerNoResults}
            </Typography>
          }
          loadingText={
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              data-testid="order-details-customer-inline-list-loading"
            >
              <CircularProgress size={16} />
              <Typography color="text.secondary">
                {ordersUiText.dialogs.details.editCustomerLoading}
              </Typography>
            </Stack>
          }
          renderOption={(props, customer, state) => {
            const { key, ...optionProps } = props
            return (
              <li key={key} {...optionProps} data-testid={`order-details-customer-inline-item-${state.index}`}>
                <Stack spacing={0.25}>
                  <Typography
                    sx={{ whiteSpace: 'normal', wordBreak: 'break-word' }}
                    data-testid={`order-details-customer-inline-item-${state.index}-name`}
                  >
                    {customer.name}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ whiteSpace: 'normal', wordBreak: 'break-word' }}
                    data-testid={`order-details-customer-inline-item-${state.index}-email`}
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
              data-testid="order-details-customer-inline-search-input"
              inputProps={{
                ...params.inputProps,
                'data-testid': 'order-details-customer-inline-search-input-field',
              }}
            />
          )}
        />

        <Stack direction="row" spacing={1} justifyContent="flex-end">
          <Button
            variant="contained"
            onClick={() => void onSave({ customer: selectedCustomerId })}
            disabled={isSaveDisabled}
            data-testid="order-details-customer-inline-save-button"
          >
            {isSubmitting ? <CircularProgress size={18} color="inherit" /> : ordersUiText.dialogs.details.editCustomerSave}
          </Button>
          <Button
            variant="outlined"
            onClick={onCancel}
            disabled={isSubmitting}
            data-testid="order-details-customer-inline-cancel-button"
          >
            {ordersUiText.dialogs.cancel}
          </Button>
        </Stack>
      </Stack>
    </Paper>
  )
}

export function OrderDetailsCustomerSection({
  order,
  isCustomerEditable,
  isCustomerEditMode,
  isCustomerEditSavePending,
  isEmbedded = false,
  onStartCustomerEdit,
  onCancelCustomerEdit,
  onSaveCustomerEdit,
}: OrderDetailsCustomerSectionProps) {
  const customerValueSx = {
    maxWidth: '100%',
    whiteSpace: 'pre-wrap',
    overflowWrap: 'anywhere',
    wordBreak: 'break-word',
  }
  const rootSx = { p: { xs: 2, md: 2.5 } }
  const content = (
    <Stack spacing={2}>
      <Stack direction="row" alignItems="center" gap={0.5}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          {ordersUiText.detailsPage.labels.customerDetails}
        </Typography>
        {isCustomerEditable && !isCustomerEditMode ? (
          <IconButton
            size="small"
            onClick={onStartCustomerEdit}
            data-testid="order-details-customer-edit-trigger"
            aria-label="edit customer"
          >
            <EditOutlinedIcon fontSize="small" />
          </IconButton>
        ) : null}
      </Stack>

      <Box
        sx={{
          display: 'grid',
          gap: 1.1,
          gridTemplateColumns: '110px minmax(0, 1fr)',
        }}
      >
        <Typography color="text.secondary">Name</Typography>
        <Typography data-testid="order-details-customer-name-value" sx={customerValueSx}>
          {normalizeValue(order.customer.name)}
        </Typography>

        <Typography color="text.secondary">Email</Typography>
        <Typography data-testid="order-details-customer-email-value" sx={customerValueSx}>
          {normalizeValue(order.customer.email)}
        </Typography>

        <Typography color="text.secondary">Phone</Typography>
        <Typography data-testid="order-details-customer-phone-value" sx={customerValueSx}>
          {normalizeValue(order.customer.phone)}
        </Typography>

        <Typography color="text.secondary">Address</Typography>
        <Typography data-testid="order-details-customer-address-value" sx={customerValueSx}>
          {formatAddress(order)}
        </Typography>

        <Typography color="text.secondary">Notes</Typography>
        <Typography data-testid="order-details-customer-notes-value" sx={customerValueSx}>
          {normalizeValue(order.customer.notes)}
        </Typography>
      </Box>

      {isCustomerEditMode ? (
        <InlineCustomerEditor
          order={order}
          isSubmitting={isCustomerEditSavePending}
          onCancel={onCancelCustomerEdit}
          onSave={onSaveCustomerEdit}
        />
      ) : null}
    </Stack>
  )

  if (isEmbedded) {
    return (
      <Stack sx={rootSx} data-testid="order-details-customer-section">
        {content}
      </Stack>
    )
  }

  return (
    <Paper sx={rootSx} data-testid="order-details-customer-section">
      {content}
    </Paper>
  )
}
