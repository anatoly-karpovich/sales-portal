export const ordersUiText = {
  listPage: {
    title: 'Orders List',
    createButton: 'Create Order',
    filtersTitle: 'Filters',
  },
  dialogs: {
    reopenTitle: 'Reopen Order',
    reopenConfirm: 'Yes, Reopen',
    cancel: 'Cancel',
    createOrderTitle: 'Create Order',
    createOrderCustomerLabel: 'Customer*',
    createOrderProductLabel: 'Product*',
    createOrderProductsTitle: 'Products',
    createOrderAddProductButton: 'Add Product',
    createOrderSubmitButton: 'Create',
    createOrderTotalPriceLabel: 'Total Price:',
  },
  toasts: {
    exportCompleted: 'Export completed',
    created: 'Order was successfully created',
    reopened: 'Order was successfully reopened',
  },
  errors: {
    noCustomers: 'No customers found. Please add one before creating an order.',
    noProducts: 'No products found. Please add one before creating an order.',
    createUnavailable: 'Unable to create an order. Please try again later.',
  },
} as const

export function getReopenOrderMessage(orderId?: string) {
  return orderId
    ? `Are you sure you want to reopen order "${orderId}"?`
    : 'Are you sure you want to reopen this order?'
}
