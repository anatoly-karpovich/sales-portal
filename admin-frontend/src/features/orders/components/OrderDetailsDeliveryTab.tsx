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
import { US_STATES, US_STATE_BY_CODE } from '@/constants/usStates'
import {
  buildPickupLocationsByStateMap,
  resolvePickupCitiesByState,
  resolvePickupLocation,
  resolvePickupStates,
} from '@/features/orders/config/pickupLocations.config'
import {
  ORDER_DETAILS_DELIVERY_MAX_DATE_OFFSET_DAYS,
  ORDER_DETAILS_DELIVERY_MIN_DATE_OFFSET_DAYS,
} from '@/features/orders/config/orderDetails.config'
import { ordersUiText } from '@/features/orders/orders.ui-text'
import { useSettingsQuery } from '@/features/settings/hooks/useSettingsQuery'
import { formatDate } from '@/utils/date'
import { applyZipCodeMask } from '@/utils/zipCode'

type DeliveryConditionOption = 'Delivery' | 'Pickup'
type DeliveryLocationOption = 'Home' | 'Other'

type DeliveryAddressFormState = {
  state: string
  city: string
  street: string
  house: string
  apartment: string
  zipCode: string
}

type DeliveryFormState = {
  condition: DeliveryConditionOption
  location: DeliveryLocationOption
  finalDate: string
  address: DeliveryAddressFormState
}

type DeliveryFieldErrors = {
  finalDate: string | null
  state: string | null
  city: string | null
  street: string | null
  house: string | null
  apartment: string | null
  zipCode: string | null
}

type DeliveryTouchedState = {
  finalDate: boolean
  state: boolean
  city: boolean
  street: boolean
  house: boolean
  apartment: boolean
  zipCode: boolean
}

type OrderDetailsDeliveryTabProps = {
  order: OrderDetails
  isDeliveryEditable: boolean
  isDeliverySubmitting: boolean
  onSaveDelivery: (delivery: OrderDelivery) => Promise<boolean>
}

const DELIVERY_CONDITION_OPTIONS: DeliveryConditionOption[] = ['Delivery', 'Pickup']
const DELIVERY_LOCATION_OPTIONS: DeliveryLocationOption[] = ['Home', 'Other']

const INITIAL_TOUCHED_STATE: DeliveryTouchedState = {
  finalDate: false,
  state: false,
  city: false,
  street: false,
  house: false,
  apartment: false,
  zipCode: false,
}

function normalizeTextValue(value: string | number | null | undefined) {
  if (value === null || value === undefined) return '-'
  if (typeof value === 'string' && value.trim().length === 0) return '-'
  return String(value)
}

function toOptionTestId(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
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
    state: order.customer.state,
    city: order.customer.city,
    street: order.customer.street,
    house: String(order.customer.house),
    apartment: order.customer.apartment ? String(order.customer.apartment) : '',
    zipCode: order.customer.zipCode,
  }
}

function areAddressesEqual(left: DeliveryAddressFormState, right: DeliveryAddressFormState) {
  return (
    left.state === right.state &&
    left.city === right.city &&
    left.street === right.street &&
    left.house === right.house &&
    left.apartment === right.apartment &&
    left.zipCode === right.zipCode
  )
}

function resolveDeliveryLocation(order: OrderDetails): DeliveryLocationOption {
  if (!order.delivery || order.delivery.condition !== 'Delivery') {
    return 'Home'
  }

  const customerAddress = resolveCustomerAddress(order)
  const deliveryAddress: DeliveryAddressFormState = {
    state: order.delivery.address.state,
    city: order.delivery.address.city,
    street: order.delivery.address.street,
    house: String(order.delivery.address.house),
    apartment: order.delivery.address.apartment ? String(order.delivery.address.apartment) : '',
    zipCode: order.delivery.address.zipCode,
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
    return {
      condition: 'Pickup',
      location: 'Home',
      finalDate,
      address: {
        state: order.delivery.address.state,
        city: order.delivery.address.city,
        street: order.delivery.address.street,
        house: String(order.delivery.address.house),
        apartment: order.delivery.address.apartment ? String(order.delivery.address.apartment) : '',
        zipCode: order.delivery.address.zipCode,
      },
    }
  }

  const location = resolveDeliveryLocation(order)
  return {
    condition,
    location,
    finalDate,
    address: location === 'Home' ? customerAddress : {
      state: order.delivery.address.state,
      city: order.delivery.address.city,
      street: order.delivery.address.street,
      house: String(order.delivery.address.house),
      apartment: order.delivery.address.apartment ? String(order.delivery.address.apartment) : '',
      zipCode: order.delivery.address.zipCode,
    },
  }
}

