class OrdersService {
  static async getOrders(id) {
    const options = {
      method: "get",
      baseURL: BASE_URL,
      url: id ? ENDPOINTS["Get Order By Id"](id) : ENDPOINTS.Orders,
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
      url: ENDPOINTS.Orders + generateUrlParams(params),
      headers: {
        Authorization: getAuthorizationCookie(),
        ["Content-Type"]: "application/json",
      },
    };
    return sendRequest(options);
  }

  static async createOrder(order) {
    const options = {
      method: "post",
      baseURL: BASE_URL,
      url: ENDPOINTS.Orders,
      headers: {
        Authorization: getAuthorizationCookie(),
        ["Content-Type"]: "application/json",
      },
      data: order,
    };
    return sendRequest(options);
  }

  static async editOrder(order) {
    const options = {
      method: "put",
      baseURL: BASE_URL,
      url: ENDPOINTS["Get Order By Id"](order._id),
      headers: {
        Authorization: getAuthorizationCookie(),
        ["Content-Type"]: "application/json",
      },
      data: _.omit(order, "_id"),
    };
    return sendRequest(options);
  }

  static async deleteOrder(id) {
    const options = {
      method: "delete",
      baseURL: BASE_URL,
      url: ENDPOINTS["Get Order By Id"](id),
      headers: {
        Authorization: getAuthorizationCookie(),
        ["Content-Type"]: "application/json",
      },
    };
    return sendRequest(options);
  }

  static async submitDelivery(orderId, delivery) {
    const options = {
      method: "post",
      baseURL: BASE_URL,
      url: ENDPOINTS["Order Delivery"](orderId),
      headers: {
        Authorization: getAuthorizationCookie(),
        ["Content-Type"]: "application/json",
      },
      data: delivery,
    };
    return sendRequest(options);
  }

  static async changeOrderStatus(_id, status) {
    const options = {
      method: "put",
      baseURL: BASE_URL,
      url: ENDPOINTS["Order Status"](_id),
      headers: {
        Authorization: getAuthorizationCookie(),
        ["Content-Type"]: "application/json",
      },
      data: { status },
    };
    return sendRequest(options);
  }

  static async receiveProducts(_id, products) {
    const options = {
      method: "post",
      baseURL: BASE_URL,
      url: ENDPOINTS["Order Receive"](_id),
      headers: {
        Authorization: getAuthorizationCookie(),
        ["Content-Type"]: "application/json",
      },
      data: { products },
    };
    return sendRequest(options);
  }

  static async createComment(_id, comment) {
    const options = {
      method: "post",
      baseURL: BASE_URL,
      url: ENDPOINTS["Order Comments"](_id),
      headers: {
        Authorization: getAuthorizationCookie(),
        ["Content-Type"]: "application/json",
      },
      data: comment,
    };
    return sendRequest(options);
  }

  static async deleteComment(_id, commentId) {
    const options = {
      method: "delete",
      baseURL: BASE_URL,
      url: ENDPOINTS["Order Comments Delete"](_id, commentId),
      headers: {
        Authorization: getAuthorizationCookie(),
        ["Content-Type"]: "application/json",
      },
    };
    return sendRequest(options);
  }

  static async assignManager(orderId, managerId) {
    return sendRequest({
      method: "put",
      baseURL: BASE_URL,
      url: ENDPOINTS["Assign Manager"](orderId, managerId),
      headers: {
        Authorization: getAuthorizationCookie(),
        "Content-Type": "application/json",
      },
    });
  }

  static async unassignManager(orderId) {
    return sendRequest({
      method: "put",
      baseURL: BASE_URL,
      url: ENDPOINTS["Unassign Manager"](orderId),
      headers: {
        Authorization: getAuthorizationCookie(),
        "Content-Type": "application/json",
      },
    });
  }

  static async exportOrders(payload) {
    const options = {
      method: "post",
      baseURL: BASE_URL,
      url: ENDPOINTS["Orders Export"],
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
