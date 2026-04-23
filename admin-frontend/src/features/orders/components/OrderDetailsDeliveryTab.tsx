import { useMemo, useRef, useState } from 'react'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import type { OrderDelivery, OrderDetails } from '@/api/modules/orders.api'
import { COUNTRIES } from '@/constants/dictionaries'
import {
  ORDER_DETAILS_DELIVERY_MAX_DATE_OFFSET_DAYS,
  ORDER_DETAILS_DELIVERY_MIN_DATE_OFFSET_DAYS,
} from '@/features/orders/config/orderDetails.config'
import { ordersUiText } from '@/features/orders/orders.ui-text'
import { formatDate } from '@/utils/date'

type DeliveryConditionOption = 'Delivery' | 'Pickup'
type DeliveryLocationOption = 'Home' | 'Other'
type CountryOption = (typeof COUNTRIES)[number]

type DeliveryAddressFormState = {
  country: string
  city: string
  street: string
  house: string
  flat: string
}

type DeliveryFormState = {
  condition: DeliveryConditionOption
  location: DeliveryLocationOption
  finalDate: string
  address: DeliveryAddressFormState
}

type DeliveryFieldErrors = {
  finalDate: string | null
  country: string | null
  city: string | null
  street: string | null
  house: string | null
  flat: string | null
}

type DeliveryTouchedState = {
  finalDate: boolean
  country: boolean
  city: boolean
  street: boolean
  house: boolean
  flat: boolean
}

type OrderDetailsDeliveryTabProps = {
  order: OrderDetails
  isDeliveryEditable: boolean
  isDeliverySubmitting: boolean
  onSaveDelivery: (delivery: OrderDelivery) => Promise<boolean>
}

const DELIVERY_CONDITION_OPTIONS: DeliveryConditionOption[] = ['Delivery', 'Pickup']
const DELIVERY_LOCATION_OPTIONS: DeliveryLocationOption[] = ['Home', 'Other']

const PICKUP_ADDRESS_BY_COUNTRY: Record<
  CountryOption,
  Omit<DeliveryAddressFormState, 'country'>
> = {
  USA: {
    city: 'Jefferson City',
    street: 'John Daniel Drive',
    house: '381',
    flat: '2',
  },
  Canada: {
    city: 'Halifax',
    street: 'Higginsville Road',
    house: '563',
    flat: '24',
  },
  Belarus: {
    city: 'Vitebsk',
    street: 'Frunze',
    house: '22',
    flat: '20',
  },
  Ukraine: {
    city: 'Yalta',
    street: 'Leningradskaya',
    house: '55',
    flat: '1',
  },
  Germany: {
    city: 'Altendorf',
    street: 'Luebecker Strasse',
    house: '41',
    flat: '3',
  },
  France: {
    city: 'Le Bouscat',
    street: 'boulevard Aristide Briand',
    house: '99',
    flat: '56',
  },
  'Great Britain': {
    city: 'Mickletown',
    street: 'Winchester Rd',
    house: '20',
    flat: '44',
  },
  Russia: {
    city: 'Chelyabinsk',
    street: 'Grazhdanskaya',
    house: '14',
    flat: '101',
  },
}

const INITIAL_TOUCHED_STATE: DeliveryTouchedState = {
  finalDate: false,
  country: false,
  city: false,
  street: false,
  house: false,
  flat: false,
}

function normalizeTextValue(value: string | number | null | undefined) {
  if (value === null || value === undefined) return '-'
  if (typeof value === 'string' && value.trim().length === 0) return '-'
  return String(value)
}

function isCountryOption(value: string): value is CountryOption {
  return (COUNTRIES as readonly string[]).includes(value)
}

function toDateInputValue(value: string | null | undefined) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  return toDateInputValueFromDate(date)
}

function toDateInputValueFromDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function toDateInputAsLocalDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  if (Number.isNaN(date.getTime())) return null
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null
  }
  return date
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function addDays(date: Date, days: number) {
  const copy = new Date(date)
  copy.setDate(copy.getDate() + days)
  return copy
}

