import { useEffect, useMemo, useState } from 'react'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControlLabel,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material'
import type {
  OrderDelivery,
  OrderDeliveryByAddressPayload,
  OrderDetails,
  OrderPickupPayload,
} from '@/api/modules/orders.api'
import { US_STATES, US_STATE_BY_CODE } from '@/constants/usStates'
import {
  buildPickupLocationsByStateMap,
  resolvePickupCitiesByState,
  resolvePickupLocation,
  resolvePickupStates,
} from '@/features/orders/config/pickupLocations.config'
import { ORDER_DETAILS_SEARCH_DEBOUNCE_MS } from '@/features/orders/config/orderDetails.config'
import { useOrderPricingMutation } from '@/features/orders/hooks/useOrdersQuery'
import { getOverdueByDaysLabel, ordersUiText } from '@/features/orders/orders.ui-text'
import { useSettingsQuery } from '@/features/settings/hooks/useSettingsQuery'
import { formatDate } from '@/utils/date'
import { formatPrice } from '@/utils/number'
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
  express: boolean
  address: DeliveryAddressFormState
}

type DeliveryFieldErrors = {
  state: string | null
  city: string | null
  street: string | null
  house: string | null
  apartment: string | null
  zipCode: string | null
}

type DeliveryTouchedState = {
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
  onSaveDelivery: (
    delivery:
      | {
          mode: 'delivery'
          payload: OrderDeliveryByAddressPayload
        }
      | {
          mode: 'pickup'
          payload: OrderPickupPayload
        },
  ) => Promise<boolean>
}

const DELIVERY_CONDITION_OPTIONS: DeliveryConditionOption[] = ['Delivery', 'Pickup']
const DELIVERY_LOCATION_OPTIONS: DeliveryLocationOption[] = ['Home', 'Other']