function isValidState(value: string) {
  return /^[A-Z]{2}$/.test(value.trim())
}

function isValidCity(value: string) {
  const trimmed = value.trim()
  return (
    value === trimmed &&
    /^(?!.*\s{2})[A-Za-z]+(?:[ .'-][A-Za-z]+)*$/.test(trimmed) &&
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

function isValidApartment(value: string) {
  const trimmed = value.trim()
  if (trimmed.length === 0) return true
  const numericValue = Number(trimmed)
  return /^\d{1,4}$/.test(trimmed) && numericValue >= 1 && numericValue <= 9999
}

function isValidZipCode(value: string) {
  return /^\d{5}(-\d{4})?$/.test(value.trim())
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

  const hasValidState = isValidState(state.address.state)
  const hasValidCity = isValidCity(state.address.city)
  const hasValidStreet = isValidStreet(state.address.street)
  const hasValidHouse = isValidHouse(state.address.house)
  const hasValidApartment = isValidApartment(state.address.apartment)
  const hasValidZipCode = isValidZipCode(state.address.zipCode)

  return {
    finalDate: hasValidDate ? null : ordersUiText.validation.deliveryDateInvalid,
    state: hasValidState ? null : ordersUiText.validation.deliveryStateInvalid,
    city: hasValidCity ? null : ordersUiText.validation.deliveryCityInvalid,
    street: hasValidStreet ? null : ordersUiText.validation.deliveryStreetInvalid,
    house: hasValidHouse ? null : ordersUiText.validation.deliveryHouseInvalid,
    apartment: hasValidApartment ? null : ordersUiText.validation.deliveryApartmentInvalid,
    zipCode: hasValidZipCode ? null : ordersUiText.validation.deliveryZipCodeInvalid,
  }
}

function toComparableFormState(state: DeliveryFormState) {
  return {
    condition: state.condition,
    finalDate: state.finalDate,
    location: state.location,
    address: {
      state: state.address.state.trim(),
      city: state.address.city.trim(),
      street: state.address.street.trim(),
      house: Number(state.address.house),
      apartment: state.address.apartment.trim().length > 0 ? Number(state.address.apartment) : null,
      zipCode: state.address.zipCode.trim(),
    },
  }
}

function toDeliveryPayload(state: DeliveryFormState): OrderDelivery | null {
  const parsedDate = new Date(`${state.finalDate}T00:00:00.000Z`)
  if (Number.isNaN(parsedDate.getTime())) {
    return null
  }

  const apartment = state.address.apartment.trim()
  return {
    condition: state.condition,
    finalDate: parsedDate.toISOString(),
    address: {
      state: state.address.state.trim(),
      city: state.address.city.trim(),
      street: state.address.street.trim(),
      house: Number(state.address.house),
      ...(apartment.length > 0 ? { apartment: Number(apartment) } : {}),
      zipCode: state.address.zipCode.trim(),
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
  const {
    data: settings,
    isLoading: isSettingsLoading,
    isFetching: isSettingsFetching,
    refetch: refetchSettings,
  } = useSettingsQuery()

  const pickupLocationsMap = useMemo(
    () => buildPickupLocationsByStateMap(settings?.delivery.pickupLocations),
    [settings?.delivery.pickupLocations],
  )
  const pickupStates = useMemo(() => resolvePickupStates(pickupLocationsMap), [pickupLocationsMap])
  const initialFormState = useMemo(() => resolveInitialFormState(order), [order])
  const allowedDeliveryDates = useMemo(() => resolveAllowedDeliveryDates(new Date()), [])
  const dateInputRef = useRef<HTMLInputElement | null>(null)

  const [isEditing, setIsEditing] = useState(false)
  const [formState, setFormState] = useState(initialFormState)
  const [touched, setTouched] = useState<DeliveryTouchedState>(INITIAL_TOUCHED_STATE)
  const [selectedPickupState, setSelectedPickupState] = useState(initialFormState.address.state)

  const isSettingsDataLoading = isSettingsLoading || (!settings && isSettingsFetching)
  const hasSettingsData = Boolean(settings)

  const canScheduleDelivery =
    isDeliveryEditable &&
    hasSettingsData &&
    order.status === 'Draft' &&
    order.deliveryStatus === 'Not Scheduled'
  const canEditDelivery =
    isDeliveryEditable &&
    hasSettingsData &&
    order.status === 'Draft' &&
    order.deliveryStatus === 'Scheduled' &&
    Boolean(order.delivery)
  const canEnterEditMode = canScheduleDelivery || canEditDelivery
  const isEditModeVisible = isEditing && canEnterEditMode

  const pickupCities = useMemo(
    () => resolvePickupCitiesByState(pickupLocationsMap, selectedPickupState),
    [pickupLocationsMap, selectedPickupState],
  )

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
  const canSave =
    isDeliveryEditable &&
    hasSettingsData &&
    isFormValid &&
    hasChanges &&
    !isDeliverySubmitting &&
    !(formState.condition === 'Pickup' && pickupCities.length === 0)

  const areAddressLineFieldsReadonly =
    formState.condition === 'Pickup' || formState.location === 'Home'
  const shouldShowLocation = formState.condition === 'Delivery'
  const deliveryLocation = resolveDeliveryLocation(order)
  const deliveryAddressSourceLabel = order.delivery
    ? resolveAddressSourceLabel(order.delivery.condition, deliveryLocation)
    : null

  const markTouched = (field: keyof DeliveryTouchedState) => {
    setTouched((current) => ({ ...current, [field]: true }))
  }

  const applyPickupAddress = (stateCode: string, city: string) => {
    const location = resolvePickupLocation(pickupLocationsMap, stateCode, city)
    if (!location) return

    setFormState((current) => ({
      ...current,
      address: {
        state: location.state,
        city: location.city,
        street: location.address.street,
        house: location.address.house,
        apartment: location.address.apartment,
        zipCode: location.address.zipCode,
      },
    }))
  }

  const resetEditState = () => {
    setFormState(initialFormState)
    setTouched(INITIAL_TOUCHED_STATE)
    setSelectedPickupState(initialFormState.address.state)
  }

  const handleStartEditing = () => {
    if (!canEnterEditMode) return
    resetEditState()
    setIsEditing(true)
  }

  const handleCancelEditing = () => {
    if (isDeliverySubmitting) return
    resetEditState()
    setIsEditing(false)
  }

  const handleConditionChange = (nextCondition: DeliveryConditionOption) => {
    const customerAddress = resolveCustomerAddress(order)
    if (nextCondition === 'Pickup') {
      const fallbackState = pickupStates.includes(formState.address.state)
        ? formState.address.state
        : pickupStates[0] ?? ''
      const fallbackCities = resolvePickupCitiesByState(pickupLocationsMap, fallbackState)
      const fallbackCity = fallbackCities[0] ?? ''

      setSelectedPickupState(fallbackState)
      setFormState((current) => ({
        ...current,
        condition: 'Pickup',
        location: 'Home',
        address: {
          state: fallbackState,
          city: fallbackCity,
          street: '',
          house: '',
          apartment: '',
          zipCode: '',
        },
      }))
      applyPickupAddress(fallbackState, fallbackCity)
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

  const handleAddressInputChange = (field: keyof DeliveryAddressFormState, value: string) => {
    const nextValue = field === 'zipCode' ? applyZipCodeMask(value) : value
    setFormState((current) => ({
      ...current,
      address: { ...current.address, [field]: nextValue },
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
          {!isEditModeVisible && canEditDelivery ? (
            <IconButton
              size="small"
              onClick={handleStartEditing}
              data-testid="order-details-delivery-edit-button"
            >
              <EditOutlinedIcon fontSize="small" />
            </IconButton>
          ) : null}
        </Stack>

        {!isEditModeVisible && canScheduleDelivery ? (
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

      {!hasSettingsData ? (
        <Alert
          severity={isSettingsDataLoading ? 'info' : 'warning'}
          variant="outlined"
          data-testid="order-details-delivery-settings-state"
        >
          {isSettingsDataLoading ? (
            <Stack direction="row" spacing={1} alignItems="center">
              <CircularProgress size={16} />
              <Typography>{ordersUiText.detailsPage.placeholders.deliveryCityNoOptions}</Typography>
            </Stack>
          ) : (
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography>{ordersUiText.errors.settingsNotFound}</Typography>
              <Button
                size="small"
                onClick={() => {
                  void refetchSettings()
                }}
                data-testid="order-details-delivery-settings-retry-button"
              >
                Retry
              </Button>
            </Stack>
          )}
        </Alert>
      ) : null}

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
              {formState.condition === 'Pickup' ? (
                <>
                  <TextField
                    select
                    label={ordersUiText.detailsPage.fields.delivery.state}
                    value={selectedPickupState}
                    onChange={(event) => {
                      const nextState = event.target.value
                      markTouched('state')
                      markTouched('city')
                      setSelectedPickupState(nextState)
                      const cities = resolvePickupCitiesByState(pickupLocationsMap, nextState)
                      const nextCity = cities[0] ?? ''
                      setFormState((current) => ({
                        ...current,
                        address: {
                          ...current.address,
                          state: nextState,
                          city: nextCity,
                          street: '',
                          house: '',
                          apartment: '',
                          zipCode: '',
                        },
                      }))
                      applyPickupAddress(nextState, nextCity)
                    }}
                    onBlur={() => markTouched('state')}
                    error={touched.state && Boolean(validation.state)}
                    helperText={touched.state ? (validation.state ?? ' ') : ' '}
                    disabled={pickupStates.length === 0}
                    data-testid="order-details-delivery-pickup-state-select"
                    SelectProps={{ inputProps: { 'data-testid': 'order-details-delivery-pickup-state-select-field' } }}
                  >
                    {pickupStates.map((stateCode) => (
                      <MenuItem
                        key={stateCode}
                        value={stateCode}
                        data-testid={`order-details-delivery-pickup-state-option-${toOptionTestId(stateCode)}`}
                      >
                        {US_STATE_BY_CODE.get(stateCode)?.label ?? stateCode}
                      </MenuItem>
                    ))}
                  </TextField>

                  <TextField
                    select
                    label={ordersUiText.detailsPage.fields.delivery.city}
                    value={formState.address.city}
                    onChange={(event) => {
                      markTouched('city')
                      applyPickupAddress(selectedPickupState, event.target.value)
                    }}
                    onBlur={() => markTouched('city')}
                    error={touched.city && Boolean(validation.city)}
                    helperText={
                      pickupCities.length === 0
                        ? ordersUiText.detailsPage.placeholders.pickupCityNoOptions
                        : touched.city
                          ? (validation.city ?? ' ')
                          : ' '
                    }
                    disabled={pickupCities.length === 0}
                    data-testid="order-details-delivery-pickup-city-select"
                    SelectProps={{ inputProps: { 'data-testid': 'order-details-delivery-pickup-city-select-field' } }}
                  >
                    {pickupCities.map((city) => (
                      <MenuItem
                        key={city}
                        value={city}
                        data-testid={`order-details-delivery-pickup-city-option-${toOptionTestId(city)}`}
                      >
                        {city}
                      </MenuItem>
                    ))}
                  </TextField>
                </>
              ) : (
                <>
                  <TextField
                    select
                    label={ordersUiText.detailsPage.fields.delivery.state}
                    value={formState.address.state}
                    onChange={(event) => handleAddressInputChange('state', event.target.value)}
                    onBlur={() => markTouched('state')}
                    error={touched.state && Boolean(validation.state)}
                    helperText={touched.state ? (validation.state ?? ' ') : ' '}
                    disabled={formState.location === 'Home'}
                    data-testid="order-details-delivery-state-select"
                    SelectProps={{ inputProps: { 'data-testid': 'order-details-delivery-state-select-field' } }}
                  >
                    {US_STATES.map((state) => (
                      <MenuItem
                        key={state.code}
                        value={state.code}
                        data-testid={`order-details-delivery-state-option-${toOptionTestId(state.code)}`}
                      >
                        {state.label}
                      </MenuItem>
                    ))}
                  </TextField>

                  <TextField
                    label={ordersUiText.detailsPage.fields.delivery.city}
                    value={formState.address.city}
                    onChange={(event) => handleAddressInputChange('city', event.target.value)}
                    onBlur={() => markTouched('city')}
                    error={touched.city && Boolean(validation.city)}
                    helperText={touched.city ? (validation.city ?? ' ') : ' '}
                    InputProps={{ readOnly: formState.location === 'Home' }}
                    data-testid="order-details-delivery-city-input"
                    inputProps={{ 'data-testid': 'order-details-delivery-city-input-field' }}
                  />
                </>
              )}

              <TextField
                label={ordersUiText.detailsPage.fields.delivery.street}
                value={formState.address.street}
                onChange={(event) => handleAddressInputChange('street', event.target.value)}
                onBlur={() => markTouched('street')}
                error={touched.street && Boolean(validation.street)}
                helperText={touched.street ? (validation.street ?? ' ') : ' '}
                InputProps={{ readOnly: areAddressLineFieldsReadonly }}
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
                InputProps={{ readOnly: areAddressLineFieldsReadonly }}
                inputProps={{
                  inputMode: 'numeric',
                  pattern: '[0-9]*',
                  'data-testid': 'order-details-delivery-house-input-field',
                }}
                data-testid="order-details-delivery-house-input"
              />

              <TextField
                label={ordersUiText.detailsPage.fields.delivery.apartment}
                value={formState.address.apartment}
                onChange={(event) => handleAddressInputChange('apartment', event.target.value)}
                onBlur={() => markTouched('apartment')}
                error={touched.apartment && Boolean(validation.apartment)}
                helperText={touched.apartment ? (validation.apartment ?? ' ') : ' '}
                InputProps={{ readOnly: areAddressLineFieldsReadonly }}
                inputProps={{
                  inputMode: 'numeric',
                  pattern: '[0-9]*',
                  'data-testid': 'order-details-delivery-apartment-input-field',
                }}
                data-testid="order-details-delivery-apartment-input"
              />

              <TextField
                label={ordersUiText.detailsPage.fields.delivery.zipCode}
                value={formState.address.zipCode}
                onChange={(event) => handleAddressInputChange('zipCode', event.target.value)}
                onBlur={() => markTouched('zipCode')}
                error={touched.zipCode && Boolean(validation.zipCode)}
                helperText={touched.zipCode ? (validation.zipCode ?? ' ') : ' '}
                InputProps={{ readOnly: areAddressLineFieldsReadonly }}
                inputProps={{
                  'data-testid': 'order-details-delivery-zip-code-input-field',
                }}
                data-testid="order-details-delivery-zip-code-input"
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

            <Typography fontWeight={700}>{ordersUiText.detailsPage.fields.delivery.state}</Typography>
            <Typography data-testid="order-details-delivery-state-value">
              {normalizeTextValue(order.delivery.address.state)}
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

            {typeof order.delivery.address.apartment === 'number' ? (
              <>
                <Typography fontWeight={700}>{ordersUiText.detailsPage.fields.delivery.apartment}</Typography>
                <Typography data-testid="order-details-delivery-apartment-value">
                  {normalizeTextValue(order.delivery.address.apartment)}
                </Typography>
              </>
            ) : null}

            <Typography fontWeight={700}>{ordersUiText.detailsPage.fields.delivery.zipCode}</Typography>
            <Typography data-testid="order-details-delivery-zip-code-value">
              {normalizeTextValue(order.delivery.address.zipCode)}
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
