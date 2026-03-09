const SIDEBAR_ID = "sidebar";
const CONTENT_CONTAINER_ID = "root";
const CONTENT_ID = "contentInner";
const PAGE_TITLE_ID = "title";

// const BASE_URL = "https://aqa-course-project.app";
const BASE_URL = "http://localhost:8686";

const NUMBER_KEYS = ["amount", "price", "flat", "house"];

const NO_RECORDS_IN_TABLE = "No records created yet";
const NO_ORDERS_IN_TABLE = "No orders created yet";

const FILTER_VALUES = {
  customers: ["USA", "Canada", "Belarus", "Ukraine", "Germany", "France", "Great Britain", "Russia"],
  products: ["Apple", "Samsung", "Google", "Microsoft", "Sony", "Xiaomi", "Amazon", "Tesla"],
  orders: ["Draft", "In Process", "Partially Received", "Received", "Canceled"],
};

const DATE_AND_TIME_FORMAT = "YYYY/MM/DD HH:mm:ss";
const DATE_FORMAT = "YYYY/MM/DD";

const dateKeys = ["createdOn", "createdAt"];

const ENDPOINTS = {
  ["Login"]: `${BASE_URL}/api/login`,
  ["Logout"]: `${BASE_URL}/api/logout`,
  ["Customers"]: `${BASE_URL}/api/customers`,
  ["Customers All"]: `${BASE_URL}/api/customers/all`,
  ["Customers Export"]: `${BASE_URL}/api/customers/export`,
  ["Get Customer By Id"]: (id) => `${BASE_URL}/api/customers/${id}/`,
  ["Get Customer Orders"]: (id) => `${BASE_URL}/api/customers/${id}/orders`,
  ["Products"]: `${BASE_URL}/api/products`,
  ["Products All"]: `${BASE_URL}/api/products/all`,
  ["Products Export"]: `${BASE_URL}/api/products/export`,
  ["Get Product By Id"]: (id) => `${BASE_URL}/api/products/${id}/`,
  ["Orders"]: `${BASE_URL}/api/orders`,
  ["Orders Export"]: `${BASE_URL}/api/orders/export`,
  ["Get Order By Id"]: (id) => `${BASE_URL}/api/orders/${id}/`,
  ["Order Delivery"]: (orderId) => `${BASE_URL}/api/orders/${orderId}/delivery/`,
  ["Order Receive"]: (orderId) => `${BASE_URL}/api/orders/${orderId}/receive/`,
  ["Order Status"]: (orderId) => `${BASE_URL}/api/orders/${orderId}/status`,
  ["Order Comments"]: (orderId) => `${BASE_URL}/api/orders/${orderId}/comments`,
  ["Order Comments Delete"]: (orderId, commentId) => `${BASE_URL}/api/orders/${orderId}/comments/${commentId}`,
  ["Metrics"]: `${BASE_URL}/api/metrics`,
  ["Managers"]: `${BASE_URL}/api/users`,
  ["Get Manager By Id"]: (id) => `${BASE_URL}/api/users/${id}/`,
  ["Change Manager Password"]: (id) => `${BASE_URL}/api/users/password/${id}`,
  ["Notifications"]: `${BASE_URL}/api/notifications`,
  ["Notification by Id"]: (id) => `${BASE_URL}/api/notifications/${id}/read`,
  ["Notification read all"]: `${BASE_URL}/api/notifications/mark-all-read`,
  ["Assign Manager"]: (orderId, managerId) => `${BASE_URL}/api/orders/${orderId}/assign-manager/${managerId}`,
  ["Unassign Manager"]: (orderId) => `${BASE_URL}/api/orders/${orderId}/unassign-manager`,
};

