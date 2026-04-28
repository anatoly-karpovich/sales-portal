export type CustomerFormState = {
  email: string
  name: string
  state: string
  city: string
  street: string
  house: string
  apartment: string
  zipCode: string
  phone: string
  notes: string
}

export type CustomerFormTouchedState = {
  email: boolean
  name: boolean
  state: boolean
  city: boolean
  street: boolean
  house: boolean
  apartment: boolean
  zipCode: boolean
  phone: boolean
  notes: boolean
}

export type CustomerFormValidation = {
  emailError: string | null
  nameError: string | null
  stateError: string | null
  cityError: string | null
  streetError: string | null
  houseError: string | null
  apartmentError: string | null
  zipCodeError: string | null
  phoneError: string | null
  notesError: string | null
}