function resolveAllowedDeliveryDates(baseDate: Date) {
  const dayStart = startOfDay(baseDate)
  const minDate = addDays(dayStart, ORDER_DETAILS_DELIVERY_MIN_DATE_OFFSET_DAYS)
  const maxDate = addDays(dayStart, ORDER_DETAILS_DELIVERY_MAX_DATE_OFFSET_DAYS)
  return {
    minDate,
    maxDate,
    minDateInputValue: toDateInputValueFromDate(minDate),
    maxDateInputValue: toDateInputValueFromDate(maxDate),
  }
}

function resolveCustomerAddress(order: OrderDetails): DeliveryAddressFormState {
  return {
    country: order.customer.country,
    city: order.customer.city,
    street: order.customer.street,
    house: String(order.customer.house),
    flat: String(order.customer.flat),
  }
}

function resolvePickupAddressByCountry(country: string, fallbackAddress: DeliveryAddressFormState) {
  if (!isCountryOption(country)) {
    return fallbackAddress
  }

  return {
    country,
    city: PICKUP_ADDRESS_BY_COUNTRY[country].city,
    street: PICKUP_ADDRESS_BY_COUNTRY[country].street,
    house: PICKUP_ADDRESS_BY_COUNTRY[country].house,
    flat: PICKUP_ADDRESS_BY_COUNTRY[country].flat,
  }
}

function areAddressesEqual(left: DeliveryAddressFormState, right: DeliveryAddressFormState) {
  return (
    left.country === right.country &&
    left.city === right.city &&
    left.street === right.street &&
    left.house === right.house &&
    left.flat === right.flat
  )
}

function resolveDeliveryLocation(order: OrderDetails): DeliveryLocationOption {
  if (!order.delivery || order.delivery.condition !== 'Delivery') {
    return 'Home'
  }

  const customerAddress = resolveCustomerAddress(order)
  const deliveryAddress: DeliveryAddressFormState = {
    country: order.delivery.address.country,
    city: order.delivery.address.city,
    street: order.delivery.address.street,
    house: String(order.delivery.address.house),
    flat: String(order.delivery.address.flat),
  }

  return areAddressesEqual(customerAddress, deliveryAddress) ? 'Home' : 'Other'
}

function resolveInitialFormState(order: OrderDetails): DeliveryFormState {
  const customerAddress = resolveCustomerAddress(order)
  if (!order.delivery) {
    return {
      condition: 'Delivery',
      location: 'Home',
      finalDate: '',
      address: customerAddress,
    }
  }

  const condition = order.delivery.condition
  const finalDate = toDateInputValue(order.delivery.finalDate)
  if (condition === 'Pickup') {
    const addressFromDelivery: DeliveryAddressFormState = {
      country: order.delivery.address.country,
      city: order.delivery.address.city,
      street: order.delivery.address.street,
      house: String(order.delivery.address.house),
      flat: String(order.delivery.address.flat),
    }
    const pickupAddress = resolvePickupAddressByCountry(order.delivery.address.country, addressFromDelivery)
    return {
      condition,
      location: 'Home',
      finalDate,
      address: pickupAddress,
    }
  }

  const location = resolveDeliveryLocation(order)
  return {
    condition,
    location,
    finalDate,
    address:
      location === 'Home'
        ? customerAddress
        : {
            country: order.delivery.address.country,
            city: order.delivery.address.city,
            street: order.delivery.address.street,
            house: String(order.delivery.address.house),
            flat: String(order.delivery.address.flat),
          },
  }
}

function isValidCity(value: string) {
  const trimmed = value.trim()
  return (
    value === trimmed &&
    /^(?!.*\s{2})[A-Za-z ]+$/.test(trimmed) &&
    trimmed.length >= 1 &&
    trimmed.length <= 20
  )
}

function isValidStreet(value: string) {
  const trimmed = value.trim()
  return (
    value === trimmed &&
    /^(?!.*\s{2})[A-Za-z0-9 ]+$/.test(trimmed) &&
    trimmed.length >= 1 &&
    trimmed.length <= 40
  )
}