const INITIAL_TOUCHED_STATE: DeliveryTouchedState = {
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
  if (order.delivery.condition !== 'Delivery') {
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
  if (order.delivery.condition === 'Pickup') {
    return {
      condition: 'Pickup',
      location: 'Home',
      express: false,
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
    condition: 'Delivery',
    location,
    express: 'express' in order.delivery.schedule ? order.delivery.schedule.express : false,
    address:
      location === 'Home'
        ? customerAddress
        : {
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

function validateDeliveryForm(state: DeliveryFormState): DeliveryFieldErrors {
  const hasValidState = isValidState(state.address.state)
  const hasValidCity = isValidCity(state.address.city)
  const hasValidStreet = isValidStreet(state.address.street)
  const hasValidHouse = isValidHouse(state.address.house)
  const hasValidApartment = isValidApartment(state.address.apartment)
  const hasValidZipCode = isValidZipCode(state.address.zipCode)

  return {
    state: hasValidState ? null : ordersUiText.validation.deliveryStateInvalid,
    city: hasValidCity ? null : ordersUiText.validation.deliveryCityInvalid,
    street: hasValidStreet ? null : ordersUiText.validation.deliveryStreetInvalid,
    house: hasValidHouse ? null : ordersUiText.validation.deliveryHouseInvalid,
    apartment: hasValidApartment ? null : ordersUiText.validation.deliveryApartmentInvalid,
    zipCode: hasValidZipCode ? null : ordersUiText.validation.deliveryZipCodeInvalid,
  }
}

function toDeliveryAddressPayload(state: DeliveryFormState): OrderDeliveryByAddressPayload {
  const apartment = state.address.apartment.trim()
  return {
    express: state.express,
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

function toPickupPayload(
  state: DeliveryFormState,
  pickupLocationsMap: ReturnType<typeof buildPickupLocationsByStateMap>,
): OrderPickupPayload | null {
  const location = resolvePickupLocation(
    pickupLocationsMap,
    state.address.state.trim(),
    state.address.city.trim(),
  )
  if (!location) return null
  return { pickupLocationId: location.id }
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

function resolvePricingTierLabel(delivery: OrderDelivery) {
  if (delivery.condition !== 'Delivery') return '-'

  switch (delivery.pricingTier) {
    case 'local_city':
      return 'Local City'
    case 'same_state':
      return 'Same State'
    case 'out_of_state':
      return 'Out Of State'
    default:
      return '-'
  }
}

function resolveEstimatedDate(delivery: OrderDelivery) {
  if (delivery.condition !== 'Delivery') return '-'
  if ('estimatedDate' in delivery.schedule) {
    return formatDate(delivery.schedule.estimatedDate)
  }
  return '-'
}

function resolvePickupAvailableFrom(delivery: OrderDelivery) {
  if (delivery.condition !== 'Pickup') return '-'
  if ('availableFromDate' in delivery.schedule) {
    return formatDate(delivery.schedule.availableFromDate)
  }
  return '-'
}

function resolvePickupByDate(delivery: OrderDelivery) {
  if (delivery.condition !== 'Pickup') return '-'
  if ('pickupByDate' in delivery.schedule) {
    return formatDate(delivery.schedule.pickupByDate)
  }
  return '-'
}

function resolveAddressPrimaryLine(address: OrderDeliveryByAddressPayload['address']) {
  const apartmentPart = typeof address.apartment === 'number' ? `, Apt ${address.apartment}` : ''
  return `${address.house} ${address.street}${apartmentPart}`
}

function resolveAddressSecondaryLine(address: OrderDeliveryByAddressPayload['address']) {
  return `${address.city}, ${address.state} ${address.zipCode}`
}

function formatDaysLabel(value: number | null | undefined) {
  if (typeof value !== 'number') return '-'
  return `${value} day${value === 1 ? '' : 's'}`
}

function resolveDeliveryStatusLabel(status: OrderDelivery['status']) {
  if (status.includes('Planned')) return 'Planned'
  if (status === 'Delivery Scheduled' || status === 'Pickup Scheduled') return 'Scheduled'
  return status
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

  const { mutateAsync: calculatePricingAsync } = useOrderPricingMutation()
  const pickupLocationsMap = useMemo(
    () => buildPickupLocationsByStateMap(settings?.shipping.pickup.locations),
    [settings?.shipping.pickup.locations],
  )
  const pickupStates = useMemo(() => resolvePickupStates(pickupLocationsMap), [pickupLocationsMap])
  const initialFormState = useMemo(() => resolveInitialFormState(order), [order])

  const [isEditing, setIsEditing] = useState(false)
  const [formState, setFormState] = useState(initialFormState)
  const [touched, setTouched] = useState<DeliveryTouchedState>(INITIAL_TOUCHED_STATE)
  const [selectedPickupState, setSelectedPickupState] = useState(initialFormState.address.state)
  const [pricingPreviewTotal, setPricingPreviewTotal] = useState<number | null>(null)
  const [pricingPreviewDeliveryPrice, setPricingPreviewDeliveryPrice] = useState<number | null>(null)
  const [pricingPreviewEstimatedDate, setPricingPreviewEstimatedDate] = useState<string | null>(null)
  const [pricingPreviewAvailableFromDate, setPricingPreviewAvailableFromDate] = useState<string | null>(null)
  const [pricingPreviewPickupByDate, setPricingPreviewPickupByDate] = useState<string | null>(null)
  const [isPricingPreviewLoading, setIsPricingPreviewLoading] = useState(false)
  const [isPricingPreviewUnavailable, setIsPricingPreviewUnavailable] = useState(false)
  const [hasPricingPreviewResponse, setHasPricingPreviewResponse] = useState(false)

  const isSettingsDataLoading = isSettingsLoading || (!settings && isSettingsFetching)
  const hasSettingsData = Boolean(settings)

  const canScheduleDelivery =
    isDeliveryEditable &&
    hasSettingsData &&
    order.status === 'Draft' &&
    order.delivery.status === 'Draft'
  const canEditDelivery =
    isDeliveryEditable &&
    hasSettingsData &&
    order.status === 'Draft' &&
    (
      order.delivery.status === 'Delivery Planned' ||
      order.delivery.status === 'Pickup Planned'
    )
  const canEnterEditMode = canScheduleDelivery || canEditDelivery
  const isEditModeVisible = isEditing && canEnterEditMode

  const pickupCities = useMemo(
    () => resolvePickupCitiesByState(pickupLocationsMap, selectedPickupState),
    [pickupLocationsMap, selectedPickupState],
  )

  const validation = useMemo(() => validateDeliveryForm(formState), [formState])
  const isFormValid = useMemo(
    () => Object.values(validation).every((value) => value === null),
    [validation],
  )
  const canSave =
    isDeliveryEditable &&
    hasSettingsData &&
    isFormValid &&
    hasPricingPreviewResponse &&
    !isPricingPreviewLoading &&
    !isDeliverySubmitting &&
    !(
      formState.condition === 'Pickup' &&
      (
        pickupCities.length === 0 ||
        !toPickupPayload(formState, pickupLocationsMap)
      )
    )
  const canRequestPricingPreview =
    isEditModeVisible &&
    hasSettingsData &&
    isFormValid &&
    !(
      formState.condition === 'Pickup' &&
      (
        pickupCities.length === 0 ||
        !toPickupPayload(formState, pickupLocationsMap)
      )
    )

  const areAddressLineFieldsReadonly =
    formState.condition === 'Pickup' || formState.location === 'Home'
  const shouldShowLocation = formState.condition === 'Delivery'
  const deliveryLocation = resolveDeliveryLocation(order)
  const deliveryAddressSourceLabel = resolveAddressSourceLabel(order.delivery.condition, deliveryLocation)
  const isDeliveryCondition = order.delivery.condition === 'Delivery'
  const viewTitle = isDeliveryCondition ? ordersUiText.detailsPage.labels.deliveryInformation : 'Pickup Information'

  useEffect(() => {
    if (!canRequestPricingPreview) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setIsPricingPreviewLoading(true)
      const products = order.products.map((item) => ({
        productId: item.product._id,
        variantId: item.variant._id,
        quantity: item.quantity,
      }))
      const payload =
        formState.condition === 'Delivery'
          ? {
              products,
              delivery: toDeliveryAddressPayload(formState),
            }
          : (() => {
              const pickupPayload = toPickupPayload(formState, pickupLocationsMap)
              if (!pickupPayload) return null
              return {
                products,
                pickup: pickupPayload,
              }
            })()

      if (!payload) {
        setIsPricingPreviewLoading(false)
        return
      }

      void calculatePricingAsync({ payload, requestConfig: { skipErrorToast: true } })
        .then((pricing) => {
          setPricingPreviewTotal(pricing.totalPrice)
          setPricingPreviewDeliveryPrice(pricing.delivery.price)
          setPricingPreviewEstimatedDate(pricing.delivery.estimatedDate)
          setPricingPreviewAvailableFromDate(pricing.delivery.availableFromDate)
          setPricingPreviewPickupByDate(pricing.delivery.pickupByDate)
          setIsPricingPreviewUnavailable(false)
          setHasPricingPreviewResponse(true)
        })
        .catch(() => {
          setPricingPreviewTotal(null)
          setPricingPreviewDeliveryPrice(null)
          setPricingPreviewEstimatedDate(null)
          setPricingPreviewAvailableFromDate(null)
          setPricingPreviewPickupByDate(null)
          setIsPricingPreviewUnavailable(true)
          setHasPricingPreviewResponse(true)
        })
        .finally(() => {
          setIsPricingPreviewLoading(false)
        })
    }, ORDER_DETAILS_SEARCH_DEBOUNCE_MS)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [
    canRequestPricingPreview,
    formState,
    hasSettingsData,
    isEditModeVisible,
    isFormValid,
    order.products,
    pickupCities.length,
    pickupLocationsMap,
    calculatePricingAsync,
  ])

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
    setPricingPreviewTotal(null)
    setPricingPreviewDeliveryPrice(null)
    setPricingPreviewEstimatedDate(null)
    setPricingPreviewAvailableFromDate(null)
    setPricingPreviewPickupByDate(null)
    setIsPricingPreviewUnavailable(false)
    setHasPricingPreviewResponse(false)
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
        express: false,
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

    const savePayload =
      formState.condition === 'Delivery'
        ? {
            mode: 'delivery' as const,
            payload: toDeliveryAddressPayload(formState),
          }
        : (() => {
            const pickupPayload = toPickupPayload(formState, pickupLocationsMap)
            if (!pickupPayload) return null
            return {
              mode: 'pickup' as const,
              payload: pickupPayload,
            }
          })()

    if (!savePayload) return

    const isSuccessful = await onSaveDelivery(savePayload)
    if (!isSuccessful) return

    setTouched(INITIAL_TOUCHED_STATE)
    setIsEditing(false)
  }

  return (
    <Stack spacing={2}>
      <Stack spacing={1.25} alignItems="flex-start">
        <Stack direction="row" spacing={0.75} alignItems="center">
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            {viewTitle}
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

              {formState.condition === 'Delivery' ? (
                <FormControlLabel
                  control={(
                    <Switch
                      checked={formState.express}
                      onChange={(event) => {
                        setFormState((current) => ({ ...current, express: event.target.checked }))
                      }}
                      data-testid="order-details-delivery-express-switch-field"
                    />
                  )}
                  label={ordersUiText.detailsPage.fields.delivery.express}
                  data-testid="order-details-delivery-express-switch"
                />
              ) : null}
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

            <Paper variant="outlined" sx={{ p: 1.5 }} data-testid="order-details-delivery-pricing-preview-card">
              <Stack spacing={1}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  {ordersUiText.detailsPage.labels.pricingPreview}
                </Typography>

                {canRequestPricingPreview && isPricingPreviewUnavailable ? (
                  <Alert severity="warning" data-testid="order-details-delivery-pricing-preview-unavailable-alert">
                    {ordersUiText.errors.pricingPreviewUnavailable}
                  </Alert>
                ) : null}

                <Box
                  sx={{
                    display: 'grid',
                    gap: 1,
                    gridTemplateColumns: {
                      xs: '1fr',
                      sm: 'repeat(2, minmax(180px, 1fr))',
                      lg: 'repeat(4, minmax(160px, 1fr))',
                    },
                  }}
                >
                  <Paper variant="outlined" sx={{ p: 1.25 }}>
                    <Stack spacing={0.5}>
                      <Typography variant="caption" color="text.secondary">
                        {ordersUiText.detailsPage.labels.totalPrice}
                      </Typography>
                      <Typography
                        variant="subtitle2"
                        sx={{ fontWeight: 700, minHeight: 24, display: 'flex', alignItems: 'center' }}
                        data-testid="order-details-delivery-pricing-preview-total-value"
                      >
                        {canRequestPricingPreview && isPricingPreviewLoading ? (
                          <CircularProgress size={16} />
                        ) : (
                          formatPrice(canRequestPricingPreview ? pricingPreviewTotal : null)
                        )}
                      </Typography>
                    </Stack>
                  </Paper>

                  <Paper variant="outlined" sx={{ p: 1.25 }}>
                    <Stack spacing={0.5}>
                      <Typography variant="caption" color="text.secondary">
                        {ordersUiText.detailsPage.labels.deliveryPrice}
                      </Typography>
                      <Typography
                        variant="subtitle2"
                        sx={{ fontWeight: 700, minHeight: 24, display: 'flex', alignItems: 'center' }}
                        data-testid="order-details-delivery-pricing-preview-delivery-price-value"
                      >
                        {canRequestPricingPreview && isPricingPreviewLoading ? (
                          <CircularProgress size={16} />
                        ) : (
                          formatPrice(canRequestPricingPreview ? pricingPreviewDeliveryPrice : null)
                        )}
                      </Typography>
                    </Stack>
                  </Paper>

                  {formState.condition === 'Delivery' ? (
                    <Paper variant="outlined" sx={{ p: 1.25 }}>
                      <Stack spacing={0.5}>
                        <Typography variant="caption" color="text.secondary">
                          {ordersUiText.detailsPage.fields.delivery.estimatedDate}
                        </Typography>
                        <Typography
                          variant="subtitle2"
                          sx={{ fontWeight: 700, minHeight: 24, display: 'flex', alignItems: 'center' }}
                          data-testid="order-details-delivery-pricing-preview-estimated-date-value"
                        >
                          {canRequestPricingPreview && isPricingPreviewLoading
                            ? '...'
                            : formatDate(canRequestPricingPreview ? pricingPreviewEstimatedDate : null)}
                        </Typography>
                      </Stack>
                    </Paper>
                  ) : (
                    <>
                      <Paper variant="outlined" sx={{ p: 1.25 }}>
                        <Stack spacing={0.5}>
                          <Typography variant="caption" color="text.secondary">
                            {ordersUiText.detailsPage.fields.delivery.availableFromDate}
                          </Typography>
                          <Typography
                            variant="subtitle2"
                            sx={{ fontWeight: 700, minHeight: 24, display: 'flex', alignItems: 'center' }}
                            data-testid="order-details-delivery-pricing-preview-available-from-date-value"
                          >
                            {canRequestPricingPreview && isPricingPreviewLoading
                              ? '...'
                              : formatDate(canRequestPricingPreview ? pricingPreviewAvailableFromDate : null)}
                          </Typography>
                        </Stack>
                      </Paper>

                      <Paper variant="outlined" sx={{ p: 1.25 }}>
                        <Stack spacing={0.5}>
                          <Typography variant="caption" color="text.secondary">
                            {ordersUiText.detailsPage.fields.delivery.pickupByDate}
                          </Typography>
                          <Typography
                            variant="subtitle2"
                            sx={{ fontWeight: 700, minHeight: 24, display: 'flex', alignItems: 'center' }}
                            data-testid="order-details-delivery-pricing-preview-pickup-by-date-value"
                          >
                            {canRequestPricingPreview && isPricingPreviewLoading
                              ? '...'
                              : formatDate(canRequestPricingPreview ? pricingPreviewPickupByDate : null)}
                          </Typography>
                        </Stack>
                      </Paper>
                    </>
                  )}
                </Box>
              </Stack>
            </Paper>

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
      ) : (
        <Paper
          variant="outlined"
          sx={{ p: { xs: 2, md: 2.5 }, borderRadius: 2.5 }}
          data-testid="order-details-delivery-view"
        >
          <Stack spacing={2}>
            {order.delivery.isOverdue ? (
              <Alert severity="error" variant="outlined" data-testid="order-details-delivery-overdue-alert">
                {getOverdueByDaysLabel(order.delivery.overdueByDays)}
              </Alert>
            ) : null}

            <Box
              sx={{
                display: 'grid',
                gap: 1.25,
                gridTemplateColumns: {
                  xs: '1fr',
                  sm: 'repeat(2, minmax(0, 1fr))',
                  lg: 'repeat(4, minmax(0, 1fr))',
                },
              }}
            >
            <Paper variant="outlined" sx={{ p: { xs: 2, md: 2.25 } }}>
              <Stack spacing={0.5}>
                <Typography variant="caption" color="text.secondary">
                  Method
                </Typography>
                <Typography
                  variant="subtitle2"
                  sx={{ fontWeight: 700 }}
                  data-testid="order-details-delivery-condition-value"
                >
                  {normalizeTextValue(order.delivery.condition)}
                </Typography>
              </Stack>
            </Paper>

            <Paper variant="outlined" sx={{ p: { xs: 2, md: 2.25 } }}>
              <Stack spacing={0.5}>
                <Typography variant="caption" color="text.secondary">
                  Price
                </Typography>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }} data-testid="order-details-delivery-price-value">
                  {isDeliveryCondition
                    ? formatPrice(order.delivery.price)
                    : order.delivery.price > 0
                      ? formatPrice(order.delivery.price)
                      : 'Free'}
                </Typography>
              </Stack>
            </Paper>

            {isDeliveryCondition ? (
              <>
                <Paper variant="outlined" sx={{ p: { xs: 2, md: 2.25 } }}>
                  <Stack spacing={0.5}>
                    <Typography variant="caption" color="text.secondary">
                      ETA
                    </Typography>
                    <Typography
                      variant="subtitle2"
                      sx={{ fontWeight: 700 }}
                      data-testid="order-details-delivery-estimated-date-value"
                    >
                      {resolveEstimatedDate(order.delivery)}
                    </Typography>
                  </Stack>
                </Paper>

                <Paper variant="outlined" sx={{ p: { xs: 2, md: 2.25 } }}>
                  <Stack spacing={0.5}>
                    <Typography variant="caption" color="text.secondary">
                      Express
                    </Typography>
                    <Typography
                      variant="subtitle2"
                      sx={{ fontWeight: 700 }}
                      data-testid="order-details-delivery-express-value"
                    >
                      {'express' in order.delivery.schedule && order.delivery.schedule.express ? 'Yes' : 'No'}
                    </Typography>
                  </Stack>
                </Paper>
              </>
            ) : (
              <>
                <Paper variant="outlined" sx={{ p: { xs: 2, md: 2.25 } }}>
                  <Stack spacing={0.5}>
                    <Typography variant="caption" color="text.secondary">
                      Available
                    </Typography>
                    <Typography
                      variant="subtitle2"
                      sx={{ fontWeight: 700 }}
                      data-testid="order-details-delivery-available-from-date-value"
                    >
                      {resolvePickupAvailableFrom(order.delivery)}
                    </Typography>
                  </Stack>
                </Paper>

                <Paper variant="outlined" sx={{ p: { xs: 2, md: 2.25 } }}>
                  <Stack spacing={0.5}>
                    <Typography variant="caption" color="text.secondary">
                      Pickup By
                    </Typography>
                    <Typography
                      variant="subtitle2"
                      sx={{ fontWeight: 700 }}
                      data-testid="order-details-delivery-pickup-by-date-value"
                    >
                      {resolvePickupByDate(order.delivery)}
                    </Typography>
                  </Stack>
                </Paper>
              </>
            )}
            </Box>

            <Box
              sx={{
                display: 'grid',
                gap: 1.25,
                gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) minmax(0, 1fr)' },
              }}
            >
            <Paper variant="outlined" sx={{ p: { xs: 2, md: 2.25 } }}>
              <Stack spacing={0.75}>
                <Typography fontWeight={700}>
                  {isDeliveryCondition ? 'Delivery Address' : 'Pickup Location'}
                </Typography>
                <Chip
                  size="small"
                  color="primary"
                  variant="outlined"
                  label={deliveryAddressSourceLabel}
                  sx={{ alignSelf: 'flex-start' }}
                  data-testid="order-details-delivery-view-source-chip"
                />
                <Typography data-testid="order-details-delivery-address-value">
                  {resolveAddressPrimaryLine(order.delivery.address)}
                </Typography>
                <Typography>{resolveAddressSecondaryLine(order.delivery.address)}</Typography>
              </Stack>
            </Paper>

            <Paper variant="outlined" sx={{ p: { xs: 2, md: 2.25 } }}>
              <Stack spacing={0.75}>
                <Typography fontWeight={700}>
                  {isDeliveryCondition ? 'Delivery Details' : 'Pickup Details'}
                </Typography>
                {isDeliveryCondition ? (
                  <>
                    <Typography data-testid="order-details-delivery-pricing-tier-value">
                      Tier: {resolvePricingTierLabel(order.delivery)}
                    </Typography>
                    <Typography>
                      Estimated:{' '}
                      {'estimatedDays' in order.delivery.schedule
                        ? formatDaysLabel(order.delivery.schedule.estimatedDays)
                        : '-'}
                    </Typography>
                  </>
                ) : (
                  <>
                    <Typography>
                      Ready in:{' '}
                      {'readyInDays' in order.delivery.schedule
                        ? formatDaysLabel(order.delivery.schedule.readyInDays)
                        : '-'}
                    </Typography>
                    <Typography>
                      Hold for:{' '}
                      {'holdForDays' in order.delivery.schedule
                        ? formatDaysLabel(order.delivery.schedule.holdForDays)
                        : '-'}
                    </Typography>
                  </>
                )}
                <Typography>Status: {resolveDeliveryStatusLabel(order.delivery.status)}</Typography>
              </Stack>
            </Paper>
            </Box>
          </Stack>
        </Paper>
      )}
    </Stack>
  )
}
