import Order from "../models/order.model";
import Product from "../models/product.model";
import CustomerService from "./customer.service";
import {
  IOrder,
  IOrderRequest,
  IOrderUpdateRequest,
  ICustomer,
  IHistory,
  IOrderCustomerSnapshot,
  IProductInOrder,
  IProductInOrderResponse,
} from "../data/types";
import { Types } from "mongoose";
import { createHistoryEntry, productsMapping, getTodaysDate } from "../utils/utils";
import { DELIVERY, DELIVERY_STATUSES, NOTIFICATIONS, ORDER_HISTORY_ACTIONS, ORDER_STATUSES } from "../data/enums";
import _ from "lodash";
import managersService from "./managers.service";
import { NotificationService } from "./notification.service";
import ExportService from "./export.service";
import { OrderDetailsDTO, OrderExportFormatDTO, OrderListItemDTO } from "../data/types/dto/orders.dto";
import { ICommentAuthor } from "../data/types/comments.type";
import { PricingService } from "./pricing.service";
import { IDeliveryPayload } from "../data/types/delivery.type";

const pricingService = new PricingService();

class OrderService {
  private notificationService = new NotificationService();
  private readonly exportableFields = new Set<string>([
    "status",
    "deliveryStatus",
    "total_price",
    "delivery",
    "customer",
    "products",
    "assignedManager",
    "createdOn",
  ]);

  private buildCustomerSnapshot(customer: ICustomer): IOrderCustomerSnapshot {
    return {
      _id: new Types.ObjectId(customer._id),
      email: customer.email,
      name: customer.name,
    };
  }

  private withOverdueDelivery<T extends { status: ORDER_STATUSES; delivery: OrderDetailsDTO["delivery"] }>(order: T): T {
    const overdue = pricingService.isOrderOverdue({
      orderStatus: order.status,
      status: order.delivery.status,
      schedule: order.delivery.schedule,
    });

    return {
      ...order,
      delivery: {
        ...order.delivery,
        isOverdue: overdue.isOverdue,
        overdueByDays: overdue.overdueByDays,
      },
    };
  }

  private async mergeProductsForUpdate(
    currentProducts: IProductInOrder[],
    requestedProducts: IOrderRequest["products"] | undefined,
  ): Promise<IProductInOrder[]> {
    if (!requestedProducts) {
      return currentProducts;
    }

    const currentById = new Map<string, IProductInOrder>(
      currentProducts.map((item) => [`${item.product._id.toString()}:${item.variant._id.toString()}`, item]),
    );

    const newKeys = requestedProducts
      .map((item) => `${item.productId.toString()}:${item.variantId.toString()}`)
      .filter((key) => !currentById.has(key));

    const freshSnapshots = newKeys.length
      ? await productsMapping({
          products: requestedProducts.filter(
            (item) => !currentById.has(`${item.productId.toString()}:${item.variantId.toString()}`),
          ),
        })
      : [];
    const freshById = new Map<string, IProductInOrder>(
      freshSnapshots.map((item) => [`${item.product._id.toString()}:${item.variant._id.toString()}`, item]),
    );

    return requestedProducts.map((item) => {
      const idStr = `${item.productId.toString()}:${item.variantId.toString()}`;
      const existing = currentById.get(idStr);
      if (existing) {
        return {
          product: { _id: new Types.ObjectId(existing.product._id) },
          variant: { _id: new Types.ObjectId(existing.variant._id) },
          unitPrice: existing.unitPrice,
          quantity: item.quantity,
          received: existing.received,
        };
      }
      const fresh = freshById.get(idStr);
      return {
        product: { _id: new Types.ObjectId(item.productId) },
        variant: { _id: new Types.ObjectId(item.variantId) },
        unitPrice: fresh?.unitPrice ?? 0,
        quantity: item.quantity,
        received: false,
      };
    });
  }

