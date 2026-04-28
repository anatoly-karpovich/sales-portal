import type { Customer, CustomerUpsertPayload } from '@/api/modules/customers.api'
import type { CustomerFormState, CustomerFormTouchedState } from '@/features/customers/forms/customerForm.types'

export function toCustomerFormTouchedState(value = false): CustomerFormTouchedState {
  return {
    email: value,
    name: value,
    state: value,
    city: value,
    street: value,
    house: value,
    apartment: value,
    zipCode: value,
    phone: value,
    notes: value,
  }
}

export function toCustomerFormInitialState(customer: Customer | null): CustomerFormState {
  if (!customer) {
    return {
      email: '',
      name: '',
      state: '',
      city: '',
      street: '',
      house: '',
      apartment: '',
      zipCode: '',
      phone: '',
      notes: '',
    }
  }

  return {
    email: customer.email ?? '',
    name: customer.name ?? '',
    state: customer.state ?? '',
    city: customer.city ?? '',
    street: customer.street ?? '',
    house: String(customer.house ?? ''),
    apartment: customer.apartment ? String(customer.apartment) : '',
    zipCode: customer.zipCode ?? '',
    phone: customer.phone ?? '',
    notes: customer.notes ?? '',
  }
}

export function toCustomerUpsertPayload(state: CustomerFormState): CustomerUpsertPayload {
  const apartment = state.apartment.trim()

  return {
    email: state.email.trim(),
    name: state.name.trim(),
    state: state.state.trim(),
    city: state.city.trim(),
    street: state.street.trim(),
    house: Number(state.house),
    ...(apartment.length > 0 ? { apartment: Number(apartment) } : {}),
    zipCode: state.zipCode.trim(),
    phone: state.phone.trim(),
    notes: state.notes.trim(),
  }
}