function isValidHouse(value: string) {
  const trimmed = value.trim()
  const numericValue = Number(trimmed)
  return /^\d{1,3}$/.test(trimmed) && numericValue >= 1 && numericValue <= 999
}

function isValidFlat(value: string) {
  const trimmed = value.trim()
  const numericValue = Number(trimmed)
  return /^\d{1,4}$/.test(trimmed) && numericValue >= 1 && numericValue <= 9999
}

function validateDeliveryForm(
  state: DeliveryFormState,
  allowedDates: { minDate: Date; maxDate: Date },
): DeliveryFieldErrors {
  const selectedDate = toDateInputAsLocalDate(state.finalDate)
  const hasValidDate =
    selectedDate !== null &&
    selectedDate.getTime() >= allowedDates.minDate.getTime() &&
    selectedDate.getTime() <= allowedDates.maxDate.getTime()
  const hasValidCountry = isCountryOption(state.address.country)
  const hasValidCity = isValidCity(state.address.city)
  const hasValidStreet = isValidStreet(state.address.street)
  const hasValidHouse = isValidHouse(state.address.house)
  const hasValidFlat = isValidFlat(state.address.flat)

  return {
    finalDate: hasValidDate ? null : ordersUiText.validation.deliveryDateInvalid,
    country: hasValidCountry ? null : ordersUiText.validation.deliveryCountryInvalid,
    city: hasValidCity ? null : ordersUiText.validation.deliveryCityInvalid,
    street: hasValidStreet ? null : ordersUiText.validation.deliveryStreetInvalid,
    house: hasValidHouse ? null : ordersUiText.validation.deliveryHouseInvalid,
    flat: hasValidFlat ? null : ordersUiText.validation.deliveryFlatInvalid,
  }
}

function toComparableFormState(state: DeliveryFormState) {
  return {
    condition: state.condition,
    finalDate: state.finalDate,
    address: {
      country: state.address.country.trim(),
      city: state.address.city.trim(),
      street: state.address.street.trim(),
      house: Number(state.address.house),
      flat: Number(state.address.flat),
    },
  }
}

function toDeliveryPayload(state: DeliveryFormState): OrderDelivery | null {
  const parsedDate = new Date(`${state.finalDate}T00:00:00.000Z`)
  if (Number.isNaN(parsedDate.getTime())) {
    return null
  }

  return {
    condition: state.condition,
    finalDate: parsedDate.toISOString(),
    address: {
      country: state.address.country.trim(),
      city: state.address.city.trim(),
      street: state.address.street.trim(),
      house: Number(state.address.house),
      flat: Number(state.address.flat),
    },
  }
}

function resolveAddressSourceLabel(condition: DeliveryConditionOption, location: DeliveryLocationOption) {
  if (condition === 'Pickup') {
    return ordersUiText.detailsPage.placeholders.deliveryAddressSourceStore
  }
  if (location === 'Home') {
    return ordersUiText.detailsPage.placeholders.deliveryAddressSourceCustomer
  }
  return ordersUiText.detailsPage.placeholders.deliveryAddressSourceCustom
}