  private buildDefaultDraftDeliveryPayload(customer: Pick<ICustomer, "state" | "city" | "street" | "house" | "apartment" | "zipCode">): IDeliveryPayload {
    return {
      condition: DELIVERY.DELIVERY,
      express: false,
      address: {
        state: customer.state,
        city: customer.city,
        street: customer.street,
        house: customer.house,
        apartment: customer.apartment,
        zipCode: customer.zipCode,
      },
    };
  }

  private async enrichProducts(products: IProductInOrder[]): Promise<IProductInOrderResponse[]> {
    if (!products || products.length === 0) {
      return [];
    }
    const uniqueIds = [
      ...new Set(
        products.map((item) => item?.product?._id?.toString()).filter((value): value is string => Boolean(value)),
      ),
    ];

    const productDocs = await Product.find({ _id: { $in: uniqueIds.map((id) => new Types.ObjectId(id)) } })
      .select("_id name")
      .lean()
      .exec();

    const productById = new Map<string, { name: string }>(
      productDocs.map((doc) => [
        doc._id.toString(),
        { name: doc.name },
      ]),
    );

    return products.map((item) => {
      const productId = item.product._id;
      const lookup = productById.get(productId.toString());
      return {
        product: {
          _id: new Types.ObjectId(productId),
          name: lookup?.name ?? "",
        },
        variant: {
          _id: new Types.ObjectId(item.variant._id),
        },
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        received: item.received,
      };
    });
  }

  async create(order: IOrderRequest, performerdId: string): Promise<OrderDetailsDTO> {
    const products = await productsMapping(order);
    const performer = await managersService.getManager(performerdId);
    const customer = await CustomerService.getCustomer(order.customer);
    const customerSnapshot = this.buildCustomerSnapshot(customer);
    const defaultDelivery = this.buildDefaultDraftDeliveryPayload(customer);
    const prices = await pricingService.calculateOrderTotals({ products, delivery: defaultDelivery });

    if (!prices.deliverySnapshot) {
      throw new Error("Failed to build default delivery snapshot");
    }

    const newOrder: IOrder<IOrderCustomerSnapshot> = {
      status: ORDER_STATUSES.DRAFT,
      customer: customerSnapshot,
      products,
      delivery: {
        ...prices.deliverySnapshot,
        status: DELIVERY_STATUSES.DRAFT,
      },
      total_price: prices.totalPrice,
      createdOn: getTodaysDate(true),
      history: [],
      comments: [],
      assignedManager: null,
    };

    const historyProducts = await this.enrichProducts(products);
    newOrder.history.unshift(
      createHistoryEntry({ ...newOrder, products: historyProducts }, ORDER_HISTORY_ACTIONS.CREATED, performer),
    );
    const createdOrder = await Order.create(newOrder);

    return this.getOrder(createdOrder._id);
  }

  async getAll(): Promise<OrderListItemDTO[]> {
    const orders = await Order.find().lean().exec();
    const reversed = orders.reverse() as unknown as IOrder<IOrderCustomerSnapshot>[];
    return Promise.all(
      reversed.map(async (o) =>
        this.withOverdueDelivery({
          ...o,
          products: await this.enrichProducts(o.products as IProductInOrder[]),
        }),
      ),
    );
  }

