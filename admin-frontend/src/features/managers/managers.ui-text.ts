export const managersUiText = {
  listPage: {
    title: 'Managers List',
    addButton: '+ Add Manager',
    emptyStateNoManagers: 'No managers created yet.',
  },
  createPage: {
    title: 'Add New Manager',
    backToManagers: 'Managers',
    fields: {
      username: 'Username*',
      firstName: 'First Name*',
      lastName: 'Last Name*',
      password: 'Password*',
      confirmPassword: 'Confirm Password*',
    },
    placeholders: {
      username: 'Enter username',
      firstName: 'Enter first name',
      lastName: 'Enter last name',
      password: 'Enter password',
      confirmPassword: 'Confirm password',
    },
    actions: {
      save: 'Save New Manager',
      clear: 'Clear all',
    },
  },
  detailsPage: {
    title: 'Manager Details',
    ordersTitle: 'Assigned Orders',
    actions: {
      changePassword: 'Change Password',
      delete: 'Delete',
    },
    fields: {
      username: 'Username',
      firstName: 'First Name',
      lastName: 'Last Name',
      roles: 'Roles',
      createdOn: 'Created On',
    },
    orderColumns: {
      orderNumber: 'Order Number',
      price: 'Price',
      status: 'Status',
      createdOn: 'Created On',
      lastModified: 'Last Modified',
    },
    emptyOrders: 'No orders for this manager yet.',
  },
  dialogs: {
    deleteTitle: 'Delete Manager',
    deleteConfirm: 'Yes, Delete',
    cancel: 'Cancel',
    changePasswordTitle: 'Change Password',
    changePasswordConfirm: 'Update Password',
  },
  toasts: {
    created: 'Manager was successfully created',
    deleted: 'Manager was successfully deleted',
    passwordChanged: 'Password was successfully changed',
    notFoundRedirect: 'Manager was not found. Redirected to managers list.',
    invalidIdRedirect: 'Invalid manager id. Redirected to managers list.',
    addAccessDenied: 'Only admins can create managers.',
  },
  errors: {
    managerNotFound: 'Manager was not found',
    missingManagerId: 'Manager id is missing.',
    loadFailed: 'Failed to load manager details.',
  },
  validation: {
    usernameRequired: 'Username is required.',
    firstNameRequired: 'First name is required.',
    lastNameRequired: 'Last name is required.',
    passwordMinLength: "Password can't be less then 8 characters.",
    confirmPasswordRequired: 'Confirm password is required.',
    confirmPasswordMismatch: 'Passwords do not match.',
    currentPasswordMinLength: "Password can't be less then 8 characters.",
    newPasswordMinLength: "Password can't be less then 8 characters.",
  },
} as const

export function getDeleteManagerMessage(username?: string | null) {
  const safeName = username ?? 'this manager'
  return `Are you sure you want to delete "${safeName}"?`
}

