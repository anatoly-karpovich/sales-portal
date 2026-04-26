import type { Customer, CustomerUpsertPayload } from '@/api/modules/customers.api'
import type { CustomerFormState, CustomerFormTouchedState } from '@/features/customers/forms/customerForm.types'

export function toCustomerFormTouchedState(value = false): CustomerFormTouchedState {
  return {
    email: value,
    name: value,
    city: value,
    street: value,
    house: value,
    flat: value,
    phone: value,
    notes: value,
  }
}

export function toCustomerFormInitialState(customer: Customer | null): CustomerFormState {
  if (!customer) {
    return {
      email: '',
      name: '',
      city: '',
      street: '',
      house: '',
      flat: '',
      phone: '',
      notes: '',
    }
  }

  return {
    email: customer.email ?? '',
    name: customer.name ?? '',
    city: customer.city ?? '',
    street: customer.street ?? '',
    house: String(customer.house ?? ''),
    flat: String(customer.flat ?? ''),
    phone: customer.phone ?? '',
    notes: customer.notes ?? '',
  }
}

export function toCustomerUpsertPayload(state: CustomerFormState): CustomerUpsertPayload {
  return {
    email: state.email.trim(),
    name: state.name.trim(),
    city: state.city.trim(),
    street: state.street.trim(),
    house: Number(state.house),
    flat: Number(state.flat),
    phone: state.phone.trim(),
    notes: state.notes.trim(),
  }
}
