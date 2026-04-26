import type { CustomerFormState, CustomerFormValidation } from '@/features/customers/forms/customerForm.types'
import { customersUiText } from '@/features/customers/customers.ui-text'

export function validateCustomerForm(state: CustomerFormState): CustomerFormValidation {
  const email = state.email.trim()
  const emailIsValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

  const name = state.name.trim()
  const nameIsValid = /^(?!.*\s{2})[A-Za-z ]+$/.test(name) && name.length >= 1 && name.length <= 40

  const city = state.city.trim()
  const cityIsValid = /^(?!.*\s{2})[A-Za-z ]+$/.test(city) && city.length >= 1 && city.length <= 20

  const street = state.street.trim()
  const streetIsValid =
    /^(?!.*\s{2})[A-Za-z0-9 ]+$/.test(street) && street.length >= 1 && street.length <= 40

  const house = Number(state.house)
  const houseIsIntegerText = /^[0-9]{1,3}$/.test(state.house.trim())

  const flat = Number(state.flat)
  const flatIsIntegerText = /^[0-9]{1,4}$/.test(state.flat.trim())

  const phone = state.phone.trim()
  const phoneIsValid = /^\+[0-9]{10,20}$/.test(phone)

  const notes = state.notes.trim()
  const notesIsValid = /^[^<>]{0,250}$/.test(notes)

  return {
    emailError:
      email.length === 0
        ? customersUiText.validation.emailRequired
        : emailIsValid
          ? null
          : customersUiText.validation.emailInvalid,
    nameError:
      name.length === 0
        ? customersUiText.validation.nameRequired
        : nameIsValid
          ? null
          : customersUiText.validation.nameInvalid,
    cityError:
      city.length === 0
        ? customersUiText.validation.cityRequired
        : cityIsValid
          ? null
          : customersUiText.validation.cityInvalid,
    streetError:
      street.length === 0
        ? customersUiText.validation.streetRequired
        : streetIsValid
          ? null
          : customersUiText.validation.streetInvalid,
    houseError:
      state.house.trim().length === 0 ||
      Number.isNaN(house) ||
      !Number.isFinite(house) ||
      !houseIsIntegerText ||
      house < 1 ||
      house > 999
        ? customersUiText.validation.houseInvalid
        : null,
    flatError:
      state.flat.trim().length === 0 ||
      Number.isNaN(flat) ||
      !Number.isFinite(flat) ||
      !flatIsIntegerText ||
      flat < 1 ||
      flat > 9999
        ? customersUiText.validation.flatInvalid
        : null,
    phoneError:
      phone.length === 0
        ? customersUiText.validation.phoneRequired
        : phoneIsValid
          ? null
          : customersUiText.validation.phoneInvalid,
    notesError: notesIsValid ? null : customersUiText.validation.notesInvalid,
  }
}