const SUCCESS_MESSAGES = {
  ["New Customer Added"]: "Customer was successfully created",
  ["Customer Successfully Deleted"]: (name) => `${name} was successfully deleted`,
  ["Customer Successfully Updated"]: (name) => `${name} was successfully updated`,
  ["New Product Added"]: "Product was successfully created",
  ["Product Successfully Deleted"]: (name) => `${name} was successfully deleted`,
  ["Product Successfully Updated"]: (name) => `${name} was successfully updated`,
  ["New Order Added"]: "Order was successfully created",
  ["Order Successfully Updated"]: "Order was successfully updated",
  ["Delivery Saved"]: "Delivery was successfully saved",
  ["Order Canceled"]: "Order was successfully canceled",
  ["Order In Process"]: "Order processing was successfully started",
  ["Order Draft"]: "Order was successfully reopened",
  ["Products Successfully Received"]: `Products were successfully received`,
  ["Comment Successfully Created"]: `Comment was successfully posted`,
  ["Comment Successfully Deleted"]: `Comment was successfully deleted`,
  ["New Manager Added"]: "Manager was successfully created",
  ["Manager Successfully Updated"]: (name) => `${name} was successfully updated`,
  ["Password Successfully Changed"]: "Password was successfully changed",
  ["Manager Assigned"]: "Manager was successfully assigned to the order",
  ["Manager Unassigned"]: "Manager was successfully unassigned from the order",
  ["Exported"]: "Data was successfully exported",
};

const ERROR_MESSAGES = {
  ["Connection Issue"]: `Connection issue. Please try again later.`,
  ["Order not created"]: "Failed to create an order. Please try again later.",
  ["Unable to create order"]: "Unable to create an order. Please try again later.",
  ["No customers"]: "No customers found. Please add one before creating an order.",
  ["No products"]: "No products found. Please add one before creating an order.",
  ["Unable to edit customer"]: "Unable to update customer. Please try again later.",
  ["Unable to edit product"]: "Unable to update products. Please try again later.",
  ["Unable to assign manager"]: "Unable to assign manager. Please try again later.",
  ["Failed to assign manager"]: "Failed to assign manager. Please try again later.",
  ["Failed to update customer"]: "Failed to update customer. Please try again later.",
  ["Failed to update products"]: "Failed to update products. Please try again later.",
  ["Failed to create customer"]: "Failed to create customer. Please check the form.",
  ["Customer exists"]: "Customer with this email already exists.",
  ["Failed to create product"]: "Failed to create product. Please check the form.",
  ["Failed to export"]: "Failed to export. Please try again later.",
};

const VALIDATION_ERROR_MESSAGES = {
  ["Customer Name"]: `Customer's name should contain only 1-40 alphabetical characters and one space between`,
  ["City"]: `City's name should contain only 1-20 alphabetical characters and one space between`,
  ["Address"]: `Address should contain only 1-20 alphanumerical characters and one space between`,
  ["Street"]: `Street should contain only 1-40 alphanumerical characters and one space between`,
  ["House"]: "House number should be in range 1-999",
  ["Flat"]: "Flat number should be in range 1-9999",
  ["Email"]: "Invalid Email Address",
  ["Phone"]: "Mobile Number should be at least 10 characters (max 20) and start with a +",
  ["Notes"]: "Notes should be in range 0-250 and without < or > symbols",
  ["Comments"]: "Comment should be in range 1-250 and without < or > symbols",
  ["Product Name"]: "Products's name should contain only 3-40 alphanumerical characters and one space between",
  ["Amount"]: "Amount should be in range 0-999",
  ["Price"]: "Price should be in range 1-99999",
};

