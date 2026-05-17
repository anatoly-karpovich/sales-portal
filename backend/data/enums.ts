export enum DELIVERY {
  DELIVERY = "Delivery",
  PICK_UP = "Pickup",
}

export enum PRODUCT_STATUSES {
  DRAFT = "Draft",
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

export enum INVENTORY_STATUSES {
  IN_STOCK = "In Stock",
  LOW_STOCK = "Low Stock",
  OUT_OF_STOCK = "Out Of Stock",
  NOT_TRACKED = "Not Tracked",
}

export enum INVENTORY_RECORD_STATUSES {
  ACTIVE = "Active",
  ARCHIVED = "Archived",
}

export enum INVENTORY_ADJUSTMENT_TYPES {
  INITIAL_STOCK = "Initial Stock",
  MANUAL_INCREASE = "Manual Increase",
  MANUAL_DECREASE = "Manual Decrease",
  MANUAL_CORRECTION = "Manual Correction",
  RESERVE = "Reserve",
  RELEASE = "Release",
  SALE = "Sale",
  RETURN = "Return",
  DAMAGE = "Damage",
  EXPIRED_RESERVATION = "Expired Reservation",
}

export enum RESERVATION_TYPES {
  ADMIN_DRAFT = "Admin Draft",
  ORDER_PROCESSING = "Order Processing",
  CUSTOMER_PAYMENT = "Customer Payment",
}

export enum RESERVATION_STATUSES {
  ACTIVE = "Active",
  EXPIRED = "Expired",
  RELEASED = "Released",
  COMPLETED = "Completed",
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
  statusChanged: ({
    status,
    orderId,
    reason,
  }: {
    status: ORDER_STATUSES;
    orderId: string;
    reason?: "manualCancel" | "reservationExpired";
  }) => {
    switch (status) {
      case ORDER_STATUSES.IN_PROCESS:
        return `Order #${orderId} is now in process.`;
      case ORDER_STATUSES.CANCELED:
        if (reason === "reservationExpired") {
          return `Order #${orderId} was canceled because the product reservation expired.`;
        }
        return `Order #${orderId} was canceled by a manager.`;
      case ORDER_STATUSES.DRAFT:
        return `Order #${orderId} was reopened and moved back to draft.`;
      case ORDER_STATUSES.COMPLETED:
        return `Order #${orderId} was completed.`;
      default:
        return `Order #${orderId} status was updated to "${status}".`;
    }
  },
  customerChanged: (orderId: string) => `Customer information for order #${orderId} was updated.`,
  productsChanged: (orderId: string) => `Order #${orderId} product list was updated.`,
  deliveryUpdated: (orderId: string) => `Delivery details for order #${orderId} were updated.`,
  productsDelivered: (orderId: string) => `Product receipt was recorded for order #${orderId}.`,
  managerChanged: (orderId: string) => `The assigned manager for order #${orderId} was changed.`,
  commentAdded: (orderId: string) => `A new comment was added to order #${orderId}.`,
  newOrder: (orderId: string) => `A new order #${orderId} was created.`,
  commentDeleted: (orderId: string) => `A comment was deleted from order #${orderId}.`,
  assigned: (orderId: string) => `You were assigned to order #${orderId}.`,
  assignedAutomatically: (orderId: string) => `You were automatically assigned to order #${orderId}.`,
  unassigned: (orderId: string) => `You were unassigned from order #${orderId}.`,
} as const;
