type CustomerMode = 'create' | 'edit'

export const customersUiText = {
  listPage: {
    title: 'Customers List',
    addButton: '+ Add Customer',
    filtersTitle: 'Filters',
    emptyStateNoCustomers: 'No customers created yet.',
  },
  form: {
    backToCustomers: 'Customers',
    createTitle: 'Add New Customer',
    editTitlePrefix: 'Edit ',
    fields: {
      email: 'Email*',
      name: 'Name*',
      country: 'Country*',
      city: 'City*',
      street: 'Street*',
      house: 'House*',
      flat: 'Flat*',
      phone: 'Phone*',
      notes: 'Notes',
    },
    placeholders: {
      email: "Enter customer's email",
      name: "Enter customer's name",
      city: "Enter customer's city",
      street: "Enter customer's street",
      house: "Enter customer's house",
      flat: "Enter customer's flat",
      phone: "Enter customer's phone number",
      notes: 'Enter notes',
    },
    actions: {
      saveCreate: 'Save New Customer',
      saveEdit: 'Save Changes',
      clear: 'Clear all',
      delete: 'Delete Customer',
    },
  },
  dialogs: {
    deleteTitle: 'Delete Customer',
    deleteConfirm: 'Yes, Delete',
    cancel: 'Cancel',
    deleteFallbackName: 'this customer',
  },
  toasts: {
    exportCompleted: 'Export completed',
    deletedFromList: 'Customer deleted',
    created: 'Customer was successfully created',
    updated: 'Customer was successfully updated',
    deleted: 'Customer was successfully deleted',
  },
  detailsPage: {
    title: 'Customer Details',
    editButton: 'Edit',
    contactTitle: 'Contact',
    addressTitle: 'Address',
    registrationDateTitle: 'Registration Date',
    notesTitle: 'Notes',
    ordersTitle: 'Orders',
    emptyOrders: 'No orders for this customer yet.',
    orderColumns: {
      orderNumber: 'Order Number',
      price: 'Price',
      status: 'Status',
      createdOn: 'Created On',
      lastModified: 'Last Modified',
    },
    fields: {
      email: 'Email',
      name: 'Name',
      phone: 'Phone',
      country: 'Country',
      city: 'City',
      street: 'Street',
      house: 'House',
      flat: 'Flat',
    },
  },
  errors: {
    missingCustomerId: 'Customer id is missing.',
    customerNotFound: 'Customer was not found.',
  },
  validation: {
    emailRequired: 'Email is required',
    emailInvalid: 'Email must be a valid email address',
    nameRequired: 'Name is required',
    nameInvalid: 'Name must be 1-40 alphabetic characters with single spaces',
    countryRequired: 'Country is required',
    cityRequired: 'City is required',
    cityInvalid: 'City must be 1-20 alphabetic characters',
    streetRequired: 'Street is required',
    streetInvalid: 'Street must be 1-40 alphanumeric characters',
    houseInvalid: 'House must be in range 1-999',
    flatInvalid: 'Flat must be in range 1-9999',
    phoneRequired: 'Phone is required',
    phoneInvalid: 'Phone must start with + and contain 10-20 digits',
    notesInvalid: 'Notes must be up to 250 chars and cannot contain < or >',
  },
} as const

export function getCustomerFormTitle(mode: CustomerMode, customerName?: string | null) {
  if (mode === 'create') {
    return customersUiText.form.createTitle
  }
  return `${customersUiText.form.editTitlePrefix}${customerName ?? ''}`
}

export function getDeleteCustomerMessage(customerName?: string | null) {
  const safeName = customerName ?? customersUiText.dialogs.deleteFallbackName
  return `Are you sure you want to delete "${safeName}"?`
}
