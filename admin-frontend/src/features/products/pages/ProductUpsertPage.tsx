import AddRoundedIcon from '@mui/icons-material/AddRounded'
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded'
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined'
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Step,
  StepButton,
  Stepper,
  TextField,
  Typography,
} from '@mui/material'
import { useSnackbar } from 'notistack'
import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import noImageProduct from '@/assets/no-image-product.jpeg'
import type { ProductVariant } from '@/api/modules/products.api'
import { ProductCategorySelector } from '@/features/products/components/ProductCategorySelector'
import type { InventoryInitialVariantPayload } from '@/api/modules/inventory.api'
import { useCategoriesWorkspaceQuery } from '@/features/categories/hooks/useCategoriesQuery'
import {
  applyAttributeValuesToVariants,
  buildAttributesPayloadFromDraft,
  buildPossibleCombinations,
  buildVariantCombinationKey,
  buildVariantDuplicateCounts,
  buildVariantsReplacePayloadFromDraft,
  createLocalId,
  isValidHttpUrl,
  normalizeAttributeKey,
  normalizeValues,
  parseCommaSeparatedValues,
  toProductVariantsDraft,
  toVariantTitle,
  validatePrice,
  type AttributeDraft,
  type ProductVariantsDraft,
  type VariantDraft,
} from '@/features/products/forms/productVariantsDraft'
import {
  useInventoryInitialSetupMutation,
  useInventoryDetailsQuery,
} from '@/features/inventory/hooks/useInventoryQuery'
import { useManufacturerOptions } from '@/features/products/hooks/useManufacturerOptions'
import {
  useCompleteProductSetupMutation,
  useDeleteProductMutation,
  useInitProductSetupMutation,
  usePatchProductMutation,
  useProductQuery,
  useSaveProductSetupSpecMutation,
} from '@/features/products/hooks/useProductsQuery'
import { getProductApiErrorMessage, productsUiText } from '@/features/products/products.ui-text'
import { useSettingsQuery } from '@/features/settings/hooks/useSettingsQuery'
import { formatPrice } from '@/utils/number'

const SETUP_STEPS = ['Parent Product', 'Attributes and Variants', 'Initial Inventory', 'Review']

type InventoryDraftRow = {
  variantId: string
  quantity: string
  lowStockThreshold: string
  allowSellingOutOfStock: boolean
}

const INVENTORY_SETUP_SAVED_KEY_PREFIX = 'admin-frontend-product-setup-inventory-saved:'

function getErrorStatus(error: unknown) {
  return (error as { response?: { status?: number } })?.response?.status
}

function getProductNameError(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return 'Name is required.'
  if (trimmed.length < 3 || trimmed.length > 40) return 'Name must be between 3 and 40 characters.'
  if (!/^[a-zA-Z0-9]+(?: [a-zA-Z0-9]+)*$/.test(trimmed)) {
    return 'Use letters, numbers and single spaces only.'
  }
  return ''
}

function getImageUrlError(value: string) {
  if (!value.trim()) return ''
  if (!isValidHttpUrl(value.trim())) return 'Image URL must be a valid http(s) URL.'
  return ''
}

function buildVariantDisplayName(
  variant: ProductVariant,
  parentName: string,
  attributeNames: Array<{ key: string; name: string }>,
) {
  const variantTitle = toVariantTitle(variant, attributeNames)
  if (variantTitle) return `${parentName} | ${variantTitle}`
  return parentName
}

function getInventorySetupSavedStorageKey(productId: string) {
  return `${INVENTORY_SETUP_SAVED_KEY_PREFIX}${productId}`
}

function markInventorySetupSaved(productId: string) {
  localStorage.setItem(getInventorySetupSavedStorageKey(productId), '1')
}

function clearInventorySetupSaved(productId: string) {
  localStorage.removeItem(getInventorySetupSavedStorageKey(productId))
}

function isInventorySetupSavedLocally(productId: string) {
  return localStorage.getItem(getInventorySetupSavedStorageKey(productId)) === '1'
}

