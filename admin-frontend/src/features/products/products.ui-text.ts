type ProductApiErrorStatus = 400 | 404 | 409 | 500 | 'default'

export const productsUiText = {
  listPage: {
    title: 'Products List',
    addButton: '+ Add Product',
    filtersTitle: 'Filters',
    emptyStateNoProducts: 'No products created yet.',
    tableColumns: {
      name: 'Name',
      price: 'Price',
      manufacturer: 'Manufacturer',
      status: 'Status',
      variants: 'Variants',
      createdOn: 'Created On',
      actions: 'Actions',
    },
    actions: {
      details: 'Details',
      continueSetup: 'Continue setup',
      delete: 'Delete',
    },
    filterSections: {
      manufacturer: 'Manufacturers',
      productStatus: 'Product Status',
      price: 'Price',
    },
    chips: {
      searchPrefix: 'Search',
      manufacturerPrefix: 'Manufacturer',
      statusPrefix: 'Status',
      pricePrefix: 'Price',
    },
    validation: {
      priceRangeInvalid: 'Minimum price cannot be greater than maximum price.',
    },
    fields: {
      minPrice: 'Min Price',
      maxPrice: 'Max Price',
    },
  },
  detailsPage: {
    backToProducts: 'Products',
    productInfoTitle: 'Product info',
    productInfoSubtitle: 'Read-only. Click edit to modify.',
    categoryTitle: 'Product category',
    variantsTitle: 'Variants',
    variantsSubtitle: 'Manage variants individually',
    labels: {
      name: 'Name',
      manufacturer: 'Manufacturer',
      description: 'Description',
      imageUrl: 'Image URL',
      parentImageUrl: 'Parent image URL',
      variantImageUrl: 'Variant image URL',
      price: 'Price',
      variant: 'Variant',
      attributes: 'Attributes',
      path: 'Path',
      root: 'Root',
      noAttributes: 'No attributes',
      selectValue: 'Select value',
      attributeFallback: 'Attribute',
      attributeName: 'Attribute name',
      values: 'Values',
    },
    counters: {
      attributes: 'attributes',
      variants: 'variants',
      variantsAdded: 'variants added',
      combinations: 'possible combinations',
      invalid: 'invalid',
    },
    valuesInput: {
      placeholder: 'Type value and press Enter',
      helper: 'Example: Black, White, Red. Duplicates are not allowed.',
    },
    metadata: {
      created: 'Created',
      updated: 'Updated',
    },
    actions: {
      edit: 'Edit',
      delete: 'Delete',
      cancel: 'Cancel',
      saveProduct: 'Save Product',
      saveVariant: 'Save Variant',
      saveCategory: 'Save category',
      saveOrder: 'Save Order',
      activate: 'Activate Product',
      archive: 'Archive Product',
      activateVariant: 'Activate',
      archiveVariant: 'Archive',
      deleteProduct: 'Delete Product',
      manageInventory: 'Manage Inventory',
      reorderAttributes: 'Reorder',
      addVariant: 'Add Variant',
      removeInvalidVariants: 'Remove Invalid Variants',
      generateAllCombinations: 'Generate All Combinations',
      addOneVariant: 'Add One Variant',
      addAttribute: 'Add Attribute',
    },
    status: {
      draft: 'Draft',
      active: 'Active',
      archived: 'Archived',
    },
    placeholders: {
      noVariants: 'No variants yet',
      noVariantsHelp:
        'Add one variant manually or generate all possible combinations from attributes.',
      attributesOptional:
        'Attributes are optional. You can generate a single variant without attributes.',
      useParentImage: 'Uses parent',
      missingProduct: 'Product is unavailable.',
      attributesEditorHelp:
        'Create unique attributes and available values. Values will be used to build variants.',
      manufacturersUnavailable:
        'Manufacturers are not configured in settings. Product editing is unavailable.',
      categoriesUnavailable: 'Unable to load categories. Category editing is unavailable.',
    },
    validation: {
      nameRequired: 'Name is required.',
      nameInvalid: 'Name must be 3-40 chars: letters/numbers, single spaces only.',
      categoryRequired: 'Category is required.',
      categoryInvalid: 'Category must contain letters and numbers only.',
      parentImageUrlInvalid: 'Parent image URL must be a valid http(s) URL.',
      variantImageUrlInvalid: 'Variant image URL must be a valid http(s) URL.',
      priceGreaterThanZero: 'Price should be greater than 0.',
      priceMaxDecimals: 'Price can have max 2 decimal places.',
      attributeNameRequired: 'Attribute name is required.',
      attributeNamesMustBeUnique: 'Attribute names must be unique.',
      attributeNameMustBeUnique: 'Attribute name must be unique.',
      attributeValueRequired: 'At least one value is required.',
      duplicateVariantCombination: 'Variant with this attribute combination already exists.',
    },
    dialogs: {
      deleteVariantTitle: 'Delete Variant',
      deleteVariantConfirm: 'Yes, Delete',
      deleteVariantFallback: 'this variant',
      deleteProductTitle: 'Delete Product',
      deleteProductConfirm: 'Yes, Delete',
      activateTitle: 'Activate Product',
      activateConfirm: 'Activate',
      activateMessage: 'Are you sure you want to activate this product?',
      archiveTitle: 'Archive Product',
      archiveConfirm: 'Archive',
      archiveMessage: 'Are you sure you want to archive this product?',
      discardChangesTitle: 'Discard Changes',
      discardChangesConfirm: 'Discard',
      discardChangesMessage: 'You have unsaved changes. Do you want to discard them?',
    },
  },
  form: {
    backToProducts: 'Products',
    createTitle: 'Add New Product',
    setupSteps: {
      parentProduct: 'Parent Product',
      attributesAndVariants: 'Attributes and Variants',
      initialInventory: 'Initial Inventory',
      review: 'Review',
    },
    labels: {
      category: 'Product category',
      quantity: 'Quantity',
      lowStockThreshold: 'Low Stock Threshold',
      directOrder: 'Direct Order',
      variantSpecification: 'Variant Specification',
      initialInventory: 'Initial Inventory',
      parentProduct: 'Parent product',
      attributes: 'Attributes',
      productSetup: 'Product Setup',
    },
    options: {
      allowed: 'Allowed',
      blocked: 'Blocked',
    },
    actions: {
      deleteDraft: 'Delete Draft',
      addAttribute: 'Add Attribute',
      addOneVariant: 'Add One Variant',
      removeInvalid: 'Remove Invalid',
      back: 'Back',
      saveAndContinue: 'Save and Continue',
      completeSetup: 'Complete Setup',
      backToProducts: 'Back to Products',
      goToCategories: 'Go to Categories',
    },
    placeholders: {
      noAttributes: 'No attributes.',
      loadDraftBeforeReview: 'Load product draft before review.',
      loadDraftBeforeInventory: 'Load a draft product before configuring inventory.',
      loadingCatalogSettings: 'Loading catalog settings...',
      loadingDraftProduct: 'Loading draft product...',
      draftUnavailable: 'Product draft is unavailable.',
      categoriesUnavailableCreate: 'Unable to load categories. Product creation is unavailable.',
      createCategoryBeforeProducts: 'Create at least one category before adding products.',
      attributesOptionalCreate:
        'Attributes are optional. You can create a single variant without attributes.',
      noVariants: 'No variants yet',
      noVariantsHelp:
        'Add one variant manually or generate all possible combinations from attributes.',
      inventoryHelp:
        'Configure quantity, threshold and direct-order setting for each variant. All variants are saved in one request.',
      manufacturersUnavailableCreate:
        'Catalog manufacturers are not configured. Product creation is unavailable.',
    },
    statusDraft: 'Draft',
    variantPrefix: 'Variant',
    sections: {
      initialInventoryPerVariant: 'Initial inventory per variant',
      variantsReview: 'Variants Review',
    },
  },
  dialogs: {
    deleteTitle: 'Delete Product',
    deleteConfirm: 'Yes, Delete',
    cancel: 'Cancel',
    deleteFallbackName: 'this product',
  },
  toasts: {
    exportCompleted: 'Export completed',
    deletedFromList: 'Product deleted',
    created: 'Product was successfully created',
    updated: 'Product was successfully updated',
    deleted: 'Product was successfully deleted',
    statusUpdated: 'Product status updated',
    variantUpdated: 'Variant was successfully updated',
    variantDeleted: 'Variant was successfully deleted',
    saveFailed: 'Unable to update products. Please try again later.',
  },
  errors: {
    missingProductId: 'Product id is missing.',
    api: {
      badRequest: 'Unable to process request. Check product data and try again.',
      notFound: 'Product data is outdated. Refresh the page and try again.',
      conflict: 'Operation conflicts with existing product or order data.',
      server: 'Server error. Please try again later.',
      fallback: 'Request failed. Please try again.',
    },
  },
} as const

