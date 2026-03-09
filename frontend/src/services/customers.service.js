class CustomersService {
  static async getCustomers(id) {
    const options = {
      method: "get",
      baseURL: BASE_URL,
      url: id ? ENDPOINTS["Get Customer By Id"](id) : ENDPOINTS["Customers All"],
      headers: {
        Authorization: getAuthorizationCookie(),
        ["Content-Type"]: "application/json",
      },
    };
    return sendRequest(options);
  }

  static async getSorted(params) {
    const options = {
      method: "get",
      baseURL: BASE_URL,
      url: ENDPOINTS.Customers + generateUrlParams(params),
      headers: {
        Authorization: getAuthorizationCookie(),
        ["Content-Type"]: "application/json",
      },
    };
    return sendRequest(options);
  }

  static async createCustomer(customer) {
    const options = {
      method: "post",
      baseURL: BASE_URL,
      url: ENDPOINTS.Customers,
      headers: {
        Authorization: getAuthorizationCookie(),
        ["Content-Type"]: "application/json",
      },
      data: customer,
    };
    return sendRequest(options);
  }

  static async editCustomer(customer) {
    const options = {
      method: "put",
      baseURL: BASE_URL,
      url: ENDPOINTS["Get Customer By Id"](customer._id),
      headers: {
        Authorization: getAuthorizationCookie(),
        ["Content-Type"]: "application/json",
      },
      data: _.omit(customer, ["_id"]),
    };
    return sendRequest(options);
  }

  static async deleteCustomer(id) {
    const options = {
      method: "delete",
      baseURL: BASE_URL,
      url: ENDPOINTS["Get Customer By Id"](id),
      headers: {
        Authorization: getAuthorizationCookie(),
        ["Content-Type"]: "application/json",
      },
    };
    return sendRequest(options);
  }

  static async getOrders(customerId) {
    const options = {
      method: "get",
      baseURL: BASE_URL,
      url: ENDPOINTS["Get Customer Orders"](customerId),
      headers: {
        Authorization: getAuthorizationCookie(),
        ["Content-Type"]: "application/json",
      },
    };
    return sendRequest(options);
  }

  static async exportCustomers(payload) {
    const options = {
      method: "post",
      baseURL: BASE_URL,
      url: ENDPOINTS["Customers Export"],
      headers: {
        Authorization: getAuthorizationCookie(),
        ["Content-Type"]: "application/json",
      },
      responseType: "blob",
      data: payload,
    };
    return sendRequest(options);
  }
}
