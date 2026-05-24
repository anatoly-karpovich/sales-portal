import { useState } from 'react'

export type ProductDetailsEditMode =
  | 'view'
  | 'info'
  | 'category'
  | 'variants'
  | 'single-variant'
  | 'attributes-order'

export function useProductDetailsEditMode() {
  const [mode, setMode] = useState<ProductDetailsEditMode>('view')

  const enterInfoMode = () => {
    setMode('info')
  }

  const enterVariantsMode = () => {
    setMode('variants')
  }

  const enterCategoryMode = () => {
    setMode('category')
  }

  const enterSingleVariantMode = () => {
    setMode('single-variant')
  }

  const enterAttributesOrderMode = () => {
    setMode('attributes-order')
  }

  const exitEditModes = () => {
    setMode('view')
  }

  return {
    mode,
    isViewMode: mode === 'view',
    isInfoMode: mode === 'info',
    isCategoryMode: mode === 'category',
    isVariantsMode: mode === 'variants',
    isSingleVariantMode: mode === 'single-variant',
    isAttributesOrderMode: mode === 'attributes-order',
    enterInfoMode,
    enterCategoryMode,
    enterVariantsMode,
    enterSingleVariantMode,
    enterAttributesOrderMode,
    exitEditModes,
  }
}