const REGULAR_EXPRESSIONS = {
  ["Customer Name"]: /^\b(?!.*?\s{2})[A-Za-z ]{1,40}\b$/m,
  ["City"]: /^\b(?!.*?\s{2})[A-Za-z ]{1,20}\b$/m,
  ["Phone"]: /^\+[0-9]{10,20}$/m,
  ["Address"]: /^\b(?!.*?\s{2})[A-Za-z0-9 ]{1,20}\b$/m,
  ["Street"]: /^\b(?!.*?\s{2})[A-Za-z0-9 ]{1,40}\b$/m,
  ["House"]: /^[0-9]{1,3}$/m,
  ["Flat"]: /^[0-9]{1,4}$/m,
  ["Email"]:
    /^(([^<>()\[\]\\.,;:\s@"']+(\.[^<>()\[\]\\.,;:\s@"']+)*))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/m,
  ["Notes"]: /^[^<>]{0,250}$/m,
  ["Comments"]: /^[^<>]{1,250}$/m,
  ["Product Name"]: /^\b(?!.*?\s{2})[A-Za-z0-9 ]{3,40}\b$/m,
  ["Amount"]: /^[0-9]{1,3}$/m,
  ["Price"]: /^[0-9]{1,5}$/m,
};

const replaceApiToFeKeys = {
  _id: "Id",
  email: "Email",
  name: "Name",
  country: "Country",
  city: "City",
  address: "Address",
  house: "House",
  flat: "Flat",
  street: "Street",
  phone: "Phone",
  createdOn: "Created On",
  note: "Notes",
  notes: "Notes",
  manufacturer: "Manufacturer",
  price: "Price",
  amount: "Amount",
  status: "Status",
  delivery: "Delivery",
  condition: "Delivery Type",
  finalDate: "Delivery Date",
  total_price: "Total Price",
  customer: "Customer",
  firstName: "First Name",
  lastName: "Last Name",
  username: "Username",
  roles: "Roles",
  assignedManager: "Assigned Manager",
  products: "Products",
  received: "Received",
};

const idToOrderNumber = {
  _id: "Order Number",
};

const ORDER_HISTORY_ACTIONS = {
  CREATED: "Order created",
  CUSTOMER_CHANGED: "Customer changed",
  REQUIRED_PRODUCTS_CHANGED: "Requested products changed",
  PROCESSED: "Order processing started",
  DELIVERY_SCHEDULED: "Delivery Scheduled",
  DELIVERY_EDITED: "Delivery Edited",
  RECEIVED: "Received",
  RECEIVED_ALL: "All products received",
  CANCELED: "Order canceled",
  MANAGER_ASSIGNED: "Manager Assigned",
  MANAGER_UNASSIGNED: "Manager Unassigned",
  REOPENED: "Order reopened",
};

const PAGES = {
  HOME: "Home",
  PRODUCTS: "Products",
  ADD_NEW_PRODUCT: "Add New Product",
  EDIT_PRODUCT: "Edit Product",
  CUSTOMERS: "Customers",
  CUSTOMER_DETAILS: "Customer details",
  ADD_NEW_CUSTOMER: "Add New Customer",
  EDIT_CUSTOMER: "Edit Customer",
  ORDERS: "Orders",
  ORDER_DETAILS: "Order details",
  MANAGERS: "Managers",
  ADD_MANAGER: "Add Manager",
  MANAGER_DETAILS: "Manager details",
};

const ROLES = {
  ADMIN: "ADMIN",
  USER: "USER",
};

const ORDER_STATUSES = {
  DRAFT: "Draft",
  IN_PROCESS: "In Process",
  PARTIALLY_RECEIVED: "Partially Received",
  RECEIVED: "Received",
  CANCELED: "Canceled",
};

const ROUTES = {
  ORDERS: "#/orders",
  ORDER_DETAILS: (id) => `#/orders/${id}`,
  ORDER_EDIT_DELIVERY: (id) => `#/orders/${id}/edit-delivery`,
  ORDER_SCHEDULE_DELIVERY: (id) => `#/orders/${id}/schedule-delivery`,
  CUSTOMERS: "#/customers",
  CUSTOMER_DETAILS: (id) => `#/customers/${id}`,
  CUSTOMER_EDIT: (id) => `#/customers/${id}/edit`,
  CUSTOMER_ADD: `#/customers/add`,
  PRODUCTS: "#/products",
  PRODUCT_DETAILS: (id) => `#/products/${id}`,
  PRODUCT_EDIT: (id) => `#/products/${id}/edit`,
  PRODUCT_ADD: `#/products/add`,
  MANAGERS: "#/managers",
  MANAGER_DETAILS: (id) => `#/managers/${id}`,
  MANAGER_EDIT: (id) => `#/managers/${id}/edit`,
  MANAGER_ADD: `#/managers/add`,
  SIGNIN: "#/login",
  HOME: "#/home",
  NOT_FOUND: "#/page-not-found",
};

const STATUS_CODES = {
  OK: 200,
  CREATED: 201,
  DELETED: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
};
