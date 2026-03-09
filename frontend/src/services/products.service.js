class ProductsService {
  static async getProducts(id) {
    const options = {
      method: "get",
      baseURL: BASE_URL,
      url: id ? ENDPOINTS["Get Product By Id"](id) : ENDPOINTS["Products All"],
      headers: {
        Authorization: getAuthorizationCookie(),
        ["Content-Type"]: "application/json",
      },
    };
    return sendRequest(options);
  }

  static async getSortedProducts(filterParams) {
    const options = {
      method: "get",
      baseURL: BASE_URL,
      url: ENDPOINTS.Products + generateUrlParams(filterParams),
      headers: {
        Authorization: getAuthorizationCookie(),
        ["Content-Type"]: "application/json",
      },
    };
    return sendRequest(options);
  }

  static async createProduct(product) {
    const options = {
      method: "post",
      baseURL: BASE_URL,
      url: ENDPOINTS.Products,
      headers: {
        Authorization: getAuthorizationCookie(),
        ["Content-Type"]: "application/json",
      },
      data: product,
    };
    return sendRequest(options);
  }

  static async editProduct(product) {
    const options = {
      method: "put",
      baseURL: BASE_URL,
      url: ENDPOINTS["Get Product By Id"](product._id),
      headers: {
        Authorization: getAuthorizationCookie(),
        ["Content-Type"]: "application/json",
      },
      data: _.omit(product, "_id"),
    };
    return sendRequest(options);
  }

  static async deleteProduct(id) {
    const options = {
      method: "delete",
      baseURL: BASE_URL,
      url: ENDPOINTS["Get Product By Id"](id),
      headers: {
        Authorization: getAuthorizationCookie(),
        ["Content-Type"]: "application/json",
      },
    };
    return sendRequest(options);
  }

  static async exportProducts(payload) {
    const options = {
      method: "post",
      baseURL: BASE_URL,
      url: ENDPOINTS["Products Export"],
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