  async getSorted(
    filters: { search?: string; status?: string[]; deliveryStatus?: string[] },
    sortOptions: { sortField: string; sortOrder: string },
    pagination: { skip: number; limit: number },
    projectionFields?: string[],
    includeOverdue: boolean = true,
  ): Promise<{ orders: OrderListItemDTO[]; total: number }> {
    const { search = "", status = [], deliveryStatus = [] } = filters;
    const { skip, limit } = pagination;

    const filter: Record<string, unknown> = {};

    if (status.length > 0) {
      filter.status = { $in: status };
    }
    if (deliveryStatus.length > 0) {
      filter["delivery.status"] = { $in: deliveryStatus };
    }

    if (search.trim() !== "") {
      const searchRegex = new RegExp(search, "i");
      const searchNumber = parseFloat(search);
      const searchConditions: Record<string, unknown>[] = [
        { "customer.name": { $regex: searchRegex } },
        { "customer.email": { $regex: searchRegex } },
        { status: { $regex: searchRegex } },
        { "delivery.status": { $regex: searchRegex } },
      ];

      if (Types.ObjectId.isValid(search.trim())) {
        searchConditions.push({ _id: new Types.ObjectId(search.trim()) });
      }

      if (!isNaN(searchNumber)) {
        searchConditions.push({ total_price: searchNumber });
      }

      filter.$or = searchConditions;
    }

    const allowedSortFields = new Set(["createdOn", "total_price", "status"]);
    const sortField = allowedSortFields.has(sortOptions.sortField) ? sortOptions.sortField : "createdOn";
    const sortOrder = sortOptions.sortOrder === "asc" ? 1 : -1;
    const sort: Record<string, 1 | -1> = { [sortField]: sortOrder };
    if (sortField !== "createdOn") {
      sort.createdOn = sortOrder;
    }

    const listQuery = Order.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .collation({ locale: "en", strength: 2 })
      .lean();

    if (projectionFields && projectionFields.length > 0) {
      listQuery.select(projectionFields.join(" "));
    } else {
      listQuery.select("-history -comments");
    }

    const [orders, total] = await Promise.all([listQuery.exec(), Order.countDocuments(filter).exec()]);

    const dbOrders = orders as unknown as IOrder<IOrderCustomerSnapshot>[];
    const enriched = await this.enrichOrdersList(dbOrders);
    const ordersWithOverdue = includeOverdue
      ? enriched.map((order) => this.withOverdueDelivery(order))
      : enriched;
    return { orders: ordersWithOverdue, total };
  }

  private async enrichOrdersList(orders: IOrder<IOrderCustomerSnapshot>[]): Promise<OrderListItemDTO[]> {
    if (orders.length === 0) {
      return [];
    }
    const allProducts = orders.flatMap((order) => (order.products ?? []) as IProductInOrder[]);
    const enrichedFlat = await this.enrichProducts(allProducts);
    let cursor = 0;
    return orders.map((order) => {
      const len = (order.products ?? []).length;
      const slice = enrichedFlat.slice(cursor, cursor + len);
      cursor += len;
      return { ...order, products: slice };
    });
  }

  async exportOrders(params: {
    format: OrderExportFormatDTO;
    fields: string[];
    filters?: {
      search?: string;
      status?: string[];
      deliveryStatus?: string[];
      page?: number;
      limit?: number;
      sortField?: "createdOn" | "total_price" | "status";
      sortOrder?: "asc" | "desc";
    } | null;
  }): Promise<{ fileName: string; contentType: string; content: string }> {
    const { format, fields, filters } = params;

    if (!["csv", "json"].includes(format)) {
      throw new Error("EXPORT_VALIDATION:Invalid export format");
    }

    ExportService.assertSelectedFields(fields, this.exportableFields);

    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 0;
    const pagination =
      typeof page === "number" && typeof limit === "number" && page > 0 && limit > 0
        ? { skip: (page - 1) * limit, limit }
        : { skip: 0, limit: 1000000 };

    const { orders } = await this.getSorted(
      {
        search: filters?.search ?? "",
        status: filters?.status ?? [],
        deliveryStatus: filters?.deliveryStatus ?? [],
      },
      { sortField: filters?.sortField ?? "createdOn", sortOrder: filters?.sortOrder ?? "desc" },
      pagination,
      this.buildExportProjection(fields),
      false,
    );

    const rows = orders.map((order) => this.flattenOrderForExport(order, fields));
    const headers = this.getHeaders(rows);
    const fileName = ExportService.buildFileName("orders-export", format);

    if (format === "json") {
      return {
        fileName,
        contentType: "application/json; charset=utf-8",
        content: JSON.stringify(rows, null, 2),
      };
    }

    return {
      fileName,
      contentType: "text/csv; charset=utf-8",
      content: `\uFEFF${ExportService.toCsv(rows, headers)}`,
    };
  }