export function ProductUpsertPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { enqueueSnackbar } = useSnackbar()

  const queryProductId = useMemo(() => {
    const params = new URLSearchParams(location.search)
    return params.get('productId')?.trim() || null
  }, [location.search])

  const categoriesQuery = useCategoriesWorkspaceQuery()
  const settingsQuery = useSettingsQuery()
  const {
    options: manufacturerOptions,
    isLoading: isManufacturersLoading,
    isConfigured,
  } = useManufacturerOptions()

  const [activeStep, setActiveStep] = useState(0)
  const [maxUnlockedStep, setMaxUnlockedStep] = useState(0)
  const [workingProductId, setWorkingProductId] = useState<string | null>(queryProductId)
  const [isSetupStepResolved, setIsSetupStepResolved] = useState(false)

  const [name, setName] = useState('')
  const [manufacturer, setManufacturer] = useState('')
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [description, setDescription] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [parentTouched, setParentTouched] = useState({ name: false, imageUrl: false })
  const [categoryTouched, setCategoryTouched] = useState(false)

  const [attributes, setAttributes] = useState<AttributeDraft[]>([])
  const [variants, setVariants] = useState<VariantDraft[]>([])
  const [inventoryDraftByVariantId, setInventoryDraftByVariantId] = useState<
    Record<string, InventoryDraftRow>
  >({})

  const initSetupMutation = useInitProductSetupMutation()
  const patchProductMutation = usePatchProductMutation()
  const saveSpecMutation = useSaveProductSetupSpecMutation()
  const saveInitialInventoryMutation = useInventoryInitialSetupMutation()
  const completeSetupMutation = useCompleteProductSetupMutation()
  const deleteProductMutation = useDeleteProductMutation()

  const productQuery = useProductQuery(workingProductId ?? '', Boolean(workingProductId))
  const inventoryDetailsQuery = useInventoryDetailsQuery(
    workingProductId ?? '',
    Boolean(workingProductId),
  )

  const isMutating =
    initSetupMutation.isPending ||
    patchProductMutation.isPending ||
    saveSpecMutation.isPending ||
    saveInitialInventoryMutation.isPending ||
    completeSetupMutation.isPending ||
    deleteProductMutation.isPending

  const defaultManufacturer = manufacturerOptions[0] ?? ''
  const selectedManufacturer = manufacturer || defaultManufacturer
  const defaultLowStockThreshold = settingsQuery.data?.inventory.defaultLowStockThreshold ?? 0

  const nameError = getProductNameError(name)
  const imageUrlError = getImageUrlError(imageUrl)
  const categoryError = selectedCategoryId ? '' : 'Category is required.'

  const hasCategories = (categoriesQuery.data?.flat?.length ?? 0) > 0

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWorkingProductId(queryProductId)
    setIsSetupStepResolved(false)
  }, [queryProductId])

  useEffect(() => {
    if (!workingProductId || !productQuery.data) return
    const product = productQuery.data

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setName(product.name)
    setManufacturer(product.manufacturer)
    setSelectedCategoryId(product.categoryId)
    setDescription(product.description ?? '')
    setImageUrl(product.imageUrl ?? '')

    const draft = toProductVariantsDraft(product)
    setAttributes(draft.attributes)
    setVariants(draft.variants)
  }, [productQuery.data, workingProductId])

  const isInventorySavedFromBackend = useMemo(() => {
    const product = productQuery.data
    const inventory = inventoryDetailsQuery.data
    if (!product || !inventory) return false
    if (product.variants.length === 0) return false

    const inventoryByVariantId = new Map(
      inventory.variants.map((variant) => [variant.variantId, variant]),
    )
    const variantIds = product.variants
      .map((variant) => variant._id)
      .filter((variantId): variantId is string => Boolean(variantId))

    if (variantIds.length === 0) return false
    if (variantIds.some((variantId) => !inventoryByVariantId.has(variantId))) return false

    // Heuristic: if any variant differs from setup defaults, assume initial inventory was explicitly saved.
    return variantIds.some((variantId) => {
      const variant = inventoryByVariantId.get(variantId)
      if (!variant) return false
      return (
        variant.quantity !== 0 ||
        variant.lowStockThreshold !== defaultLowStockThreshold ||
        variant.allowSellingOutOfStock !== false
      )
    })
  }, [defaultLowStockThreshold, inventoryDetailsQuery.data, productQuery.data])

  useEffect(() => {
    if (!workingProductId) return
    if (!productQuery.data) return
    if (isSetupStepResolved) return

    const product = productQuery.data
    if (product.setup?.completed) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsSetupStepResolved(true)
      return
    }

    if (product.variants.length === 0) {
      setActiveStep(1)
      setMaxUnlockedStep(1)
      setIsSetupStepResolved(true)
      return
    }

    if (inventoryDetailsQuery.isLoading) return

    const inventoryWasSaved =
      isInventorySetupSavedLocally(workingProductId) || isInventorySavedFromBackend

    if (inventoryWasSaved) {
      setActiveStep(3)
      setMaxUnlockedStep(3)
    } else {
      setActiveStep(2)
      setMaxUnlockedStep(2)
    }
    setIsSetupStepResolved(true)
  }, [
    inventoryDetailsQuery.isLoading,
    isInventorySavedFromBackend,
    isSetupStepResolved,
    productQuery.data,
    workingProductId,
  ])

  useEffect(() => {
    const product = productQuery.data
    if (!product) return
    if (product.setup?.completed === true) return

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setInventoryDraftByVariantId((current) => {
      const next: Record<string, InventoryDraftRow> = {}
      const inventoryById = new Map(
        (inventoryDetailsQuery.data?.variants ?? []).map((variant) => [variant.variantId, variant]),
      )

      product.variants.forEach((variant) => {
        const variantId = variant._id
        if (!variantId) return

        const existing = current[variantId]
        if (existing) {
          next[variantId] = existing
          return
        }

        const inventoryVariant = inventoryById.get(variantId)
        next[variantId] = {
          variantId,
          quantity: String(inventoryVariant?.quantity ?? 0),
          lowStockThreshold: String(
            inventoryVariant?.lowStockThreshold ?? defaultLowStockThreshold,
          ),
          allowSellingOutOfStock: inventoryVariant?.allowSellingOutOfStock ?? false,
        }
      })

      return next
    })
  }, [defaultLowStockThreshold, inventoryDetailsQuery.data?.variants, productQuery.data])

  useEffect(() => {
    if (!workingProductId || !productQuery.data) return
    if (productQuery.data.setup?.completed) {
      navigate(`/products/${workingProductId}`, { replace: true })
    }
  }, [navigate, productQuery.data, workingProductId])

  const normalizedAttributes = useMemo(
    () =>
      attributes.map((attribute) => ({
        ...attribute,
        normalizedName: normalizeAttributeKey(attribute.name),
        normalizedValues: normalizeValues(attribute.values),
      })),
    [attributes],
  )

  const duplicatedAttributeNames = useMemo(() => {
    const counts = new Map<string, number>()
    normalizedAttributes.forEach((attribute) => {
      if (!attribute.normalizedName) return
      counts.set(attribute.normalizedName, (counts.get(attribute.normalizedName) ?? 0) + 1)
    })
    return counts
  }, [normalizedAttributes])

  const attributeNameErrors = useMemo(() => {
    const errors = new Map<string, string>()
    normalizedAttributes.forEach((attribute) => {
      if (!attribute.normalizedName) {
        errors.set(attribute.id, 'Attribute name is required.')
        return
      }
      if ((duplicatedAttributeNames.get(attribute.normalizedName) ?? 0) > 1) {
        errors.set(attribute.id, 'Attribute names must be unique.')
      }
    })
    return errors
  }, [duplicatedAttributeNames, normalizedAttributes])

  const attributeValuesErrors = useMemo(() => {
    const errors = new Map<string, string>()
    normalizedAttributes.forEach((attribute) => {
      if (!attribute.normalizedName) return
      if (attribute.normalizedValues.length === 0) {
        errors.set(attribute.id, 'Add at least one attribute value.')
      }
    })
    return errors
  }, [normalizedAttributes])

  const hasAttributeErrors = attributeNameErrors.size > 0 || attributeValuesErrors.size > 0

  const duplicateCountsByKey = useMemo(() => buildVariantDuplicateCounts(variants), [variants])

  const variantValidation = useMemo(() => {
    const attributeByVariantId = new Map<string, Map<string, string>>()
    const priceByVariantId = new Map<string, string>()
    const imageByVariantId = new Map<string, string>()

    variants.forEach((variant) => {
      const attributeErrorsById = new Map<string, string>()
      const activeAttributes = attributes.filter((attribute) => attribute.name.trim().length > 0)

      for (const attribute of activeAttributes) {
        const attributeName = attribute.name.trim()
        const selectedValue = variant.attributesByAttributeId[attribute.id]
        if (!selectedValue) {
          attributeErrorsById.set(attribute.id, `${attributeName}: value is required.`)
          continue
        }
        const hasValue = attribute.values.some(
          (value) => value.trim().toLowerCase() === selectedValue.trim().toLowerCase(),
        )
        if (!hasValue) {
          attributeErrorsById.set(
            attribute.id,
            `${attributeName}: ${selectedValue} no longer exists in attribute values.`,
          )
        }
      }

      if (attributeErrorsById.size === 0) {
        const duplicateCount = duplicateCountsByKey.get(
          buildVariantCombinationKey(variant.attributesByAttributeId),
        )
        const firstAttributeId = activeAttributes[0]?.id
        if ((duplicateCount ?? 0) > 1 && firstAttributeId) {
          attributeErrorsById.set(
            firstAttributeId,
            'Variant with this attribute combination already exists.',
          )
        }
      }

      if (attributeErrorsById.size > 0) {
        attributeByVariantId.set(variant.id, attributeErrorsById)
      }

      const priceError = validatePrice(variant.price)
      if (priceError) {
        priceByVariantId.set(variant.id, priceError)
      }

      const variantImageUrl = variant.imageUrl.trim()
      if (variantImageUrl.length > 0 && !isValidHttpUrl(variantImageUrl)) {
        imageByVariantId.set(variant.id, 'Variant image URL must be a valid http(s) URL.')
      }
    })

    const invalidVariantIds = variants
      .filter(
        (variant) =>
          attributeByVariantId.has(variant.id) ||
          priceByVariantId.has(variant.id) ||
          imageByVariantId.has(variant.id),
      )
      .map((variant) => variant.id)

    return {
      attributeByVariantId,
      priceByVariantId,
      imageByVariantId,
      invalidVariantIds,
      invalidCount: invalidVariantIds.length,
    }
  }, [attributes, duplicateCountsByKey, variants])

  const invalidVariantsCount = useMemo(() => variantValidation.invalidCount, [variantValidation])

  const invalidVariantIds = useMemo(() => variantValidation.invalidVariantIds, [variantValidation])

  const possibleCombinations = useMemo(() => buildPossibleCombinations(attributes), [attributes])
  const hasReachedMaxVariants =
    possibleCombinations.length > 0 && variants.length >= possibleCombinations.length

  const inventoryValidationErrors = useMemo(() => {
    const product = productQuery.data
    if (!product) return new Map<string, string>()
    const errors = new Map<string, string>()

    product.variants.forEach((variant) => {
      const variantId = variant._id
      if (!variantId) return
      const row = inventoryDraftByVariantId[variantId]
      if (!row) {
        errors.set(variantId, 'Variant inventory settings are required.')
        return
      }
      const quantity = Number(row.quantity.trim())
      if (!Number.isInteger(quantity) || quantity < 0) {
        errors.set(variantId, 'Quantity must be an integer 0 or greater.')
        return
      }
      const threshold = Number(row.lowStockThreshold.trim())
      if (!Number.isInteger(threshold) || threshold < 0) {
        errors.set(variantId, 'Low stock threshold must be an integer 0 or greater.')
      }
    })

    return errors
  }, [inventoryDraftByVariantId, productQuery.data])

  const canSaveInitStep =
    !nameError &&
    selectedManufacturer.trim().length > 0 &&
    !categoryError &&
    !imageUrlError &&
    isConfigured &&
    hasCategories &&
    !isMutating

  const canSaveSpecStep =
    !isMutating && !hasAttributeErrors && variants.length > 0 && invalidVariantsCount === 0

  const canSaveInventoryStep =
    !isMutating &&
    Boolean(productQuery.data) &&
    (productQuery.data?.variants.length ?? 0) > 0 &&
    inventoryValidationErrors.size === 0

  const canCompleteSetup = !isMutating && Boolean(workingProductId)

  const productForReview = productQuery.data
  const categoryForReview = categoriesQuery.data?.flat?.find(
    (item) => item._id === selectedCategoryId,
  )

  const handleOpenStep = (stepIndex: number) => {
    if (stepIndex > maxUnlockedStep) return
    setActiveStep(stepIndex)
  }

  const handleContinue = () => {
    const next = Math.min(activeStep + 1, SETUP_STEPS.length - 1)
    setActiveStep(next)
    setMaxUnlockedStep((current) => Math.max(current, next))
  }

  const handleBack = () => {
    setActiveStep((current) => Math.max(current - 1, 0))
  }

  const handleSaveInitStep = async () => {
    setCategoryTouched(true)
    setParentTouched({ name: true, imageUrl: true })

    if (!canSaveInitStep) return

    try {
      if (workingProductId) {
        await patchProductMutation.mutateAsync({
          productId: workingProductId,
          payload: {
            name: name.trim(),
            manufacturer: selectedManufacturer.trim(),
            categoryId: selectedCategoryId ?? '',
            description: description.trim() || undefined,
            imageUrl: imageUrl.trim() || undefined,
          },
        })
      } else {
        const product = await initSetupMutation.mutateAsync({
          name: name.trim(),
          manufacturer: selectedManufacturer.trim(),
          categoryId: selectedCategoryId ?? '',
          description: description.trim() || undefined,
          imageUrl: imageUrl.trim() || undefined,
        })
        setWorkingProductId(product._id)
      }

      enqueueSnackbar('Draft product saved.', { variant: 'success' })
      handleContinue()
    } catch (error) {
      const status = getErrorStatus(error)
      enqueueSnackbar(getProductApiErrorMessage(status), { variant: 'error' })
      if (status === 409 && workingProductId) {
        navigate(`/products/${workingProductId}`)
      }
    }
  }

  const handleSaveSpecStep = async () => {
    if (!workingProductId || !canSaveSpecStep) return

    const draft: ProductVariantsDraft = {
      name,
      manufacturer: selectedManufacturer,
      description,
      imageUrl,
      attributes,
      variants,
    }

    try {
      await saveSpecMutation.mutateAsync({
        productId: workingProductId,
        payload: {
          attributes: buildAttributesPayloadFromDraft(draft),
          variants: buildVariantsReplacePayloadFromDraft(draft).map((variant) => ({
            price: variant.price,
            attributes: variant.attributes,
            imageUrl: variant.imageUrl,
          })),
        },
      })
      enqueueSnackbar('Attributes and variants saved.', { variant: 'success' })
      handleContinue()
    } catch (error) {
      const status = getErrorStatus(error)
      enqueueSnackbar(getProductApiErrorMessage(status), { variant: 'error' })
      if (status === 409) {
        navigate(`/products/${workingProductId}`)
      }
    }
  }

  const handleSaveInitialInventoryStep = async () => {
    if (!workingProductId || !productQuery.data || !canSaveInventoryStep) return

    const payloadVariants: InventoryInitialVariantPayload[] = productQuery.data.variants
      .filter((variant) => Boolean(variant._id))
      .map((variant) => {
        const variantId = variant._id as string
        const row = inventoryDraftByVariantId[variantId]
        return {
          variantId,
          quantity: Number(row.quantity.trim()),
          lowStockThreshold: Number(row.lowStockThreshold.trim()),
          allowSellingOutOfStock: row.allowSellingOutOfStock,
        }
      })

    try {
      await saveInitialInventoryMutation.mutateAsync({
        productId: workingProductId,
        payload: { variants: payloadVariants },
      })
      markInventorySetupSaved(workingProductId)
      enqueueSnackbar('Initial inventory saved.', { variant: 'success' })
      handleContinue()
    } catch (error) {
      const status = getErrorStatus(error)
      enqueueSnackbar(getProductApiErrorMessage(status), { variant: 'error' })
      if (status === 409) {
        navigate(`/products/${workingProductId}`)
      }
    }
  }

  const handleCompleteSetup = async () => {
    if (!workingProductId || !canCompleteSetup) return

    try {
      await completeSetupMutation.mutateAsync(workingProductId)
      clearInventorySetupSaved(workingProductId)
      enqueueSnackbar('Product setup completed.', { variant: 'success' })
      navigate(`/products/${workingProductId}`)
    } catch (error) {
      const status = getErrorStatus(error)
      enqueueSnackbar(getProductApiErrorMessage(status), { variant: 'error' })
      if (status === 409) {
        navigate(`/products/${workingProductId}`)
      }
    }
  }

  const handleDeleteDraft = async () => {
    if (!workingProductId || isMutating) return

    try {
      await deleteProductMutation.mutateAsync(workingProductId)
      clearInventorySetupSaved(workingProductId)
      enqueueSnackbar(productsUiText.toasts.deleted, { variant: 'success' })
      navigate('/products')
    } catch (error) {
      enqueueSnackbar(getProductApiErrorMessage(getErrorStatus(error)), { variant: 'error' })
    }
  }

  const handleAddAttribute = () => {
    const attributeId = createLocalId()
    setAttributes((current) => [
      ...current,
      {
        id: attributeId,
        name: '',
        values: [],
        inputValue: '',
      },
    ])
    setVariants((current) =>
      current.map((variant) => ({
        ...variant,
        attributesByAttributeId: {
          ...variant.attributesByAttributeId,
          [attributeId]: '',
        },
      })),
    )
  }

  const handleAttributeNameChange = (attributeId: string, nextName: string) => {
    setAttributes((current) =>
      current.map((attribute) =>
        attribute.id === attributeId
          ? {
              ...attribute,
              name: nextName,
            }
          : attribute,
      ),
    )
  }

  const commitAttributeValues = (attributeId: string, rawValues: string[]) => {
    const incoming = normalizeValues(rawValues.flatMap(parseCommaSeparatedValues))
    setAttributes((current) =>
      current.map((attribute) =>
        attribute.id === attributeId
          ? {
              ...attribute,
              values: incoming,
              inputValue: '',
            }
          : attribute,
      ),
    )
    setVariants((current) => applyAttributeValuesToVariants(current, attributeId, incoming))
  }

  const handleAttributeInputChange = (attributeId: string, inputValue: string) => {
    setAttributes((current) =>
      current.map((attribute) =>
        attribute.id === attributeId
          ? {
              ...attribute,
              inputValue,
            }
          : attribute,
      ),
    )
  }

  const handleAttributeInputCommit = (attributeId: string) => {
    const target = attributes.find((attribute) => attribute.id === attributeId)
    if (!target) return

    const nextValues = normalizeValues([
      ...target.values,
      ...parseCommaSeparatedValues(target.inputValue),
    ])

    setAttributes((current) =>
      current.map((attribute) =>
        attribute.id === attributeId
          ? {
              ...attribute,
              values: nextValues,
              inputValue: '',
            }
          : attribute,
      ),
    )
  }

  const handleRemoveAttribute = (attributeId: string) => {
    setAttributes((current) => current.filter((attribute) => attribute.id !== attributeId))
    setVariants((current) =>
      current.map((variant) => {
        const nextAttributes = { ...variant.attributesByAttributeId }
        delete nextAttributes[attributeId]
        return {
          ...variant,
          attributesByAttributeId: nextAttributes,
        }
      }),
    )
  }

  const handleAddVariant = () => {
    const attributesByAttributeId: Record<string, string> = {}
    attributes.forEach((attribute) => {
      attributesByAttributeId[attribute.id] = attribute.values[0] ?? ''
    })

    setVariants((current) => [
      ...current,
      {
        id: createLocalId(),
        attributesByAttributeId,
        price: '',
        imageUrl: '',
        status: 'Draft',
      },
    ])
  }

  const handleGenerateAllCombinations = () => {
    const normalizedExistingVariants = attributes.reduce((currentVariants, attribute) => {
      const normalizedAttributeValues = normalizeValues(attribute.values)
      return applyAttributeValuesToVariants(
        currentVariants,
        attribute.id,
        normalizedAttributeValues,
      )
    }, variants)

    const existingKeys = new Set(
      normalizedExistingVariants.map((variant) =>
        buildVariantCombinationKey(variant.attributesByAttributeId),
      ),
    )

    const generated: VariantDraft[] = []
    possibleCombinations.forEach((combination) => {
      const combinationKey = buildVariantCombinationKey(combination)
      if (existingKeys.has(combinationKey)) return
      existingKeys.add(combinationKey)
      generated.push({
        id: createLocalId(),
        attributesByAttributeId: combination,
        price: '',
        imageUrl: '',
        status: 'Draft',
      })
    })

    setVariants([...normalizedExistingVariants, ...generated])
  }

  const handleRemoveVariant = (variantId: string) => {
    setVariants((current) => current.filter((variant) => variant.id !== variantId))
  }

  const handleVariantAttributeChange = (
    variantId: string,
    attributeId: string,
    nextValue: string,
  ) => {
    setVariants((current) =>
      current.map((variant) =>
        variant.id === variantId
          ? {
              ...variant,
              attributesByAttributeId: {
                ...variant.attributesByAttributeId,
                [attributeId]: nextValue,
              },
            }
          : variant,
      ),
    )
  }

  const handleVariantFieldChange = (
    variantId: string,
    field: 'price' | 'imageUrl',
    nextValue: string,
  ) => {
    setVariants((current) =>
      current.map((variant) =>
        variant.id === variantId
          ? {
              ...variant,
              [field]: nextValue,
            }
          : variant,
      ),
    )
  }

  const handleRemoveInvalidVariants = () => {
    setVariants((current) => current.filter((variant) => !invalidVariantIds.includes(variant.id)))
  }

  const renderInitStep = () => (
    <Stack spacing={2} data-testid="products-setup-init-step">
      <Paper variant="outlined" sx={{ p: { xs: 1.5, md: 2 } }}>
        <Stack spacing={1.5}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Parent product
          </Typography>

          <Box
            sx={{
              display: 'grid',
              gap: 2,
              gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
            }}
          >
            <TextField
              label="Name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              onBlur={() => setParentTouched((current) => ({ ...current, name: true }))}
              error={parentTouched.name && Boolean(nameError)}
              helperText={parentTouched.name ? nameError || ' ' : ' '}
              data-testid="products-setup-init-name-input"
              inputProps={{ 'data-testid': 'products-setup-init-name-input-field' }}
            />

            <TextField
              label="Manufacturer"
              select
              value={selectedManufacturer}
              onChange={(event) => setManufacturer(event.target.value)}
              data-testid="products-setup-init-manufacturer-select"
              SelectProps={{
                inputProps: {
                  'data-testid': 'products-setup-init-manufacturer-select-field',
                },
              }}
            >
              {manufacturerOptions.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="Parent image URL"
              value={imageUrl}
              onChange={(event) => setImageUrl(event.target.value)}
              onBlur={() => setParentTouched((current) => ({ ...current, imageUrl: true }))}
              error={parentTouched.imageUrl && Boolean(imageUrlError)}
              helperText={parentTouched.imageUrl ? imageUrlError || ' ' : ' '}
              data-testid="products-setup-init-image-url-input"
              inputProps={{ 'data-testid': 'products-setup-init-image-url-input-field' }}
            />

            <TextField
              label="Description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              multiline
              minRows={4}
              sx={{ gridColumn: '1 / -1' }}
              data-testid="products-setup-init-description-input"
              inputProps={{ 'data-testid': 'products-setup-init-description-input-field' }}
            />
          </Box>
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: { xs: 1.5, md: 2 } }}>
        <Stack spacing={1.5}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Product category
          </Typography>
          <ProductCategorySelector
            tree={categoriesQuery.data?.tree ?? []}
            flat={categoriesQuery.data?.flat ?? []}
            selectedCategoryId={selectedCategoryId}
            onChange={(categoryId) => {
              setSelectedCategoryId(categoryId)
              setCategoryTouched(true)
            }}
            disabled={isMutating}
            testIdPrefix="products-setup-init-category-selector"
          />
          {categoryTouched && categoryError ? (
            <Typography variant="caption" color="error">
              {categoryError}
            </Typography>
          ) : null}
        </Stack>
      </Paper>

      <Stack direction="row" spacing={1}>
        <Button
          variant="contained"
          onClick={() => void handleSaveInitStep()}
          disabled={!canSaveInitStep}
          data-testid="products-setup-init-save-button"
        >
          Save and Continue
        </Button>
      </Stack>
    </Stack>
  )

  const renderSpecStep = () => (
    <Stack spacing={2} data-testid="products-setup-spec-step">
      <Paper variant="outlined" sx={{ p: { xs: 1.5, md: 2 } }}>
        <Stack spacing={1.5}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Attributes
            </Typography>
            <Button variant="outlined" startIcon={<AddRoundedIcon />} onClick={handleAddAttribute}>
              Add Attribute
            </Button>
          </Stack>

          {attributes.length === 0 ? (
            <Alert severity="info" sx={{ background: 'inherit' }}>
              Attributes are optional. You can create a single variant without attributes.
            </Alert>
          ) : null}

          <Stack spacing={1.25}>
            {attributes.map((attribute, index) => (
              <Paper key={attribute.id} variant="outlined" sx={{ p: 1.25 }}>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
                  <TextField
                    label="Attribute name"
                    value={attribute.name}
                    onChange={(event) =>
                      handleAttributeNameChange(attribute.id, event.target.value)
                    }
                    error={attributeNameErrors.has(attribute.id)}
                    helperText={attributeNameErrors.get(attribute.id) ?? ' '}
                    sx={{ width: { xs: '100%', md: 260 } }}
                    inputProps={{
                      'data-testid': `products-setup-spec-attribute-row-${index}-name-input-field`,
                    }}
                  />
                  <Autocomplete
                    multiple
                    freeSolo
                    options={[]}
                    value={attribute.values}
                    inputValue={attribute.inputValue}
                    onInputChange={(_, nextValue) =>
                      handleAttributeInputChange(attribute.id, nextValue)
                    }
                    onChange={(_, nextValues) =>
                      commitAttributeValues(attribute.id, nextValues as string[])
                    }
                    renderTags={(value: readonly string[], getTagProps) =>
                      value.map((option: string, valueIndex: number) => {
                        const { key, ...chipProps } = getTagProps({ index: valueIndex })
                        return (
                          <Chip
                            key={key}
                            label={option}
                            {...chipProps}
                            data-testid={`products-setup-spec-attribute-row-${index}-value-chip-${valueIndex}`}
                          />
                        )
                      })
                    }
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Values"
                        placeholder="Type value and press Enter"
                        error={attributeValuesErrors.has(attribute.id)}
                        helperText={
                          attributeValuesErrors.get(attribute.id) ??
                          'Example: Black, White, Red. Duplicates are not allowed.'
                        }
                        onBlur={() => handleAttributeInputCommit(attribute.id)}
                        onKeyDown={(event) => {
                          if (event.key !== 'Enter' && event.key !== ',') return
                          event.preventDefault()
                          handleAttributeInputCommit(attribute.id)
                        }}
                        inputProps={{
                          ...params.inputProps,
                          'data-testid': `products-setup-spec-attribute-row-${index}-values-input-field`,
                        }}
                      />
                    )}
                    sx={{ flex: 1 }}
                  />
                  <IconButton color="error" onClick={() => handleRemoveAttribute(attribute.id)}>
                    <DeleteOutlineOutlinedIcon fontSize="small" />
                  </IconButton>
                </Stack>
              </Paper>
            ))}
          </Stack>
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: { xs: 1.5, md: 2 } }}>
        <Stack spacing={1.5}>
          <Stack direction={{ xs: 'column', lg: 'row' }} justifyContent="space-between" gap={1}>
            <Stack direction="row" spacing={1}>
              <Chip label={`${attributes.length} attributes`} />
              <Chip label={`${possibleCombinations.length} combinations`} />
              <Chip label={`${variants.length} variants`} />
              {invalidVariantsCount > 0 ? (
                <Chip color="error" label={`${invalidVariantsCount} invalid`} />
              ) : null}
            </Stack>
            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                onClick={handleAddVariant}
                disabled={hasReachedMaxVariants || isMutating}
              >
                Add One Variant
              </Button>
              <Button
                variant="contained"
                onClick={handleGenerateAllCombinations}
                disabled={possibleCombinations.length === 0 || hasReachedMaxVariants || isMutating}
              >
                Generate All Combinations
              </Button>
              {invalidVariantsCount > 0 ? (
                <Button color="error" variant="contained" onClick={handleRemoveInvalidVariants}>
                  Remove Invalid
                </Button>
              ) : null}
            </Stack>
          </Stack>

          {variants.length === 0 ? (
            <Paper
              variant="outlined"
              sx={{ py: 4, px: 2, borderStyle: 'dashed', textAlign: 'center' }}
            >
              <Typography variant="h6">No variants yet</Typography>
              <Typography color="text.secondary">
                Add one variant manually or generate all possible combinations from attributes.
              </Typography>
            </Paper>
          ) : (
            <Box
              sx={{
                display: 'grid',
                gap: 1.5,
                gridTemplateColumns: { xs: '1fr', xl: '1fr 1fr' },
              }}
            >
              {variants.map((variant, index) => {
                const variantAttributeErrors =
                  variantValidation.attributeByVariantId.get(variant.id) ??
                  new Map<string, string>()
                const priceError = variantValidation.priceByVariantId.get(variant.id) ?? ''
                const imageError = variantValidation.imageByVariantId.get(variant.id) ?? ''
                return (
                  <Paper key={variant.id} variant="outlined" sx={{ p: 1.5 }}>
                    <Stack spacing={1.25}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                          Variant #{index + 1}
                        </Typography>
                        <IconButton color="error" onClick={() => handleRemoveVariant(variant.id)}>
                          <DeleteOutlineOutlinedIcon fontSize="small" />
                        </IconButton>
                      </Stack>

                      <Box
                        sx={{
                          display: 'grid',
                          gap: 1.25,
                          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                        }}
                      >
                        {attributes.map((attribute, attributeIndex) => (
                          <TextField
                            key={`${variant.id}-${attribute.id}`}
                            label={`${attribute.name.trim() || 'Attribute'}*`}
                            select
                            value={variant.attributesByAttributeId[attribute.id] ?? ''}
                            onChange={(event) =>
                              handleVariantAttributeChange(
                                variant.id,
                                attribute.id,
                                event.target.value,
                              )
                            }
                            SelectProps={{
                              inputProps: {
                                'data-testid': `products-setup-spec-variant-card-${index}-attribute-${attributeIndex}-select-field`,
                              },
                            }}
                            error={Boolean(variantAttributeErrors.get(attribute.id))}
                            helperText={variantAttributeErrors.get(attribute.id) ?? ' '}
                          >
                            <MenuItem value="">Select value</MenuItem>
                            {attribute.values.map((value) => (
                              <MenuItem key={value} value={value}>
                                {value}
                              </MenuItem>
                            ))}
                          </TextField>
                        ))}

                        <TextField
                          label="Price"
                          value={variant.price}
                          onChange={(event) =>
                            handleVariantFieldChange(variant.id, 'price', event.target.value)
                          }
                          error={Boolean(priceError)}
                          helperText={priceError || ' '}
                          inputProps={{ inputMode: 'decimal' }}
                        />

                        <TextField
                          label="Variant image URL"
                          value={variant.imageUrl}
                          onChange={(event) =>
                            handleVariantFieldChange(variant.id, 'imageUrl', event.target.value)
                          }
                          error={Boolean(imageError)}
                          helperText={imageError || ' '}
                        />
                      </Box>
                    </Stack>
                  </Paper>
                )
              })}
            </Box>
          )}
        </Stack>
      </Paper>

      <Stack direction="row" spacing={1}>
        <Button variant="outlined" onClick={handleBack} disabled={activeStep === 0 || isMutating}>
          Back
        </Button>
        <Button
          variant="contained"
          onClick={() => void handleSaveSpecStep()}
          disabled={!canSaveSpecStep}
          data-testid="products-setup-spec-save-button"
        >
          Save and Continue
        </Button>
      </Stack>
    </Stack>
  )

  const renderInitialInventoryStep = () => {
    const product = productQuery.data
    if (!product) {
      return (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography color="text.secondary">
            Load a draft product before configuring inventory.
          </Typography>
        </Paper>
      )
    }

    return (
      <Stack spacing={2} data-testid="products-setup-inventory-step">
        <Paper variant="outlined" sx={{ p: { xs: 1.5, md: 2 } }}>
          <Stack spacing={1}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Initial inventory per variant
            </Typography>
            <Typography color="text.secondary">
              Configure quantity, threshold and direct-order setting for each variant. All variants
              are saved in one request.
            </Typography>
          </Stack>
        </Paper>

        <Stack spacing={1.5}>
          {product.variants.map((variant, index) => {
            const variantId = variant._id
            if (!variantId) return null

            const row = inventoryDraftByVariantId[variantId]
            const validationError = inventoryValidationErrors.get(variantId)
            const variantImage = variant.imageUrl?.trim() || imageUrl.trim() || noImageProduct

            return (
              <Paper
                key={variantId}
                variant="outlined"
                sx={{ p: 1.5, borderColor: validationError ? 'error.main' : 'divider' }}
              >
                <Stack spacing={1.25}>
                  <Stack
                    direction={{ xs: 'column', md: 'row' }}
                    spacing={1.25}
                    alignItems={{ xs: 'flex-start', md: 'center' }}
                  >
                    <Box
                      component="img"
                      src={variantImage}
                      alt={buildVariantDisplayName(variant, product.name, product.attributes)}
                      sx={{
                        width: 56,
                        height: 56,
                        borderRadius: 1,
                        border: 1,
                        borderColor: 'divider',
                        objectFit: 'cover',
                        flexShrink: 0,
                      }}
                    />
                    <Typography sx={{ fontWeight: 700 }}>
                      {buildVariantDisplayName(variant, product.name, product.attributes) ||
                        `Variant #${index + 1}`}
                    </Typography>
                  </Stack>

                  <Box
                    sx={{
                      display: 'grid',
                      gap: 1.25,
                      gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' },
                    }}
                  >
                    <TextField
                      label="Quantity"
                      type="number"
                      value={row?.quantity ?? '0'}
                      onChange={(event) =>
                        setInventoryDraftByVariantId((current) => ({
                          ...current,
                          [variantId]: {
                            variantId,
                            quantity: event.target.value,
                            lowStockThreshold:
                              current[variantId]?.lowStockThreshold ??
                              String(defaultLowStockThreshold),
                            allowSellingOutOfStock:
                              current[variantId]?.allowSellingOutOfStock ?? false,
                          },
                        }))
                      }
                      inputProps={{ min: 0, step: 1, inputMode: 'numeric' }}
                    />
                    <TextField
                      label="Low Stock Threshold"
                      type="number"
                      value={row?.lowStockThreshold ?? String(defaultLowStockThreshold)}
                      onChange={(event) =>
                        setInventoryDraftByVariantId((current) => ({
                          ...current,
                          [variantId]: {
                            variantId,
                            quantity: current[variantId]?.quantity ?? '0',
                            lowStockThreshold: event.target.value,
                            allowSellingOutOfStock:
                              current[variantId]?.allowSellingOutOfStock ?? false,
                          },
                        }))
                      }
                      inputProps={{ min: 0, step: 1, inputMode: 'numeric' }}
                    />
                    <TextField
                      select
                      label="Direct Order"
                      value={(row?.allowSellingOutOfStock ?? false) ? 'Allowed' : 'Blocked'}
                      onChange={(event) =>
                        setInventoryDraftByVariantId((current) => ({
                          ...current,
                          [variantId]: {
                            variantId,
                            quantity: current[variantId]?.quantity ?? '0',
                            lowStockThreshold:
                              current[variantId]?.lowStockThreshold ??
                              String(defaultLowStockThreshold),
                            allowSellingOutOfStock: event.target.value === 'Allowed',
                          },
                        }))
                      }
                    >
                      <MenuItem value="Allowed">Allowed</MenuItem>
                      <MenuItem value="Blocked">Blocked</MenuItem>
                    </TextField>
                  </Box>

                  {validationError ? (
                    <Typography variant="caption" color="error">
                      {validationError}
                    </Typography>
                  ) : null}
                </Stack>
              </Paper>
            )
          })}
        </Stack>

        <Stack direction="row" spacing={1}>
          <Button variant="outlined" onClick={handleBack} disabled={activeStep === 0 || isMutating}>
            Back
          </Button>
          <Button
            variant="contained"
            onClick={() => void handleSaveInitialInventoryStep()}
            disabled={!canSaveInventoryStep}
            data-testid="products-setup-inventory-save-button"
          >
            Save and Continue
          </Button>
        </Stack>
      </Stack>
    )
  }

  const renderReviewStep = () => {
    const product = productForReview
    if (!product) {
      return (
        <Paper variant="outlined" sx={{ p: { xs: 1.5, md: 2 } }}>
          <Typography color="text.secondary">Load product draft before review.</Typography>
        </Paper>
      )
    }

    const parentImage = product.imageUrl?.trim() || imageUrl.trim() || noImageProduct

    return (
      <Stack spacing={2} data-testid="products-setup-review-step">
        <Paper variant="outlined" sx={{ p: { xs: 1.5, md: 2 } }}>
          <Stack spacing={1.25}>
            <Typography
              variant="h6"
              sx={{ fontWeight: 700 }}
              data-testid="products-setup-review-parent-title"
            >
              Parent Product
            </Typography>

            <Paper variant="outlined" sx={{ p: 1.5 }}>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
                <Box
                  component="img"
                  src={parentImage}
                  alt={product.name}
                  sx={{
                    width: { xs: 80, md: 96 },
                    height: { xs: 80, md: 96 },
                    borderRadius: 1,
                    border: 1,
                    borderColor: 'divider',
                    objectFit: 'cover',
                    flexShrink: 0,
                  }}
                />

                <Stack spacing={0.75} sx={{ minWidth: 0 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700 }} noWrap title={product.name}>
                    {product.name}
                  </Typography>
                  <Typography color="text.secondary">{product.manufacturer}</Typography>
                  <Typography color="text.secondary">
                    {categoryForReview?.path.map((item) => item.name).join(' / ') || '-'}
                  </Typography>
                  <Typography>{product.description || '-'}</Typography>
                </Stack>
              </Stack>
            </Paper>
          </Stack>
        </Paper>

        <Paper variant="outlined" sx={{ p: { xs: 1.5, md: 2 } }}>
          <Stack spacing={1.5}>
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              justifyContent="space-between"
              alignItems={{ xs: 'flex-start', md: 'center' }}
              gap={1}
            >
              <Typography
                variant="h6"
                sx={{ fontWeight: 700 }}
                data-testid="products-setup-review-variants-title"
              >
                Variants Review
              </Typography>

              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Chip label={`${product.attributes.length} attributes`} />
                <Chip label={`${product.variants.length} variants`} />
              </Stack>
            </Stack>

            <Stack spacing={1.25}>
              {product.variants.map((variant, index) => {
                const variantId = variant._id
                const variantImage =
                  variant.imageUrl?.trim() || product.imageUrl?.trim() || noImageProduct
                const inventoryDraft = variantId ? inventoryDraftByVariantId[variantId] : null
                const variantDisplayName =
                  buildVariantDisplayName(variant, product.name, product.attributes) ||
                  `Variant #${index + 1}`
                const variantAttributes = Object.entries(variant.attributes ?? {})
                  .map(([key, value]) => {
                    const attributeName =
                      product.attributes.find((attribute) => attribute.key === key)?.name ?? key
                    return `${attributeName}: ${value}`
                  })
                  .filter(Boolean)

                return (
                  <Paper
                    key={`${variantId ?? variantDisplayName}-${index}`}
                    variant="outlined"
                    sx={{ p: 1.5 }}
                    data-testid={`products-setup-review-variant-row-${index}`}
                  >
                    <Stack spacing={1.25}>
                      <Stack
                        direction={{ xs: 'column', md: 'row' }}
                        justifyContent="space-between"
                        alignItems={{ xs: 'flex-start', md: 'center' }}
                        gap={1}
                      >
                        <Stack direction="row" spacing={1.25} alignItems="center">
                          <Box
                            component="img"
                            src={variantImage}
                            alt={variantDisplayName}
                            sx={{
                              width: 56,
                              height: 56,
                              borderRadius: 1,
                              border: 1,
                              borderColor: 'divider',
                              objectFit: 'cover',
                              flexShrink: 0,
                            }}
                          />
                          <Stack spacing={0.25}>
                            <Typography
                              sx={{ fontWeight: 700 }}
                              data-testid={`products-setup-review-variant-row-${index}-title`}
                            >
                              {variantDisplayName}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Variant #{index + 1}
                            </Typography>
                          </Stack>
                        </Stack>

                        <Chip size="small" label={variant.status} variant="outlined" />
                      </Stack>

                      <Box
                        sx={{
                          display: 'grid',
                          gap: 1.25,
                          gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1fr) minmax(0, 1fr)' },
                        }}
                      >
                        <Paper variant="outlined" sx={{ p: 1.25 }}>
                          <Stack spacing={0.75}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                              Variant Specification
                            </Typography>
                            <Stack
                              direction="row"
                              spacing={1}
                              alignItems="center"
                              flexWrap="wrap"
                              useFlexGap
                            >
                              <Typography color="text.secondary">Price:</Typography>
                              <Typography sx={{ fontWeight: 700 }}>
                                {formatPrice(variant.price)}
                              </Typography>
                            </Stack>
                            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                              {variantAttributes.length > 0 ? (
                                variantAttributes.map((label) => (
                                  <Chip key={label} label={label} size="small" />
                                ))
                              ) : (
                                <Typography color="text.secondary">No attributes.</Typography>
                              )}
                            </Stack>
                          </Stack>
                        </Paper>

                        <Paper variant="outlined" sx={{ p: 1.25 }}>
                          <Stack spacing={0.75}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                              Initial Inventory
                            </Typography>
                            <Stack spacing={0.5}>
                              <Typography>
                                Quantity: <b>{inventoryDraft?.quantity ?? '0'}</b>
                              </Typography>
                              <Typography>
                                Low Stock Threshold:{' '}
                                <b>
                                  {inventoryDraft?.lowStockThreshold ??
                                    String(defaultLowStockThreshold)}
                                </b>
                              </Typography>
                              <Typography>
                                Direct Order:{' '}
                                <b>
                                  {inventoryDraft?.allowSellingOutOfStock ? 'Allowed' : 'Blocked'}
                                </b>
                              </Typography>
                            </Stack>
                          </Stack>
                        </Paper>
                      </Box>
                    </Stack>
                  </Paper>
                )
              })}
            </Stack>
          </Stack>
        </Paper>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
          <Button variant="outlined" onClick={handleBack} disabled={activeStep === 0 || isMutating}>
            Back
          </Button>
          <Button
            variant="contained"
            onClick={() => void handleCompleteSetup()}
            disabled={!canCompleteSetup}
          >
            Complete Setup
          </Button>
          {workingProductId ? (
            <Button color="error" onClick={() => void handleDeleteDraft()} disabled={isMutating}>
              Delete Draft
            </Button>
          ) : null}
        </Stack>
      </Stack>
    )
  }

  if (isManufacturersLoading || categoriesQuery.isLoading) {
    return (
      <Paper sx={{ p: 3 }} data-testid="products-setup-loading">
        <Typography>Loading catalog settings...</Typography>
      </Paper>
    )
  }

  if (!isConfigured) {
    return (
      <Stack spacing={2} data-testid="products-setup-manufacturers-unavailable">
        <Alert severity="warning">
          Catalog manufacturers are not configured. Product creation is unavailable.
        </Alert>
        <Button component={Link} to="/products" variant="outlined" sx={{ alignSelf: 'flex-start' }}>
          Back to Products
        </Button>
      </Stack>
    )
  }

  if (categoriesQuery.isError || !hasCategories) {
    return (
      <Stack spacing={2} data-testid="products-setup-categories-unavailable">
        <Alert severity="warning">
          {hasCategories
            ? 'Unable to load categories. Product creation is unavailable.'
            : 'Create at least one category before adding products.'}
        </Alert>
        <Button
          component={Link}
          to="/categories"
          variant="outlined"
          sx={{ alignSelf: 'flex-start' }}
        >
          Go to Categories
        </Button>
      </Stack>
    )
  }

  if (workingProductId && productQuery.isLoading) {
    return (
      <Paper sx={{ p: 3 }} data-testid="products-setup-product-loading">
        <Typography>Loading draft product...</Typography>
      </Paper>
    )
  }

  if (workingProductId && (productQuery.isError || !productQuery.data)) {
    return (
      <Paper sx={{ p: 3 }} data-testid="products-setup-product-error">
        <Stack spacing={2} alignItems="flex-start">
          <Alert severity="error">Product draft is unavailable.</Alert>
          <Button component={Link} to="/products" variant="outlined">
            Back to Products
          </Button>
        </Stack>
      </Paper>
    )
  }

  return (
    <Stack spacing={2.5} data-testid="products-setup-page">
      <Button
        component={Link}
        to="/products"
        variant="text"
        startIcon={<ArrowBackRoundedIcon fontSize="small" />}
        sx={{ alignSelf: 'flex-start', px: 0, textTransform: 'none' }}
        data-testid="products-setup-back-to-list-link"
      >
        Products
      </Button>

      <Paper sx={{ p: { xs: 2, md: 3 } }}>
        <Stack spacing={2.5}>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            justifyContent="space-between"
            alignItems={{ xs: 'flex-start', md: 'center' }}
          >
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              Product Setup
            </Typography>
            <Chip label="Draft" color="warning" variant="outlined" />
          </Stack>

          <Divider />

          <Stepper activeStep={activeStep} alternativeLabel>
            {SETUP_STEPS.map((label, index) => (
              <Step key={label} completed={index < maxUnlockedStep}>
                <StepButton
                  color="inherit"
                  onClick={() => handleOpenStep(index)}
                  disabled={index > maxUnlockedStep || isMutating}
                >
                  {label}
                </StepButton>
              </Step>
            ))}
          </Stepper>

          {activeStep === 0 ? renderInitStep() : null}
          {activeStep === 1 ? renderSpecStep() : null}
          {activeStep === 2 ? renderInitialInventoryStep() : null}
          {activeStep === 3 ? renderReviewStep() : null}
        </Stack>
      </Paper>
    </Stack>
  )
}
