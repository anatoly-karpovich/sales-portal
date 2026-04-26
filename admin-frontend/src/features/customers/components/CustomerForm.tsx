import { Autocomplete, Box, Button, Paper, Stack, TextField, Typography } from '@mui/material'
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded'
import { Link } from 'react-router-dom'
import { useMemo, useState } from 'react'
import type { Customer, CustomerUpsertPayload } from '@/api/modules/customers.api'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { customersUiText, getCustomerFormTitle, getDeleteCustomerMessage } from '@/features/customers/customers.ui-text'
import {
  toCustomerFormInitialState,
  toCustomerFormTouchedState,
  toCustomerUpsertPayload,
} from '@/features/customers/forms/customerForm.mappers'
import type { CustomerFormTouchedState } from '@/features/customers/forms/customerForm.types'
import { validateCustomerForm } from '@/features/customers/forms/customerForm.validators'

type Mode = 'create' | 'edit'

type Props = {
  mode: Mode
  customer: Customer | null
  defaultCities: string[]
  isSubmitting: boolean
  isDeleting?: boolean
  onSubmit: (payload: CustomerUpsertPayload) => Promise<void>
  onDelete?: () => Promise<void>
}

const OTHER_CITY_OPTION_VALUE = '__other__'

type CityOption = {
  value: string
  label: string
}

function normalizeCityForMatch(value: string) {
  return value.trim().toLowerCase()
}