  private flattenOrderForExport(order: OrderListItemDTO, fields: string[]): Record<string, unknown> {
    const row: Record<string, unknown> = {};

    fields.forEach((field) => {
      if (field === "customer") {
        row["customer._id"] = order.customer?._id?.toString?.() ?? "";
        row["customer.email"] = order.customer?.email ?? "";
        row["customer.name"] = order.customer?.name ?? "";
        return;
      }

      if (field === "products") {
        const products = Array.isArray(order.products) ? order.products : [];
        products.forEach((item, index) => {
          const base = `products[${index + 1}]`;
          row[`${base}.product._id`] = item?.product?._id?.toString?.() ?? "";
          row[`${base}.variant._id`] = item?.variant?._id?.toString?.() ?? "";
          row[`${base}.product.name`] = item?.product?.name ?? "";
          row[`${base}.unitPrice`] = typeof item?.unitPrice === "number" ? item.unitPrice : "";
          row[`${base}.quantity`] = typeof item?.quantity === "number" ? item.quantity : "";
          row[`${base}.received`] = typeof item?.received === "boolean" ? item.received : "";
        });
        return;
      }

      if (field === "delivery") {
        row["delivery.condition"] = order.delivery?.condition ?? "";
        row["delivery.schedule.estimatedDate"] =
          order.delivery?.schedule && "estimatedDate" in order.delivery.schedule ? order.delivery.schedule.estimatedDate : "";
        row["delivery.schedule.estimatedDays"] =
          order.delivery?.schedule && "estimatedDays" in order.delivery.schedule ? order.delivery.schedule.estimatedDays : "";
        row["delivery.schedule.startsAt"] =
          order.delivery?.schedule && "startsAt" in order.delivery.schedule ? order.delivery.schedule.startsAt : "";
        row["delivery.schedule.dueDate"] =
          order.delivery?.schedule && "dueDate" in order.delivery.schedule ? order.delivery.schedule.dueDate : "";
        row["delivery.schedule.readyInDays"] =
          order.delivery?.schedule && "readyInDays" in order.delivery.schedule ? order.delivery.schedule.readyInDays : "";
        row["delivery.schedule.holdForDays"] =
          order.delivery?.schedule && "holdForDays" in order.delivery.schedule ? order.delivery.schedule.holdForDays : "";
        row["delivery.schedule.availableFromDate"] =
          order.delivery?.schedule && "availableFromDate" in order.delivery.schedule
            ? order.delivery.schedule.availableFromDate
            : "";
        row["delivery.schedule.pickupByDate"] =
          order.delivery?.schedule && "pickupByDate" in order.delivery.schedule ? order.delivery.schedule.pickupByDate : "";
        row["delivery.schedule.express"] =
          order.delivery?.schedule && "express" in order.delivery.schedule ? order.delivery.schedule.express : "";
        row["delivery.pricingTier"] = order.delivery?.pricingTier ?? "";
        row["delivery.price"] = typeof order.delivery?.price === "number" ? order.delivery.price : "";
        row["delivery.address.state"] = order.delivery?.address?.state ?? "";
        row["delivery.address.city"] = order.delivery?.address?.city ?? "";
        row["delivery.address.street"] = order.delivery?.address?.street ?? "";
        row["delivery.address.house"] = order.delivery?.address?.house ?? "";
        row["delivery.address.apartment"] = order.delivery?.address?.apartment ?? "";
        row["delivery.address.zipCode"] = order.delivery?.address?.zipCode ?? "";
        return;
      }

      if (field === "deliveryStatus") {
        row.deliveryStatus = order.delivery?.status ?? "";
        return;
      }

      if (field === "assignedManager") {
        row["assignedManager._id"] = order.assignedManager?._id?.toString?.() ?? "";
        row["assignedManager.firstName"] = order.assignedManager?.firstName ?? "";
        row["assignedManager.lastName"] = order.assignedManager?.lastName ?? "";
        return;
      }

      // TODO(types): avoid generic index cast by using a typed export-field map.
      row[field] = (order as unknown as Record<string, unknown>)[field] ?? "";
    });

    return row;
  }

