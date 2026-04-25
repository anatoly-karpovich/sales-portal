export type CustomerFormState = {
  email: string
  name: string
  country: string
  city: string
  street: string
  house: string
  flat: string
  phone: string
  notes: string
}

export type CustomerFormTouchedState = {
  email: boolean
  name: boolean
  country: boolean
  city: boolean
  street: boolean
  house: boolean
  flat: boolean
  phone: boolean
  notes: boolean
}

export type CustomerFormValidation = {
  emailError: string | null
  nameError: string | null
  countryError: string | null
  cityError: string | null
  streetError: string | null
  houseError: string | null
  flatError: string | null
  phoneError: string | null
  notesError: string | null
}