function toCityOptionTestId(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

function resolveInitialCitySelection(
  mode: Mode,
  city: string,
  defaultCities: string[],
): { selectedCityValue: string; customCity: string } {
  if (mode === 'create') {
    return {
      selectedCityValue: defaultCities[0] ?? OTHER_CITY_OPTION_VALUE,
      customCity: '',
    }
  }

  const normalizedCity = normalizeCityForMatch(city)
  const matchedDefaultCity = defaultCities.find(
    (defaultCity) => normalizeCityForMatch(defaultCity) === normalizedCity,
  )

  if (matchedDefaultCity) {
    return {
      selectedCityValue: matchedDefaultCity,
      customCity: '',
    }
  }

  return {
    selectedCityValue: OTHER_CITY_OPTION_VALUE,
    customCity: city,
  }
}

export function CustomerForm({
  mode,
  customer,
  defaultCities,
  isSubmitting,
  isDeleting = false,
  onSubmit,
  onDelete,
}: Props) {
  const initialState = useMemo(() => {
    const initialFormState = toCustomerFormInitialState(customer)
    const initialCitySelection = resolveInitialCitySelection(mode, initialFormState.city, defaultCities)

    return {
      formState: {
        ...initialFormState,
        city:
          initialCitySelection.selectedCityValue === OTHER_CITY_OPTION_VALUE
            ? initialCitySelection.customCity
            : initialCitySelection.selectedCityValue,
      },
      citySelection: initialCitySelection,
    }
  }, [customer, defaultCities, mode])

  const cityOptions = useMemo<CityOption[]>(
    () => [
      ...defaultCities.map((city) => ({ value: city, label: city })),
      {
        value: OTHER_CITY_OPTION_VALUE,
        label: customersUiText.citySelector.otherOption,
      },
    ],
    [defaultCities],
  )

  const [formState, setFormState] = useState(() => initialState.formState)
  const [selectedCityValue, setSelectedCityValue] = useState(() => initialState.citySelection.selectedCityValue)
  const [customCity, setCustomCity] = useState(() => initialState.citySelection.customCity)
  const [touched, setTouched] = useState<CustomerFormTouchedState>(toCustomerFormTouchedState())
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isSubmitLocked, setIsSubmitLocked] = useState(false)

  const initialPayload = useMemo(() => toCustomerUpsertPayload(initialState.formState), [initialState.formState])
  const validation = useMemo(() => validateCustomerForm(formState), [formState])
  const selectedCityOption = useMemo(
    () =>
      cityOptions.find((option) => option.value === selectedCityValue) ??
      cityOptions[cityOptions.length - 1] ??
      null,
    [cityOptions, selectedCityValue],
  )
  const isOtherCitySelected = selectedCityValue === OTHER_CITY_OPTION_VALUE

  const hasAnyChanges = useMemo(() => {
    const currentPayload = toCustomerUpsertPayload(formState)
    return JSON.stringify(currentPayload) !== JSON.stringify(initialPayload)
  }, [formState, initialPayload])

  const canSubmit =
    !validation.emailError &&
    !validation.nameError &&
    !validation.cityError &&
    !validation.streetError &&
    !validation.houseError &&
    !validation.flatError &&
    !validation.phoneError &&
    !validation.notesError &&
    hasAnyChanges &&
    !isSubmitting &&
    !isSubmitLocked

  const markTouched = (field: keyof CustomerFormTouchedState) => {
    setTouched((current) => ({ ...current, [field]: true }))
  }

  const resetToInitial = () => {
    setFormState(initialState.formState)
    setSelectedCityValue(initialState.citySelection.selectedCityValue)
    setCustomCity(initialState.citySelection.customCity)
    setTouched(toCustomerFormTouchedState())
  }

  const handleCityOptionChange = (nextOption: CityOption | null) => {
    if (!nextOption) return
    setSelectedCityValue(nextOption.value)

    if (nextOption.value === OTHER_CITY_OPTION_VALUE) {
      setFormState((current) => ({ ...current, city: customCity }))
      return
    }

    setFormState((current) => ({ ...current, city: nextOption.value }))
  }

  const handleCustomCityChange = (value: string) => {
    setCustomCity(value)
    if (!isOtherCitySelected) return
    setFormState((current) => ({ ...current, city: value }))
  }

  const submit = async () => {
    if (isSubmitting || isSubmitLocked) return

    setIsSubmitLocked(true)
    try {
      await onSubmit(toCustomerUpsertPayload(formState))
    } finally {
      setIsSubmitLocked(false)
    }
  }

  const confirmDelete = async () => {
    if (!onDelete) return
    await onDelete()
  }

  return (
    <Paper sx={{ p: { xs: 2, md: 3 } }} data-testid={`customers-upsert-form-${mode}`}>
      <Stack spacing={2.5} data-testid="customers-upsert-form-content">
        <Button
          component={Link}
          to="/customers"
          variant="text"
          startIcon={<ArrowBackRoundedIcon fontSize="small" />}
          sx={{ alignSelf: 'flex-start', px: 0, textTransform: 'none' }}
          data-testid="customers-upsert-back-to-list-link"
        >
          {customersUiText.form.backToCustomers}
        </Button>

        <Typography variant="h4" sx={{ fontWeight: 700 }} data-testid="customers-upsert-form-title">
          {getCustomerFormTitle(mode, customer?.name)}
        </Typography>

        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          }}
          data-testid="customers-upsert-form-grid-fields"
        >
          <TextField
            label={customersUiText.form.fields.email}
            placeholder={customersUiText.form.placeholders.email}
            value={formState.email}
            onChange={(event) => setFormState((current) => ({ ...current, email: event.target.value }))}
            onBlur={() => markTouched('email')}
            error={touched.email && Boolean(validation.emailError)}
            helperText={touched.email ? (validation.emailError ?? ' ') : ' '}
            data-testid="customers-upsert-email-input"
            inputProps={{ 'data-testid': 'customers-upsert-email-input-field' }}
          />

          <TextField
            label={customersUiText.form.fields.name}
            placeholder={customersUiText.form.placeholders.name}
            value={formState.name}
            onChange={(event) => setFormState((current) => ({ ...current, name: event.target.value }))}
            onBlur={() => markTouched('name')}
            error={touched.name && Boolean(validation.nameError)}
            helperText={touched.name ? (validation.nameError ?? ' ') : ' '}
            data-testid="customers-upsert-name-input"
            inputProps={{ 'data-testid': 'customers-upsert-name-input-field' }}
          />

          <Autocomplete
            options={cityOptions}
            value={selectedCityOption}
            disableClearable
            openOnFocus
            getOptionLabel={(option) => option.label}
            isOptionEqualToValue={(option, value) => option.value === value.value}
            onChange={(_, value) => {
              markTouched('city')
              handleCityOptionChange(value)
            }}
            noOptionsText={customersUiText.citySelector.noOptions}
            data-testid="customers-upsert-city-autocomplete"
            renderOption={(props, option) => {
              const { key, ...optionProps } = props
              const optionTestId =
                option.value === OTHER_CITY_OPTION_VALUE
                  ? 'customers-upsert-city-option-other'
                  : `customers-upsert-city-option-${toCityOptionTestId(option.value)}`

              return (
                <li key={key} {...optionProps} data-testid={optionTestId}>
                  {option.label}
                </li>
              )
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label={customersUiText.form.fields.city}
                placeholder={customersUiText.form.placeholders.city}
                onBlur={() => markTouched('city')}
                error={touched.city && Boolean(validation.cityError)}
                helperText={touched.city ? (validation.cityError ?? ' ') : ' '}
                data-testid="customers-upsert-city-input"
                inputProps={{
                  ...params.inputProps,
                  'data-testid': 'customers-upsert-city-input-field',
                }}
              />
            )}
          />

          <TextField
            label={customersUiText.form.fields.customCity}
            placeholder={customersUiText.form.placeholders.customCity}
            value={customCity}
            onChange={(event) => handleCustomCityChange(event.target.value)}
            onBlur={() => markTouched('city')}
            disabled={!isOtherCitySelected}
            error={isOtherCitySelected && touched.city && Boolean(validation.cityError)}
            helperText={isOtherCitySelected && touched.city ? (validation.cityError ?? ' ') : ' '}
            data-testid="customers-upsert-city-other-input"
            inputProps={{ 'data-testid': 'customers-upsert-city-other-input-field' }}
          />

          <TextField
            label={customersUiText.form.fields.street}
            placeholder={customersUiText.form.placeholders.street}
            value={formState.street}
            onChange={(event) => setFormState((current) => ({ ...current, street: event.target.value }))}
            onBlur={() => markTouched('street')}
            error={touched.street && Boolean(validation.streetError)}
            helperText={touched.street ? (validation.streetError ?? ' ') : ' '}
            data-testid="customers-upsert-street-input"
            inputProps={{ 'data-testid': 'customers-upsert-street-input-field' }}
          />

          <TextField
            label={customersUiText.form.fields.house}
            placeholder={customersUiText.form.placeholders.house}
            type="number"
            value={formState.house}
            onChange={(event) => setFormState((current) => ({ ...current, house: event.target.value }))}
            onBlur={() => markTouched('house')}
            error={touched.house && Boolean(validation.houseError)}
            helperText={touched.house ? (validation.houseError ?? ' ') : ' '}
            data-testid="customers-upsert-house-input"
            inputProps={{ 'data-testid': 'customers-upsert-house-input-field' }}
          />

          <TextField
            label={customersUiText.form.fields.flat}
            placeholder={customersUiText.form.placeholders.flat}
            type="number"
            value={formState.flat}
            onChange={(event) => setFormState((current) => ({ ...current, flat: event.target.value }))}
            onBlur={() => markTouched('flat')}
            error={touched.flat && Boolean(validation.flatError)}
            helperText={touched.flat ? (validation.flatError ?? ' ') : ' '}
            data-testid="customers-upsert-flat-input"
            inputProps={{ 'data-testid': 'customers-upsert-flat-input-field' }}
          />

          <TextField
            label={customersUiText.form.fields.phone}
            placeholder={customersUiText.form.placeholders.phone}
            value={formState.phone}
            onChange={(event) => setFormState((current) => ({ ...current, phone: event.target.value }))}
            onBlur={() => markTouched('phone')}
            error={touched.phone && Boolean(validation.phoneError)}
            helperText={touched.phone ? (validation.phoneError ?? ' ') : ' '}
            data-testid="customers-upsert-phone-input"
            inputProps={{ 'data-testid': 'customers-upsert-phone-input-field' }}
          />
        </Box>

        <TextField
          label={customersUiText.form.fields.notes}
          placeholder={customersUiText.form.placeholders.notes}
          value={formState.notes}
          multiline
          minRows={4}
          onChange={(event) => setFormState((current) => ({ ...current, notes: event.target.value }))}
          onBlur={() => markTouched('notes')}
          error={touched.notes && Boolean(validation.notesError)}
          helperText={touched.notes ? (validation.notesError ?? ' ') : ' '}
          data-testid="customers-upsert-notes-input"
          inputProps={{ 'data-testid': 'customers-upsert-notes-input-field' }}
        />

        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          data-testid="customers-upsert-form-actions"
        >
          <Button
            variant="contained"
            onClick={() => void submit()}
            disabled={!canSubmit}
            data-testid="customers-upsert-save-button"
          >
            {mode === 'create' ? customersUiText.form.actions.saveCreate : customersUiText.form.actions.saveEdit}
          </Button>
          {mode === 'create' ? (
            <Button onClick={resetToInitial} data-testid="customers-upsert-clear-button">
              {customersUiText.form.actions.clear}
            </Button>
          ) : (
            <Button
              color="error"
              variant="contained"
              onClick={() => setDeleteDialogOpen(true)}
              data-testid="customers-upsert-delete-button"
            >
              {customersUiText.form.actions.delete}
            </Button>
          )}
        </Stack>
      </Stack>

      <ConfirmDialog
        open={deleteDialogOpen}
        title={customersUiText.dialogs.deleteTitle}
        message={getDeleteCustomerMessage(customer?.name)}
        confirmLabel={customersUiText.dialogs.deleteConfirm}
        cancelLabel={customersUiText.dialogs.cancel}
        isSubmitting={isDeleting}
        onCancel={() => {
          if (isDeleting) return
          setDeleteDialogOpen(false)
        }}
        onConfirm={confirmDelete}
      />
    </Paper>
  )
}
