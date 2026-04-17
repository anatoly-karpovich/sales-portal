import type { Product, ProductUpsertPayload } from '@/api/modules/products.api'
import type { ProductFormState, ProductFormTouchedState } from '@/features/products/forms/productForm.types'
import { getDefaultManufacturer } from '@/features/products/options/manufacturerOptions'

export function toProductFormTouchedState(value = false): ProductFormTouchedState {
  return {
    name: value,
    amount: value,
    price: value,
    manufacturer: value,
    notes: value,
  }
}

export function toProductFormInitialState(product: Product | null): ProductFormState {
  const defaultManufacturer = getDefaultManufacturer()

  if (!product) {
    return {
      name: '',
      amount: '',
      price: '',
      manufacturer: defaultManufacturer,
      notes: '',
    }
  }

  return {
    name: product.name ?? '',
    amount: String(product.amount ?? ''),
    price: String(product.price ?? ''),
    manufacturer: product.manufacturer ?? defaultManufacturer,
    notes: product.notes ?? '',
  }
}

export function toProductUpsertPayload(state: ProductFormState): ProductUpsertPayload {
  return {
    name: state.name.trim(),
    amount: Number(state.amount),
    price: Number(state.price),
    manufacturer: state.manufacturer,
    notes: state.notes.trim(),
  }
}