export function OrderDetailsDeliveryTab({
  order,
  isDeliveryEditable,
  isDeliverySubmitting,
  onSaveDelivery,
}: OrderDetailsDeliveryTabProps) {
  const initialFormState = useMemo(() => resolveInitialFormState(order), [order])
  const allowedDeliveryDates = useMemo(() => resolveAllowedDeliveryDates(new Date()), [])
  const dateInputRef = useRef<HTMLInputElement | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [formState, setFormState] = useState(initialFormState)
  const [touched, setTouched] = useState<DeliveryTouchedState>(INITIAL_TOUCHED_STATE)
  const isEditModeVisible = isEditing && isDeliveryEditable

  const validation = useMemo(
    () => validateDeliveryForm(formState, allowedDeliveryDates),
    [allowedDeliveryDates, formState],
  )
  const isFormValid = useMemo(
    () => Object.values(validation).every((value) => value === null),
    [validation],
  )
  const hasChanges = useMemo(
    () =>
      JSON.stringify(toComparableFormState(formState)) !==
      JSON.stringify(toComparableFormState(initialFormState)),
    [formState, initialFormState],
  )
  const canSave = isDeliveryEditable && isFormValid && hasChanges && !isDeliverySubmitting
  const isAddressReadonly = formState.condition === 'Pickup' || formState.location === 'Home'
  const shouldShowLocation = formState.condition === 'Delivery'
  const shouldCountryBeSelect = formState.condition === 'Pickup' || formState.location === 'Other'
  const deliveryLocation = resolveDeliveryLocation(order)
  const deliveryAddressSourceLabel = order.delivery
    ? resolveAddressSourceLabel(order.delivery.condition, deliveryLocation)
    : null

  const markTouched = (field: keyof DeliveryTouchedState) => {
    setTouched((current) => ({ ...current, [field]: true }))
  }

  const handleStartEditing = () => {
    setFormState(initialFormState)
    setTouched(INITIAL_TOUCHED_STATE)
    setIsEditing(true)
  }

  const handleCancelEditing = () => {
    if (isDeliverySubmitting) return
    setFormState(initialFormState)
    setTouched(INITIAL_TOUCHED_STATE)
    setIsEditing(false)
  }

  const handleConditionChange = (nextCondition: DeliveryConditionOption) => {
    const customerAddress = resolveCustomerAddress(order)
    if (nextCondition === 'Pickup') {
      const pickupAddress = resolvePickupAddressByCountry(formState.address.country, customerAddress)
      setFormState((current) => ({
        ...current,
        condition: 'Pickup',
        location: 'Home',
        address: pickupAddress,
      }))
      return
    }

    setFormState((current) => ({
      ...current,
      condition: 'Delivery',
      location: 'Home',
      address: customerAddress,
    }))
  }

  const handleLocationChange = (nextLocation: DeliveryLocationOption) => {
    if (nextLocation === 'Home') {
      const customerAddress = resolveCustomerAddress(order)
      setFormState((current) => ({ ...current, location: 'Home', address: customerAddress }))
      return
    }

    const fallbackAddress =
      initialFormState.condition === 'Delivery' && initialFormState.location === 'Other'
        ? initialFormState.address
        : resolveCustomerAddress(order)

    setFormState((current) => ({
      ...current,
      location: 'Other',
      address: fallbackAddress,
    }))
  }

  const handleCountryChange = (nextCountry: string) => {
    if (formState.condition === 'Pickup') {
      const fallbackAddress = resolveCustomerAddress(order)
      const pickupAddress = resolvePickupAddressByCountry(nextCountry, fallbackAddress)
      setFormState((current) => ({ ...current, address: pickupAddress }))
      return
    }

    setFormState((current) => ({
      ...current,
      address: { ...current.address, country: nextCountry },
    }))
  }

  const handleAddressInputChange = (
    field: keyof Omit<DeliveryAddressFormState, 'country'>,
    value: string,
  ) => {
    setFormState((current) => ({
      ...current,
      address: { ...current.address, [field]: value },
    }))
  }

  const handleSave = async () => {
    if (!canSave) return
    const payload = toDeliveryPayload(formState)
    if (!payload) return

    const isSuccessful = await onSaveDelivery(payload)
    if (!isSuccessful) return

    setTouched(INITIAL_TOUCHED_STATE)
    setIsEditing(false)
  }

  const openDatePicker = () => {
    const pickerInput = dateInputRef.current as (HTMLInputElement & { showPicker?: () => void }) | null
    if (!pickerInput) return
    try {
      pickerInput.showPicker?.()
    } catch {
      // ignore: some browsers block programmatic picker calls in specific focus states
    }
  }

  const handleDateInputKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (event) => {
    if (event.key === 'Tab') return
    event.preventDefault()
    openDatePicker()
  }

  const handleDateInputPaste: React.ClipboardEventHandler<HTMLInputElement> = (event) => {
    event.preventDefault()
  }

  const handleDateInputDrop: React.DragEventHandler<HTMLInputElement> = (event) => {
    event.preventDefault()
  }

  return (
    <Stack spacing={2}>
      <Stack spacing={1.25} alignItems="flex-start">
        <Stack direction="row" spacing={0.75} alignItems="center">
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            {ordersUiText.detailsPage.labels.deliveryInformation}
          </Typography>
          {!isEditModeVisible && isDeliveryEditable && order.delivery ? (
            <IconButton
              size="small"
              onClick={handleStartEditing}
              data-testid="order-details-delivery-edit-button"
            >
              <EditOutlinedIcon fontSize="small" />
            </IconButton>
          ) : null}
        </Stack>

        {!isEditModeVisible && isDeliveryEditable && !order.delivery ? (
          <Button
            variant="contained"
            onClick={handleStartEditing}
            data-testid="order-details-delivery-schedule-button"
          >
            {ordersUiText.detailsPage.actions.scheduleDelivery}
          </Button>
        ) : null}
      </Stack>

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }} />

      {isEditModeVisible ? (
        <Paper
          variant="outlined"
          sx={{
            p: { xs: 2, md: 2.5 },
            borderRadius: 2.5,
            backgroundColor: (theme) =>
              theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.015)' : 'rgba(25, 118, 210, 0.02)',
          }}
          data-testid="order-details-delivery-form-card"
        >
          <Stack spacing={2.25} data-testid="order-details-delivery-form">
            <Box
              sx={{
                display: 'grid',
                gap: 2,
                gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
              }}
            >
              <TextField
                select
                label={ordersUiText.detailsPage.fields.delivery.condition}
                value={formState.condition}
                onChange={(event) =>
                  handleConditionChange(event.target.value as DeliveryConditionOption)
                }
                data-testid="order-details-delivery-condition-select"
                SelectProps={{ inputProps: { 'data-testid': 'order-details-delivery-condition-select-field' } }}
              >
                {DELIVERY_CONDITION_OPTIONS.map((option) => (
                  <MenuItem
                    key={option}
                    value={option}
                    data-testid={`order-details-delivery-condition-option-${option.toLowerCase()}`}
                  >
                    {option}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                label={ordersUiText.detailsPage.fields.delivery.finalDate}
                type="date"
                inputRef={dateInputRef}
                onClick={openDatePicker}
                onFocus={openDatePicker}
                value={formState.finalDate}
                onChange={(event) => setFormState((current) => ({ ...current, finalDate: event.target.value }))}
                onBlur={() => markTouched('finalDate')}
                error={touched.finalDate && Boolean(validation.finalDate)}
                helperText={touched.finalDate ? (validation.finalDate ?? ' ') : ' '}
                slotProps={{ inputLabel: { shrink: true } }}
                data-testid="order-details-delivery-date-input"
                inputProps={{
                  min: allowedDeliveryDates.minDateInputValue,
                  max: allowedDeliveryDates.maxDateInputValue,
                  onKeyDown: handleDateInputKeyDown,
                  onPaste: handleDateInputPaste,
                  onDrop: handleDateInputDrop,
                  'data-testid': 'order-details-delivery-date-input-field',
                }}
              />
            </Box>

            {shouldShowLocation ? (
              <TextField
                select
                label={ordersUiText.detailsPage.fields.delivery.location}
                value={formState.location}
                onChange={(event) =>
                  handleLocationChange(event.target.value as DeliveryLocationOption)
                }
                data-testid="order-details-delivery-location-select"
                SelectProps={{ inputProps: { 'data-testid': 'order-details-delivery-location-select-field' } }}
              >
                {DELIVERY_LOCATION_OPTIONS.map((option) => (
                  <MenuItem
                    key={option}
                    value={option}
                    data-testid={`order-details-delivery-location-option-${option.toLowerCase()}`}
                  >
                    {option}
                  </MenuItem>
                ))}
              </TextField>
            ) : null}

            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                {ordersUiText.detailsPage.labels.deliveryAddress}
              </Typography>
              <Chip
                size="small"
                color="primary"
                variant="outlined"
                label={resolveAddressSourceLabel(formState.condition, formState.location)}
                data-testid="order-details-delivery-address-source-chip"
              />
            </Stack>

            <Box
              sx={{
                display: 'grid',
                gap: 2,
                gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
              }}
            >
              {shouldCountryBeSelect ? (
                <TextField
                  select
                  label={ordersUiText.detailsPage.fields.delivery.country}
                  value={formState.address.country}
                  onChange={(event) => handleCountryChange(event.target.value)}
                  onBlur={() => markTouched('country')}
                  error={touched.country && Boolean(validation.country)}
                  helperText={touched.country ? (validation.country ?? ' ') : ' '}
                  data-testid="order-details-delivery-country-select"
                  SelectProps={{ inputProps: { 'data-testid': 'order-details-delivery-country-select-field' } }}
                >
                  {COUNTRIES.map((country) => (
                    <MenuItem
                      key={country}
                      value={country}
                      data-testid={`order-details-delivery-country-option-${country.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      {country}
                    </MenuItem>
                  ))}
                </TextField>
              ) : (
                <TextField
                  label={ordersUiText.detailsPage.fields.delivery.country}
                  value={formState.address.country}
                  InputProps={{ readOnly: true }}
                  helperText=" "
                  data-testid="order-details-delivery-country-readonly-input"
                  inputProps={{ 'data-testid': 'order-details-delivery-country-readonly-input-field' }}
                />
              )}

              <TextField
                label={ordersUiText.detailsPage.fields.delivery.city}
                value={formState.address.city}
                onChange={(event) => handleAddressInputChange('city', event.target.value)}
                onBlur={() => markTouched('city')}
                error={touched.city && Boolean(validation.city)}
                helperText={touched.city ? (validation.city ?? ' ') : ' '}
                InputProps={{ readOnly: isAddressReadonly }}
                data-testid="order-details-delivery-city-input"
                inputProps={{ 'data-testid': 'order-details-delivery-city-input-field' }}
              />

              <TextField
                label={ordersUiText.detailsPage.fields.delivery.street}
                value={formState.address.street}
                onChange={(event) => handleAddressInputChange('street', event.target.value)}
                onBlur={() => markTouched('street')}
                error={touched.street && Boolean(validation.street)}
                helperText={touched.street ? (validation.street ?? ' ') : ' '}
                InputProps={{ readOnly: isAddressReadonly }}
                data-testid="order-details-delivery-street-input"
                inputProps={{ 'data-testid': 'order-details-delivery-street-input-field' }}
              />

              <TextField
                label={ordersUiText.detailsPage.fields.delivery.house}
                value={formState.address.house}
                onChange={(event) => handleAddressInputChange('house', event.target.value)}
                onBlur={() => markTouched('house')}
                error={touched.house && Boolean(validation.house)}
                helperText={touched.house ? (validation.house ?? ' ') : ' '}
                InputProps={{ readOnly: isAddressReadonly }}
                inputProps={{
                  inputMode: 'numeric',
                  pattern: '[0-9]*',
                  'data-testid': 'order-details-delivery-house-input-field',
                }}
                data-testid="order-details-delivery-house-input"
              />

              <TextField
                label={ordersUiText.detailsPage.fields.delivery.flat}
                value={formState.address.flat}
                onChange={(event) => handleAddressInputChange('flat', event.target.value)}
                onBlur={() => markTouched('flat')}
                error={touched.flat && Boolean(validation.flat)}
                helperText={touched.flat ? (validation.flat ?? ' ') : ' '}
                InputProps={{ readOnly: isAddressReadonly }}
                inputProps={{
                  inputMode: 'numeric',
                  pattern: '[0-9]*',
                  'data-testid': 'order-details-delivery-flat-input-field',
                }}
                data-testid="order-details-delivery-flat-input"
              />
            </Box>

            <Stack direction="row" spacing={1} justifyContent="flex-start" flexWrap="wrap">
              <Button
                variant="contained"
                onClick={() => void handleSave()}
                disabled={!canSave}
                data-testid="order-details-delivery-save-button"
              >
                {isDeliverySubmitting ? (
                  <CircularProgress size={18} color="inherit" />
                ) : (
                  ordersUiText.detailsPage.actions.saveDelivery
                )}
              </Button>
              <Button
                variant="outlined"
                onClick={handleCancelEditing}
                disabled={isDeliverySubmitting}
                data-testid="order-details-delivery-cancel-button"
              >
                {ordersUiText.detailsPage.actions.cancelDeliveryEdit}
              </Button>
            </Stack>
          </Stack>
        </Paper>
      ) : order.delivery ? (
        <Stack spacing={1.5} data-testid="order-details-delivery-view">
          {deliveryAddressSourceLabel ? (
            <Chip
              size="small"
              color="primary"
              variant="outlined"
              label={deliveryAddressSourceLabel}
              sx={{ alignSelf: 'flex-start' }}
              data-testid="order-details-delivery-view-source-chip"
            />
          ) : null}
          <Box
            sx={{
              display: 'grid',
              gap: 1.25,
              gridTemplateColumns: { xs: '1fr', sm: '180px 1fr' },
            }}
          >
            <Typography fontWeight={700}>{ordersUiText.detailsPage.fields.delivery.condition}</Typography>
            <Typography data-testid="order-details-delivery-condition-value">
              {normalizeTextValue(order.delivery.condition)}
            </Typography>

            <Typography fontWeight={700}>{ordersUiText.detailsPage.fields.delivery.finalDate}</Typography>
            <Typography data-testid="order-details-delivery-date-value">
              {formatDate(order.delivery.finalDate)}
            </Typography>

            {order.delivery.condition === 'Delivery' ? (
              <>
                <Typography fontWeight={700}>{ordersUiText.detailsPage.fields.delivery.location}</Typography>
                <Typography data-testid="order-details-delivery-location-value">
                  {deliveryLocation}
                </Typography>
              </>
            ) : null}

            <Typography fontWeight={700}>{ordersUiText.detailsPage.fields.delivery.country}</Typography>
            <Typography data-testid="order-details-delivery-country-value">
              {normalizeTextValue(order.delivery.address.country)}
            </Typography>

            <Typography fontWeight={700}>{ordersUiText.detailsPage.fields.delivery.city}</Typography>
            <Typography data-testid="order-details-delivery-city-value">
              {normalizeTextValue(order.delivery.address.city)}
            </Typography>

            <Typography fontWeight={700}>{ordersUiText.detailsPage.fields.delivery.street}</Typography>
            <Typography data-testid="order-details-delivery-street-value">
              {normalizeTextValue(order.delivery.address.street)}
            </Typography>

            <Typography fontWeight={700}>{ordersUiText.detailsPage.fields.delivery.house}</Typography>
            <Typography data-testid="order-details-delivery-house-value">
              {normalizeTextValue(order.delivery.address.house)}
            </Typography>

            <Typography fontWeight={700}>{ordersUiText.detailsPage.fields.delivery.flat}</Typography>
            <Typography data-testid="order-details-delivery-flat-value">
              {normalizeTextValue(order.delivery.address.flat)}
            </Typography>
          </Box>
        </Stack>
      ) : (
        <Alert
          severity="info"
          variant="outlined"
          sx={{
            alignSelf: 'flex-start',
            width: 'fit-content',
            px: 1.25,
            py: 0.25,
            '& .MuiAlert-icon': {
              py: 0,
              my: 'auto',
              mr: 1,
            },
            '& .MuiAlert-message': {
              py: 0,
              pr: 0.5,
              display: 'flex',
              alignItems: 'center',
              minHeight: 24,
            },
          }}
          data-testid="order-details-delivery-empty-state"
        >
          {ordersUiText.detailsPage.placeholders.noDeliveryScheduled}
        </Alert>
      )}
    </Stack>
  )
}