  private getHeaders(rows: Record<string, unknown>[]): string[] {
    const headers: string[] = [];
    rows.forEach((row) => {
      Object.keys(row).forEach((key) => {
        if (!headers.includes(key)) headers.push(key);
      });
    });
    return headers;
  }

  private buildExportProjection(fields: string[]): string[] {
    const projection = new Set<string>();

    fields.forEach((field) => {
      switch (field) {
        case "customer":
          projection.add("customer");
          break;
        case "products":
          projection.add("products");
          break;
        case "delivery":
          projection.add("delivery");
          break;
        case "assignedManager":
          projection.add("assignedManager");
          break;
        case "status":
        case "deliveryStatus":
          projection.add("delivery.status");
          break;
        case "total_price":
        case "createdOn":
          projection.add(field);
          break;
      }
    });

    return [...projection];
  }

  async getOrder(id: Types.ObjectId): Promise<OrderDetailsDTO> {
    if (!id) {
      throw new Error("Id was not provided");
    }
    const orderFromDB = await Order.findById(id).lean().exec();
    if (!orderFromDB) {
      return undefined;
    }
    const customer = await CustomerService.getCustomer(orderFromDB.customer._id);
    const authorIds = [
      ...new Set(
        (orderFromDB.comments ?? [])
          .map((comment) => {
            const createdBy = comment.createdBy;
            if (!createdBy) return null;
            return createdBy.toString();
          })
          .filter((value): value is string => Boolean(value)),
      ),
    ];

    const authors = await managersService.getManagersByIds(authorIds);
    const authorById = new Map<string, ICommentAuthor>(
      authors.map((author) => [
        author._id.toString(),
        {
          _id: author._id,
          username: author.username,
          firstName: author.firstName,
          lastName: author.lastName,
        },
      ]),
    );

    const commentsWithResolvedAuthors = (orderFromDB.comments ?? []).map((comment) => {
      const createdBy = comment.createdBy;
      if (!createdBy) {
        return comment;
      }

      const resolvedAuthor = authorById.get(createdBy.toString());
      if (!resolvedAuthor) {
        return comment;
      }

      return { ...comment, createdBy: resolvedAuthor };
    });

    const enrichedProducts = await this.enrichProducts(orderFromDB.products as unknown as IProductInOrder[]);

    return this.withOverdueDelivery({
      ...(orderFromDB as unknown as IOrder<IOrderCustomerSnapshot>),
      customer,
      products: enrichedProducts,
      comments: commentsWithResolvedAuthors,
    } as unknown as OrderDetailsDTO);
  }

