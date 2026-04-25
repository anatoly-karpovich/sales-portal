import type { ProductFormState, ProductFormValidation } from '@/features/products/forms/productForm.types'
import { isManufacturerOption } from '@/features/products/options/manufacturerOptions'
import { productsUiText } from '@/features/products/products.ui-text'

export function validateProductForm(state: ProductFormState): ProductFormValidation {
  const name = state.name.trim()
  const nameIsValid = /^\b(?!.*?\s{2})[A-Za-z0-9 ]{3,40}\b$/m.test(name)

  const amount = Number(state.amount)
  const amountIsIntegerText = /^[0-9]{1,3}$/m.test(state.amount.trim())

  const price = Number(state.price)
  const priceIsIntegerText = /^[0-9]{1,5}$/m.test(state.price.trim())

  const notes = state.notes.trim()
  const notesIsValid = /^[^<>]{0,250}$/m.test(notes)
  const manufacturerIsValid = isManufacturerOption(state.manufacturer)

  return {
    nameError: name.length === 0 ? productsUiText.validation.nameRequired : nameIsValid ? null : productsUiText.validation.nameInvalid,
    amountError:
      state.amount.trim().length === 0 ||
      Number.isNaN(amount) ||
      !Number.isFinite(amount) ||
      !amountIsIntegerText ||
      amount < 0 ||
      amount > 999
        ? productsUiText.validation.amountInvalid
        : null,
    priceError:
      state.price.trim().length === 0 ||
      Number.isNaN(price) ||
      !Number.isFinite(price) ||
      !priceIsIntegerText ||
      price < 1 ||
      price > 99999
        ? productsUiText.validation.priceInvalid
        : null,
    manufacturerError: manufacturerIsValid ? null : productsUiText.validation.manufacturerRequired,
    notesError: notesIsValid ? null : productsUiText.validation.notesInvalid,
  }
}
