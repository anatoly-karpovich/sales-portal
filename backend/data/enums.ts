export enum DELIVERY {
  DELIVERY = "Delivery",
  PICK_UP = "Pickup",
}

export enum PRODUCT_STATUSES {
  DRAFT = "Draft",
  ACTIVE = "Active",
  ARCHIVED = "Archived",
}

export enum CATEGORY_STATUSES {
  ACTIVE = "Active",
  ARCHIVED = "Archived",
}

export enum ROLES {
  USER = "USER",
  ADMIN = "ADMIN",
}

export enum ORDER_STATUSES {
  DRAFT = "Draft",
  IN_PROCESS = "In Process",
  COMPLETED = "Completed",
  CANCELED = "Canceled",
}

export enum DELIVERY_STATUSES {
  DRAFT = "Draft",
  DELIVERY_PLANNED = "Delivery Planned",
  PICKUP_PLANNED = "Pickup Planned",
  DELIVERY_SCHEDULED = "Delivery Scheduled",
  PICKUP_SCHEDULED = "Pickup Scheduled",
  PARTIALLY_DELIVERED = "Partially Delivered",
  DELIVERED = "Delivered",
}

export enum VALIDATION_ERROR_MESSAGES {
  CUSTOMER_NAME = `Customer's name should contain only 1-40 alphabetical characters and one space between`,
  CITY = `City's name should contain only 1-20 alphabetical characters and one space between`,
  ADDRESS = `Address should contain only 1-20 alphanumerical characters and one space between`,
  STREET = `Street should contain only 1-40 alphanumerical characters and one space between`,
  HOUSE = "House number should be in range 1-999",
  FLAT = "Flat number should be in range 1-9999",
  EMAIL = "Invalid Email Address",
  PHONE = "Mobile Number should be at least 10 characters and start with a +",
  NOTES = "Notes should be in range 0-250 and without < or > symbols",
  PRODUCTS_NAME = "Products's name should contain only 3-40 alphanumerical characters and one space between",
  AMOUNT = "Amount should be in range 0-999",
  PRICE = "Price should be in range 1-99999",
  MANUFACTURER = "No such manufacturer is defined",
  CUSTOMER = "Incorrect Customer",
  PRODUCT = "Incorrect Customer",
  DELIVERY = "Incorrect Delivery",
  BODY = "Incorrect request body",
  COMMENT_NOT_FOUND = "Comment was not found",
  GET_MANAGERS = "Failed to get Managers",
}

export enum ORDER_HISTORY_ACTIONS {
  CREATED = "Order created",
  CUSTOMER_CHANGED = "Customer changed",
  REQUIRED_PRODUCTS_CHANGED = "Requested products changed",
  PROCESSED = "Order processing started",
  DELIVERY_PLANNED = "Delivery Planned",
  DELIVERY_SCHEDULED = "Delivery Scheduled",
  DELIVERY_EDITED = "Delivery Edited",
  PICKUP_PLANNED = "Pickup Planned",
  PICKUP_SCHEDULED = "Pickup Scheduled",
  PICKUP_EDITED = "Pickup Edited",
  RECEIVED = "Received",
  RECEIVED_ALL = "All products received",
  CANCELED = "Order canceled",
  MANAGER_ASSIGNED = "Manager Assigned",
  MANAGER_UNASSIGNED = "Manager Unassigned",
  REOPENED = "Order reopened",
}

export const NOTIFICATIONS = {
  statusChanged: (status: ORDER_STATUSES) => `Status has been updated to "${status}" in order.`,
  customerChanged: `Customer has been changed in order.`,
  productsChanged: `Products have been updated in order.`,
  deliveryUpdated: `Delivery details have been added or updated in order.`,
  productsDelivered: `Products have been marked as delivered in order.`,
  managerChanged: `You have been reassigned to order.`,
  commentAdded: `A new comment has been added to order.`,
  newOrder: `A new order has been created`,
  commentDeleted: `A comment has been deleted from order`,
  assigned: `You have been assigned to order`,
  unassigned: `You have been unassigned from order`,
} as const;
