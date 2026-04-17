type ProductMode = 'create' | 'edit'

export const productsUiText = {
  listPage: {
    title: 'Products List',
    addButton: '+ Add Product',
    filtersTitle: 'Filters',
  },
  form: {
    backToProducts: 'Products',
    createTitle: 'Add New Product',
    editTitlePrefix: 'Edit ',
    fields: {
      name: 'Name*',
      manufacturer: 'Manufacturer*',
      price: 'Price*',
      amount: 'Amount*',
      notes: 'Notes',
    },
    actions: {
      saveCreate: 'Save New Product',
      saveEdit: 'Save Changes',
      clear: 'Clear all',
      delete: 'Delete Product',
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
  },
  errors: {
    missingProductId: 'Product id is missing.',
  },
  validation: {
    nameRequired: 'Name is required',
    nameInvalid: 'Name must be 3-40 alphanumeric characters with single spaces',
    amountInvalid: 'Amount must be in range 0-999',
    priceInvalid: 'Price must be in range 1-99999',
    manufacturerRequired: 'Manufacturer is required',
    notesInvalid: 'Notes must be up to 250 chars and cannot contain < or >',
  },
} as const

export function getProductFormTitle(mode: ProductMode, productName?: string | null) {
  if (mode === 'create') {
    return productsUiText.form.createTitle
  }
  return `${productsUiText.form.editTitlePrefix}${productName ?? ''}`
}

export function getDeleteProductMessage(productName?: string | null) {
  const safeProductName = productName ?? productsUiText.dialogs.deleteFallbackName
  return `Are you sure you want to delete "${safeProductName}"?`
}
