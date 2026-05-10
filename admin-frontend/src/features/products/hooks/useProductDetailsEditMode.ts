import { useState } from 'react'

export type ProductDetailsEditMode = 'view' | 'info' | 'variants' | 'single-variant'

export function useProductDetailsEditMode() {
  const [mode, setMode] = useState<ProductDetailsEditMode>('view')
  const [singleVariantId, setSingleVariantId] = useState<string | null>(null)

  const enterInfoMode = () => {
    setMode('info')
    setSingleVariantId(null)
  }

  const enterVariantsMode = () => {
    setMode('variants')
    setSingleVariantId(null)
  }

  const enterSingleVariantMode = (variantId: string) => {
    setMode('single-variant')
    setSingleVariantId(variantId)
  }

  const exitEditModes = () => {
    setMode('view')
    setSingleVariantId(null)
  }

  return {
    mode,
    singleVariantId,
    isViewMode: mode === 'view',
    isInfoMode: mode === 'info',
    isVariantsMode: mode === 'variants',
    isSingleVariantMode: mode === 'single-variant',
    enterInfoMode,
    enterVariantsMode,
    enterSingleVariantMode,
    exitEditModes,
  }
}
