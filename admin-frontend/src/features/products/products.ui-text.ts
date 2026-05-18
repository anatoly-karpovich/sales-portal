type ProductApiErrorStatus = 400 | 404 | 409 | 500 | 'default'

export const productsUiText = {
  listPage: {
    title: 'Products List',
    addButton: '+ Add Product',
    filtersTitle: 'Filters',
    emptyStateNoProducts: 'No products created yet.',
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
    variantsTitle: 'Variants',
    variantsSubtitle: 'Manage variants individually',
    actions: {
      edit: 'Edit',
      cancel: 'Cancel',
      saveProduct: 'Save Product',
      saveVariant: 'Save Variant',
      activate: 'Activate Product',
      archive: 'Archive Product',
      manageInventory: 'Manage Inventory',
      addVariant: 'Add Variant',
      removeInvalidVariants: 'Remove Invalid Variants',
      generateAllCombinations: 'Generate All Combinations',
      addOneVariant: 'Add One Variant',
    },
    status: {
      draft: 'Draft',
      active: 'Active',
      archived: 'Archived',
    },
    placeholders: {
      noVariants: 'No variants yet',
      noVariantsHelp: 'Add one variant manually or generate all possible combinations from attributes.',
      useParentImage: 'Uses parent',
      missingProduct: 'Product is unavailable.',
      manufacturersUnavailable:
        'Manufacturers are not configured in settings. Product editing is unavailable.',
    },
    dialogs: {
      deleteVariantTitle: 'Delete Variant',
      deleteVariantConfirm: 'Yes, Delete',
      deleteVariantFallback: 'this variant',
      deleteProductTitle: 'Delete Product',
      deleteProductConfirm: 'Yes, Delete',
      activateTitle: 'Activate Product',
      activateConfirm: 'Activate',
      archiveTitle: 'Archive Product',
      archiveConfirm: 'Archive',
      discardChangesTitle: 'Discard Changes',
      discardChangesConfirm: 'Discard',
      discardChangesMessage: 'You have unsaved changes. Do you want to discard them?',
    },
  },
  form: {
    backToProducts: 'Products',
    createTitle: 'Add New Product',
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
  const safeVariantName =
    variantName ?? productsUiText.detailsPage.dialogs.deleteVariantFallback
  return `Are you sure you want to delete "${safeVariantName}"?`
}