  async update(
    orderId: Types.ObjectId,
    order: IOrderUpdateRequest,
    performerId: string,
    currentOrder: OrderDetailsDTO,
  ): Promise<OrderDetailsDTO> {
    const nextCustomer = order.customer
      ? await CustomerService.getCustomer(order.customer)
      : (currentOrder.customer as ICustomer);

    const currentProducts: IProductInOrder[] = currentOrder.products.map((item) => ({
      product: { _id: new Types.ObjectId(item.product._id) },
      variant: { _id: new Types.ObjectId(item.variant._id) },
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      received: item.received,
    }));

    const nextProducts: IProductInOrder[] = await this.mergeProductsForUpdate(currentProducts, order.products);

    const manager = await managersService.getManager(performerId);
    const customerSnapshot = this.buildCustomerSnapshot(nextCustomer);
    const isCustomerChanged = Boolean(order.customer && !_.isEqual(order.customer.toString(), currentOrder.customer._id.toString()));

    let nextDelivery = currentOrder.delivery;
    let totalPrice = 0;

    if (isCustomerChanged) {
      const defaultDeliveryPayload = this.buildDefaultDraftDeliveryPayload(nextCustomer);
      const pricesWithDraftDelivery = await pricingService.calculateOrderTotals({
        products: nextProducts,
        delivery: defaultDeliveryPayload,
      });

      if (!pricesWithDraftDelivery.deliverySnapshot) {
        throw new Error("Failed to build default delivery snapshot");
      }

      nextDelivery = {
        ...pricesWithDraftDelivery.deliverySnapshot,
        status: DELIVERY_STATUSES.DRAFT,
      };
      totalPrice = pricesWithDraftDelivery.totalPrice;
    } else {
      const currentLinesCount = currentProducts.length;
      const nextLinesCount = nextProducts.length;

      if (currentLinesCount !== nextLinesCount) {
        const recalculatedDeliveryPrice = pricingService.recalculateDeliveryPriceByLines({
          currentDelivery: currentOrder.delivery,
          currentLinesCount,
          nextLinesCount,
        });

        nextDelivery = {
          ...currentOrder.delivery,
          price: recalculatedDeliveryPrice,
        };
      }

      const pricesWithoutDelivery = await pricingService.calculateOrderTotals({ products: nextProducts });
      totalPrice = pricesWithoutDelivery.productsSubtotal + nextDelivery.price;
    }

    const newOrder: IOrder<IOrderCustomerSnapshot> = {
      status: ORDER_STATUSES.DRAFT,
      customer: customerSnapshot,
      products: nextProducts,
      delivery: nextDelivery,
      total_price: totalPrice,
      history: currentOrder.history,
      createdOn: currentOrder.createdOn,
      comments: currentOrder.comments,
      assignedManager: currentOrder.assignedManager,
    };

    const changed = { products: false, customer: false };

    const nextHistoryProducts = await this.enrichProducts(nextProducts);
    const currentHistoryProducts = currentOrder.products.map((item) => ({ ...item }));

    if (order.products) {
      const requested = order.products.map((item) => ({
        productId: item.productId.toString(),
        variantId: item.variantId.toString(),
        quantity: item.quantity,
      }));
      const currentTuples = currentProducts.map((item) => ({
        productId: item.product._id.toString(),
        variantId: item.variant._id.toString(),
        quantity: item.quantity,
      }));
      if (!_.isEqual(requested, currentTuples)) {
        changed.products = true;
        const historyEntrySource = {
          ..._.cloneDeep(newOrder),
          products: nextHistoryProducts,
          customer: this.buildCustomerSnapshot(currentOrder.customer as ICustomer),
        };
        newOrder.history.unshift(
          createHistoryEntry(historyEntrySource, ORDER_HISTORY_ACTIONS.REQUIRED_PRODUCTS_CHANGED, manager),
        );
      }
    }

    if (isCustomerChanged) {
      changed.customer = true;
      const historyEntrySource = {
        ..._.cloneDeep(newOrder),
        products: currentHistoryProducts,
      };
      newOrder.history.unshift(createHistoryEntry(historyEntrySource, ORDER_HISTORY_ACTIONS.CUSTOMER_CHANGED, manager));
    }

    const updatedOrder = await Order.findByIdAndUpdate(orderId, newOrder, { new: true });
    if (!updatedOrder) {
      throw new Error("Order not found");
    }

    if (updatedOrder.assignedManager) {
      if (changed.products) {
        await this.notificationService.create({
          managerId: updatedOrder.assignedManager._id.toString(),
          orderId: updatedOrder._id.toString(),
          type: "productsChanged",
          message: NOTIFICATIONS.productsChanged,
        });
      }
      if (changed.customer) {
        await this.notificationService.create({
          managerId: updatedOrder.assignedManager._id.toString(),
          orderId: updatedOrder._id.toString(),
          type: "customerChanged",
          message: NOTIFICATIONS.customerChanged,
        });
      }
    }

    return this.getOrder(updatedOrder._id);
  }