export function getProductApiErrorMessage(status: number | undefined): string {
  const key: ProductApiErrorStatus =
    status === 400
      ? 400
      : status === 404
        ? 404
        : status === 409
          ? 409
          : status && status >= 500
            ? 500
            : 'default'

  if (key === 400) {
    return productsUiText.errors.api.badRequest
  }
  if (key === 404) {
    return productsUiText.errors.api.notFound
  }
  if (key === 409) {
    return productsUiText.errors.api.conflict
  }
  if (key === 500) {
    return productsUiText.errors.api.server
  }

  return productsUiText.errors.api.fallback
}

export function getDeleteProductMessage(productName?: string | null) {
  const safeProductName = productName ?? productsUiText.dialogs.deleteFallbackName
  return `Are you sure you want to delete "${safeProductName}"?`
}

export function getDeleteVariantMessage(variantName?: string | null) {
  const safeVariantName = variantName ?? productsUiText.detailsPage.dialogs.deleteVariantFallback
  return `Are you sure you want to delete "${safeVariantName}"?`
}

export function getAttributeValueRequiredMessage(attributeName: string) {
  return `${attributeName}: value is required.`
}

export function getAttributeValueNoLongerExistsMessage(attributeName: string, value: string) {
  return `${attributeName}: ${value} no longer exists in attribute values.`
}

export function getAttributeAtLeastOneValueMessage(attributeName: string) {
  return `${attributeName}: ${productsUiText.detailsPage.validation.attributeValueRequired.toLowerCase()}`
}
