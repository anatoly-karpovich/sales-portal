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
  TextField,
  Typography,
} from '@mui/material'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { ProductUpsertPayload } from '@/api/modules/products.api'
import {
  getProductImageUrlError,
  getProductNameError,
} from '@/features/products/forms/productParentValidation'
import { ProductCategorySelector } from '@/features/products/components/ProductCategorySelector'
import type { AttributeDraft, VariantDraft } from '@/features/products/forms/productVariantsDraft'
import {
  buildPossibleCombinations,
  buildProductUpsertPayloadFromDraft,
  buildVariantCombinationKey,
  buildVariantDuplicateCounts,
  createLocalId,
  isValidHttpUrl,
  normalizeAttributeKey,
  normalizeValues,
  parseCommaSeparatedValues,
  validatePrice,
} from '@/features/products/forms/productVariantsDraft'
import { useCategoriesWorkspaceQuery } from '@/features/categories/hooks/useCategoriesQuery'
import { useManufacturerOptions } from '@/features/products/hooks/useManufacturerOptions'

type Props = {
  isSubmitting: boolean
  onSubmit: (payload: ProductUpsertPayload) => Promise<void>
}

export function ProductCreateVariantsForm({ isSubmitting, onSubmit }: Props) {
  const categoriesQuery = useCategoriesWorkspaceQuery()
  const {
    options: manufacturerOptions,
    isLoading: isManufacturersLoading,
    isConfigured,
  } = useManufacturerOptions()
  const [name, setName] = useState('')
  const [manufacturer, setManufacturer] = useState('')
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [description, setDescription] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [parentTouched, setParentTouched] = useState({
    name: false,
    imageUrl: false,
  })
  const [categoryTouched, setCategoryTouched] = useState(false)
  const [attributes, setAttributes] = useState<AttributeDraft[]>([])
  const [variants, setVariants] = useState<VariantDraft[]>([])

  const defaultManufacturer = manufacturerOptions[0] ?? ''
  const selectedManufacturer = manufacturer || defaultManufacturer

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

  const attributeErrors = useMemo(() => {
    const errors = new Map<string, string>()

    normalizedAttributes.forEach((attribute) => {
      if (!attribute.normalizedName) {
        errors.set(attribute.id, 'Attribute name is required.')
        return
      }

      if ((duplicatedAttributeNames.get(attribute.normalizedName) ?? 0) > 1) {
        errors.set(attribute.id, 'Attribute names must be unique.')
        return
      }

      if (attribute.normalizedValues.length === 0) {
        errors.set(attribute.id, 'Add at least one attribute value.')
      }
    })

    return errors
  }, [duplicatedAttributeNames, normalizedAttributes])

  const duplicateCountsByKey = useMemo(() => buildVariantDuplicateCounts(variants), [variants])

  const variantErrors = useMemo(() => {
    const errors = new Map<string, string>()
    variants.forEach((variant) => {
      let error = ''

      for (const attribute of attributes) {
        const attributeName = attribute.name.trim()
        if (!attributeName) {
          error = 'Attribute name is required.'
          break
        }

        const selectedValue = variant.attributesByAttributeId[attribute.id]
        if (!selectedValue) {
          error = `${attributeName}: value is required.`
          break
        }

        const hasValue = attribute.values.some(
          (value) => value.trim().toLowerCase() === selectedValue.trim().toLowerCase(),
        )
        if (!hasValue) {
          error = `${attributeName}: ${selectedValue} no longer exists in attribute values.`
          break
        }
      }

      if (!error) {
        const duplicateCount = duplicateCountsByKey.get(
          buildVariantCombinationKey(variant.attributesByAttributeId),
        )
        if ((duplicateCount ?? 0) > 1) {
          error = 'Variant with this attribute combination already exists.'
        }
      }

      if (!error) {
        error = validatePrice(variant.price)
      }

      const imageUrl = variant.imageUrl.trim()
      if (!error && imageUrl.length > 0 && !isValidHttpUrl(imageUrl)) {
        error = 'Variant image URL must be a valid http(s) URL.'
      }

      errors.set(variant.id, error)
    })

    return errors
  }, [attributes, duplicateCountsByKey, variants])

  const invalidVariantsCount = useMemo(
    () =>
      variants.reduce((count, variant) => {
        const error = variantErrors.get(variant.id)
        return error ? count + 1 : count
      }, 0),
    [variantErrors, variants],
  )

  const possibleCombinations = useMemo(() => buildPossibleCombinations(attributes), [attributes])
  const hasReachedMaxVariants =
    possibleCombinations.length > 0 && variants.length >= possibleCombinations.length

  const nameError = getProductNameError(name)
  const imageUrlError = getProductImageUrlError(imageUrl, isValidHttpUrl)
  const categoryError = selectedCategoryId ? '' : 'Category is required.'
  const hasCategories = (categoriesQuery.data?.flat?.length ?? 0) > 0

  const hasAttributeErrors = attributeErrors.size > 0
  const canSave =
    !nameError &&
    selectedManufacturer.trim().length > 0 &&
    !categoryError &&
    !imageUrlError &&
    !hasAttributeErrors &&
    variants.length > 0 &&
    invalidVariantsCount === 0 &&
    isConfigured &&
    hasCategories &&
    !isSubmitting

  if (isManufacturersLoading || categoriesQuery.isLoading) {
    return (
      <Paper sx={{ p: 3 }} data-testid="products-upsert-manufacturers-loading">
        <Typography>Loading catalog settings...</Typography>
      </Paper>
    )
  }

  if (!isConfigured) {
    return (
      <Stack spacing={2} data-testid="products-upsert-manufacturers-unavailable">
        <Alert severity="warning">
          Catalog manufacturers are not configured. Product creation is unavailable.
        </Alert>
        <Button component={Link} to="/products" variant="outlined" sx={{ alignSelf: 'flex-start' }}>
          Back to Products
        </Button>
      </Stack>
    )
  }

  if (categoriesQuery.isError) {
    return (
      <Stack spacing={2} data-testid="products-upsert-categories-unavailable">
        <Alert severity="warning">Unable to load categories. Product creation is unavailable.</Alert>
        <Button component={Link} to="/products" variant="outlined" sx={{ alignSelf: 'flex-start' }}>
          Back to Products
        </Button>
      </Stack>
    )
  }

  if (!hasCategories) {
    return (
      <Stack spacing={2} data-testid="products-upsert-categories-empty">
        <Alert severity="warning">Create at least one category before adding products.</Alert>
        <Button component={Link} to="/categories" variant="outlined" sx={{ alignSelf: 'flex-start' }}>
          Go to Categories
        </Button>
      </Stack>
    )
  }

  const handleAddAttribute = () => {
    setAttributes((current) => [
      ...current,
      {
        id: createLocalId(),
        name: '',
        values: [],
        inputValue: '',
      },
    ])
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
    const existingKeys = new Set(
      variants.map((variant) => buildVariantCombinationKey(variant.attributesByAttributeId)),
    )

    const generated: VariantDraft[] = []
    possibleCombinations.forEach((combination) => {
      const combinationKey = buildVariantCombinationKey(combination)
      if (existingKeys.has(combinationKey)) {
        return
      }

      existingKeys.add(combinationKey)
      generated.push({
        id: createLocalId(),
        attributesByAttributeId: combination,
        price: '',
        imageUrl: '',
        status: 'Draft',
      })
    })

    if (generated.length > 0) {
      setVariants((current) => [...current, ...generated])
    }
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
    setVariants((current) =>
      current.filter((variant) => {
        const error = variantErrors.get(variant.id)
        return !error
      }),
    )
  }

  const handleSave = async () => {
    setCategoryTouched(true)
    if (!canSave) return

    const payload = buildProductUpsertPayloadFromDraft({
      name,
      manufacturer: selectedManufacturer,
      description,
      imageUrl,
      attributes,
      variants,
    }, selectedCategoryId ?? '')

    await onSubmit(payload)
  }

  return (
    <Stack spacing={2.5} data-testid="products-upsert-create-form">
      <Button
        component={Link}
        to="/products"
        variant="text"
        startIcon={<ArrowBackRoundedIcon fontSize="small" />}
        sx={{ alignSelf: 'flex-start', px: 0, textTransform: 'none' }}
        data-testid="products-upsert-back-to-list-link"
      >
        Products
      </Button>

      <Paper sx={{ p: { xs: 2, md: 3 } }} data-testid="products-upsert-create-panel">
        <Stack spacing={2.5}>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            alignItems={{ xs: 'flex-start', md: 'center' }}
            justifyContent="space-between"
            gap={1.5}
          >
            <Typography
              variant="h4"
              sx={{ fontWeight: 700 }}
              data-testid="products-upsert-form-title"
            >
              Add New Product
            </Typography>
            <Chip
              label="Draft Product"
              color="warning"
              variant="outlined"
              data-testid="products-upsert-create-status-chip"
            />
          </Stack>

          <Divider />

          <Paper
            variant="outlined"
            sx={{ p: { xs: 1.5, md: 2 } }}
            data-testid="products-upsert-parent-section"
          >
            <Stack spacing={1.5}>
              <Box>
                <Typography
                  variant="h6"
                  sx={{ fontWeight: 700 }}
                  data-testid="products-upsert-parent-title"
                >
                  Parent product
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  data-testid="products-upsert-parent-caption"
                >
                  Base product information. Variant image overrides parent image when provided.
                </Typography>
              </Box>

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
                  onBlur={() =>
                    setParentTouched((current) => ({
                      ...current,
                      name: true,
                    }))
                  }
                  error={parentTouched.name && Boolean(nameError)}
                  helperText={parentTouched.name ? nameError || ' ' : ' '}
                  data-testid="products-upsert-parent-name-input"
                  inputProps={{ 'data-testid': 'products-upsert-parent-name-input-field' }}
                />

                <TextField
                  label="Manufacturer"
                  select
                  value={selectedManufacturer}
                  onChange={(event) => setManufacturer(event.target.value)}
                  data-testid="products-upsert-parent-manufacturer-select"
                  SelectProps={{
                    inputProps: {
                      'data-testid': 'products-upsert-parent-manufacturer-select-field',
                    },
                  }}
                >
                  {manufacturerOptions.map((option) => (
                    <MenuItem
                      key={option}
                      value={option}
                      data-testid={`products-upsert-parent-manufacturer-option-${option
                        .toLowerCase()
                        .replace(/\s+/g, '-')}`}
                    >
                      {option}
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  label="Parent image URL"
                  value={imageUrl}
                  onChange={(event) => setImageUrl(event.target.value)}
                  onBlur={() =>
                    setParentTouched((current) => ({
                      ...current,
                      imageUrl: true,
                    }))
                  }
                  error={parentTouched.imageUrl && Boolean(imageUrlError)}
                  helperText={parentTouched.imageUrl ? imageUrlError || ' ' : ' '}
                  data-testid="products-upsert-parent-image-url-input"
                  inputProps={{
                    'data-testid': 'products-upsert-parent-image-url-input-field',
                  }}
                />

                <TextField
                  label="Description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  multiline
                  minRows={4}
                  sx={{ gridColumn: '1 / -1' }}
                  data-testid="products-upsert-parent-description-input"
                  inputProps={{
                    'data-testid': 'products-upsert-parent-description-input-field',
                  }}
                />
              </Box>
            </Stack>
          </Paper>

          <Paper
            variant="outlined"
            sx={{ p: { xs: 1.5, md: 2 } }}
            data-testid="products-upsert-category-section"
          >
            <Stack spacing={1.5}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700 }} data-testid="products-upsert-category-title">
                  Product category
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  data-testid="products-upsert-category-caption"
                >
                  Select the leaf category where this product should be placed.
                </Typography>
              </Box>

              <ProductCategorySelector
                tree={categoriesQuery.data?.tree ?? []}
                flat={categoriesQuery.data?.flat ?? []}
                selectedCategoryId={selectedCategoryId}
                onChange={(categoryId) => {
                  setSelectedCategoryId(categoryId)
                  setCategoryTouched(true)
                }}
                disabled={isSubmitting}
                testIdPrefix="products-upsert-category-selector"
              />

              {categoryTouched && categoryError ? (
                <Typography
                  variant="caption"
                  color="error"
                  data-testid="products-upsert-category-validation-error"
                >
                  {categoryError}
                </Typography>
              ) : null}
            </Stack>
          </Paper>

          <Paper
            variant="outlined"
            sx={{ p: { xs: 1.5, md: 2 } }}
            data-testid="products-upsert-attributes-section"
          >
            <Stack spacing={1.5}>
              <Stack
                direction={{ xs: 'column', md: 'row' }}
                justifyContent="space-between"
                alignItems={{ xs: 'flex-start', md: 'center' }}
                gap={1.25}
              >
                <Box>
                  <Typography
                    variant="h6"
                    sx={{ fontWeight: 700 }}
                    data-testid="products-upsert-attributes-title"
                  >
                    Attributes
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    data-testid="products-upsert-attributes-caption"
                  >
                    Create unique attributes and available values. Values will be used to build
                    variants.
                  </Typography>
                </Box>

                <Button
                  variant="outlined"
                  startIcon={<AddRoundedIcon />}
                  onClick={handleAddAttribute}
                  data-testid="products-upsert-attributes-add-button"
                >
                  Add Attribute
                </Button>
              </Stack>

              <Stack spacing={1.25} data-testid="products-upsert-attributes-list">
                {attributes.length === 0 ? (
                  <Alert
                    severity="info"
                    data-testid="products-upsert-attributes-empty-alert"
                    sx={{ background: 'inherit' }}
                  >
                    Attributes are optional. You can generate a single variant without attributes.
                  </Alert>
                ) : null}

                {attributes.map((attribute, index) => (
                  <Paper
                    key={attribute.id}
                    variant="outlined"
                    sx={{ p: 1.25 }}
                    data-testid={`products-upsert-attribute-row-${index}`}
                  >
                    <Stack
                      direction={{ xs: 'column', md: 'row' }}
                      spacing={1.5}
                      alignItems={{ xs: 'stretch', md: 'flex-start' }}
                    >
                      <TextField
                        label="Attribute name"
                        value={attribute.name}
                        onChange={(event) =>
                          handleAttributeNameChange(attribute.id, event.target.value)
                        }
                        error={attributeErrors.has(attribute.id)}
                        helperText={attributeErrors.get(attribute.id) ?? ' '}
                        sx={{ width: { xs: '100%', md: 280 } }}
                        data-testid={`products-upsert-attribute-row-${index}-name-input`}
                        inputProps={{
                          'data-testid': `products-upsert-attribute-row-${index}-name-input-field`,
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
                                data-testid={`products-upsert-attribute-row-${index}-value-chip-${valueIndex}`}
                              />
                            )
                          })
                        }
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="Values"
                            placeholder="Type value and press Enter"
                            helperText="Example: Black, White, Red. Duplicates are not allowed."
                            onBlur={() => handleAttributeInputCommit(attribute.id)}
                            onKeyDown={(event) => {
                              if (event.key !== 'Enter' && event.key !== ',') return
                              event.preventDefault()
                              handleAttributeInputCommit(attribute.id)
                            }}
                            data-testid={`products-upsert-attribute-row-${index}-values-input`}
                            inputProps={{
                              ...params.inputProps,
                              'data-testid': `products-upsert-attribute-row-${index}-values-input-field`,
                            }}
                          />
                        )}
                        sx={{ flex: 1 }}
                      />

                      <IconButton
                        color="error"
                        onClick={() => handleRemoveAttribute(attribute.id)}
                        sx={{ mt: { xs: 0, md: 1 } }}
                        data-testid={`products-upsert-attribute-row-${index}-delete-button`}
                      >
                        <DeleteOutlineOutlinedIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            </Stack>
          </Paper>

          <Paper
            variant="outlined"
            sx={{ p: { xs: 1.5, md: 2 } }}
            data-testid="products-upsert-variants-section"
          >
            <Stack spacing={1.5}>
              <Box>
                <Typography
                  variant="h6"
                  sx={{ fontWeight: 700 }}
                  data-testid="products-upsert-variants-title"
                >
                  Variants
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  data-testid="products-upsert-variants-caption"
                >
                  Each variant has a unique attribute combination. Price is required before save.
                </Typography>
              </Box>

              <Paper
                variant="outlined"
                sx={{ p: 1.5 }}
                data-testid="products-upsert-variants-summary-bar"
              >
                <Stack
                  direction={{ xs: 'column', lg: 'row' }}
                  alignItems={{ xs: 'stretch', lg: 'center' }}
                  justifyContent="space-between"
                  gap={1.5}
                >
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Chip
                      label={`${attributes.length} attributes`}
                      data-testid="products-upsert-variants-summary-attributes"
                    />
                    <Chip
                      label={`${possibleCombinations.length} possible combinations`}
                      data-testid="products-upsert-variants-summary-combinations"
                    />
                    <Chip
                      label={`${variants.length} variants added`}
                      data-testid="products-upsert-variants-summary-added"
                    />
                    {invalidVariantsCount > 0 ? (
                      <Chip
                        color="error"
                        label={`${invalidVariantsCount} invalid`}
                        data-testid="products-upsert-variants-summary-invalid"
                      />
                    ) : null}
                  </Stack>

                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Button
                      variant="outlined"
                      onClick={handleAddVariant}
                      disabled={hasReachedMaxVariants || isSubmitting}
                      data-testid="products-upsert-variants-add-one-button"
                    >
                      Add One Variant
                    </Button>
                    <Button
                      variant="contained"
                      onClick={handleGenerateAllCombinations}
                      disabled={
                        possibleCombinations.length === 0 || hasReachedMaxVariants || isSubmitting
                      }
                      data-testid="products-upsert-variants-generate-all-button"
                    >
                      Generate All Combinations
                    </Button>
                    {invalidVariantsCount > 0 ? (
                      <Button
                        color="error"
                        variant="contained"
                        onClick={handleRemoveInvalidVariants}
                        data-testid="products-upsert-variants-remove-invalid-button"
                      >
                        Remove Invalid Variants
                      </Button>
                    ) : null}
                  </Stack>
                </Stack>
              </Paper>

              {variants.length === 0 ? (
                <Paper
                  variant="outlined"
                  sx={{ py: 4, px: 2, borderStyle: 'dashed', textAlign: 'center' }}
                  data-testid="products-upsert-variants-empty-state"
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
                  data-testid="products-upsert-variants-grid"
                >
                  {variants.map((variant, index) => {
                    const variantError = variantErrors.get(variant.id) ?? ''
                    const isPriceError =
                      variantError === 'Price should be greater than 0.' ||
                      variantError === 'Price can have max 2 decimal places.'
                    return (
                      <Paper
                        key={variant.id}
                        variant="outlined"
                        sx={{
                          p: 1.5,
                          borderColor: variantError ? 'error.main' : 'divider',
                        }}
                        data-testid={`products-upsert-variant-card-${index}`}
                      >
                        <Stack spacing={1.25}>
                          <Stack
                            direction="row"
                            justifyContent="space-between"
                            alignItems="center"
                            gap={1}
                          >
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Typography
                                variant="subtitle1"
                                sx={{ fontWeight: 700 }}
                                data-testid={`products-upsert-variant-card-${index}-title`}
                              >
                                Variant #{index + 1}
                              </Typography>
                              <Chip
                                size="small"
                                label="Draft"
                                color="warning"
                                variant="outlined"
                                data-testid={`products-upsert-variant-card-${index}-status`}
                              />
                            </Stack>

                            <IconButton
                              color="error"
                              onClick={() => handleRemoveVariant(variant.id)}
                              data-testid={`products-upsert-variant-card-${index}-delete-button`}
                            >
                              <DeleteOutlineOutlinedIcon fontSize="small" />
                            </IconButton>
                          </Stack>

                          {variantError && !isPriceError ? (
                            <Alert
                              severity="error"
                              sx={{
                                bgcolor: 'transparent !important',
                                border: 'none',
                                p: 0,
                                alignItems: 'center',
                                color: 'error.main',
                                '& .MuiAlert-icon': {
                                  color: 'error.main',
                                  p: 0,
                                  mr: 1,
                                  alignItems: 'center',
                                },
                                '& .MuiAlert-message': {
                                  p: 0,
                                  display: 'flex',
                                  alignItems: 'center',
                                },
                              }}
                              data-testid={`products-upsert-variant-card-${index}-error`}
                            >
                              {variantError}
                            </Alert>
                          ) : null}

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
                                data-testid={`products-upsert-variant-card-${index}-attribute-${attributeIndex}-select`}
                                SelectProps={{
                                  inputProps: {
                                    'data-testid': `products-upsert-variant-card-${index}-attribute-${attributeIndex}-select-field`,
                                  },
                                }}
                              >
                                <MenuItem
                                  value=""
                                  data-testid={`products-upsert-variant-card-${index}-attribute-${attributeIndex}-option-empty`}
                                >
                                  Select value
                                </MenuItem>
                                {attribute.values.map((value, valueIndex) => (
                                  <MenuItem
                                    key={value}
                                    value={value}
                                    data-testid={`products-upsert-variant-card-${index}-attribute-${attributeIndex}-option-${valueIndex}`}
                                  >
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
                              error={isPriceError}
                              data-testid={`products-upsert-variant-card-${index}-price-input`}
                              inputProps={{
                                inputMode: 'decimal',
                                'data-testid': `products-upsert-variant-card-${index}-price-input-field`,
                              }}
                            />

                            <TextField
                              label="Variant image URL"
                              value={variant.imageUrl}
                              onChange={(event) =>
                                handleVariantFieldChange(variant.id, 'imageUrl', event.target.value)
                              }
                              data-testid={`products-upsert-variant-card-${index}-image-url-input`}
                              inputProps={{
                                'data-testid': `products-upsert-variant-card-${index}-image-url-input-field`,
                              }}
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

          <Stack direction="row" spacing={1} justifyContent="flex-start">
            <Button
              variant="contained"
              onClick={() => void handleSave()}
              disabled={!canSave}
              data-testid="products-upsert-create-save-button"
            >
              Save Product
            </Button>
            <Button
              component={Link}
              to="/products"
              data-testid="products-upsert-create-cancel-button"
            >
              Cancel
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Stack>
  )
}