  async delete(id: Types.ObjectId): Promise<OrderDetailsDTO> {
    console.log(id);
    if (!id) {
      throw new Error("Id was not provided");
    }
    const order = await Order.findByIdAndDelete(id).lean().exec();
    if (!order) {
      return undefined;
    }
    const customer = await CustomerService.getCustomer(order.customer._id);
    const enrichedProducts = await this.enrichProducts(order.products as unknown as IProductInOrder[]);
    return {
      ...(order as unknown as IOrder<IOrderCustomerSnapshot>),
      customer,
      products: enrichedProducts,
    } as unknown as OrderDetailsDTO;
  }

  async getOrdersByCustomer(customerId: string) {
    if (!customerId) {
      throw new Error("Customer ID was not provided");
    }
    const orders = await Order.find({ "customer._id": new Types.ObjectId(customerId) })
      .lean()
      .exec();
    return orders.map(
      (order) =>
        this.withOverdueDelivery(order as unknown as OrderDetailsDTO) as unknown as IOrder<IOrderCustomerSnapshot>,
    );
  }

  async getOrdersByManager(managerId: string) {
    if (!managerId) {
      throw new Error("Manager ID was not provided");
    }

    if (!Types.ObjectId.isValid(managerId)) {
      throw new Error("Invalid Manager ID format");
    }

    const orders = await Order.find({ "assignedManager._id": new Types.ObjectId(managerId) })
      .lean()
      .exec();
    return orders.map((order) => this.withOverdueDelivery(order as unknown as OrderDetailsDTO));
  }

  async assignManager(orderId: string, managerId: string, performerId: string, currentOrder: OrderDetailsDTO) {
    const manager = await managersService.getManager(managerId);
    const performer = await managersService.getManager(performerId);
    const newOrder: OrderDetailsDTO = {
      ...currentOrder,
      assignedManager: manager,
    };

    newOrder.history.unshift(
      createHistoryEntry(
        // TODO(types): align createHistoryEntry input type with order aggregate shape to remove cast.
        newOrder as unknown as Omit<IHistory, "changedOn" | "action" | "performer">,
        ORDER_HISTORY_ACTIONS.MANAGER_ASSIGNED,
        performer,
      ),
    );

    const updatedOrder = await Order.findByIdAndUpdate(new Types.ObjectId(orderId), newOrder, { new: true });
    if (!updatedOrder) throw new Error("Order not found");

    await this.notificationService.create({
      managerId: updatedOrder.assignedManager._id.toString(),
      orderId: updatedOrder._id.toString(),
      type: "assigned",
      message: NOTIFICATIONS.assigned,
    });

    return this.getOrder(updatedOrder._id);
  }

  async unassignManager(orderId: string, performerId: string, currentOrder: OrderDetailsDTO) {
    const previousAssignee = currentOrder.assignedManager;
    const performer = await managersService.getManager(performerId);
    const newOrder: OrderDetailsDTO = {
      ...currentOrder,
      assignedManager: null,
    };

    if (previousAssignee) {
      newOrder.history.unshift(
        createHistoryEntry(
          // TODO(types): align createHistoryEntry input type with order aggregate shape to remove cast.
          newOrder as unknown as Omit<IHistory, "changedOn" | "action" | "performer">,
          ORDER_HISTORY_ACTIONS.MANAGER_UNASSIGNED,
          performer,
        ),
      );
    }

    const updatedOrder = await Order.findByIdAndUpdate(new Types.ObjectId(orderId), newOrder, { new: true });
    if (!updatedOrder) throw new Error("Order not found");

    if (previousAssignee) {
      await this.notificationService.create({
        managerId: previousAssignee._id.toString(),
        orderId: updatedOrder._id.toString(),
        type: "unassigned",
        message: NOTIFICATIONS.unassigned,
      });
    }

    return this.getOrder(updatedOrder._id);
  }
}

export default new OrderService();
