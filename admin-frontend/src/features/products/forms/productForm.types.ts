export type ProductFormState = {
  name: string
  amount: string
  price: string
  manufacturer: string
  notes: string
}

export type ProductFormTouchedState = {
  name: boolean
  amount: boolean
  price: boolean
  manufacturer: boolean
  notes: boolean
}

export type ProductFormValidation = {
  nameError: string | null
  amountError: string | null
  priceError: string | null
  manufacturerError: string | null
  notesError: string | null
}
