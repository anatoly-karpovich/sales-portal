import Order from "../models/order.model";
import CustomerService from "./customer.service";
import { IOrder, IOrderRequest, ICustomer, IHistory, IOrderCustomerSnapshot } from "../data/types";
import { Types } from "mongoose";
import { getTotalPrice, createHistoryEntry, productsMapping, getTodaysDate } from "../utils/utils";
import { NOTIFICATIONS, ORDER_HISTORY_ACTIONS, ORDER_STATUSES } from "../data/enums";
import _ from "lodash";
import usersService from "./users.service";
import { NotificationService } from "./notification.service";
import ExportService from "./export.service";
import { OrderExportFormatDTO } from "../data/types/dto/orders.dto";

class OrderService {
  private notificationService = new NotificationService();
  private readonly exportableFields = new Set<string>([
    "status",
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

  async create(order: IOrderRequest, performerdId: string): Promise<IOrder<ICustomer>> {
    const products = await productsMapping(order);
    const performer = await usersService.getUser(performerdId);
    const customer = await CustomerService.getCustomer(order.customer);
    const customerSnapshot = this.buildCustomerSnapshot(customer);

    const newOrder: IOrder<IOrderCustomerSnapshot> = {
      status: ORDER_STATUSES.DRAFT,
      customer: customerSnapshot,
      products,
      delivery: null,
      total_price: getTotalPrice(products),
      createdOn: getTodaysDate(true),
      history: [],
      comments: [],
      assignedManager: null,
    };

    newOrder.history.unshift(createHistoryEntry(newOrder, ORDER_HISTORY_ACTIONS.CREATED, performer));
    const createdOrder = await Order.create(newOrder);

    return this.getOrder(createdOrder._id);
  }

  async getAll(): Promise<IOrder<IOrderCustomerSnapshot>[]> {
    const orders = await Order.find();
    return orders.reverse().map((order) => order._doc);
  }

  async getSorted(
    filters: { search?: string; status?: string[] },
    sortOptions: { sortField: string; sortOrder: string },
    pagination: { skip: number; limit: number },
    projectionFields?: string[],
  ): Promise<{ orders: IOrder<IOrderCustomerSnapshot>[]; total: number }> {
    const { search = "", status = [] } = filters;
    const { skip, limit } = pagination;

    const filter: Record<string, unknown> = {};

    if (status.length > 0) {
      filter.status = { $in: status };
    }

    if (search.trim() !== "") {
      const searchRegex = new RegExp(search, "i");
      const searchNumber = parseFloat(search);
      const searchConditions: Record<string, unknown>[] = [
        { "customer.name": { $regex: searchRegex } },
        { "customer.email": { $regex: searchRegex } },
        { status: { $regex: searchRegex } },
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

    const listQuery = Order.find(filter).sort(sort).skip(skip).limit(limit).collation({ locale: "en", strength: 2 });

    if (projectionFields && projectionFields.length > 0) {
      listQuery.select(projectionFields.join(" "));
    } else {
      listQuery.select("-history -comments");
    }

    const [orders, total] = await Promise.all([listQuery.exec(), Order.countDocuments(filter).exec()]);

    return { orders: orders.map((order) => order._doc), total };
  }

  async exportOrders(params: {
    format: OrderExportFormatDTO;
    fields: string[];
    filters?: {
      search?: string;
      status?: string[];
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
      { search: filters?.search ?? "", status: filters?.status ?? [] },
      { sortField: filters?.sortField ?? "createdOn", sortOrder: filters?.sortOrder ?? "desc" },
      pagination,
      this.buildExportProjection(fields),
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

  private flattenOrderForExport(order: IOrder<IOrderCustomerSnapshot>, fields: string[]): Record<string, unknown> {
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
        products.forEach((product, index) => {
          const base = `products[${index + 1}]`;
          row[`${base}._id`] = product?._id?.toString?.() ?? "";
          row[`${base}.name`] = product?.name ?? "";
          row[`${base}.amount`] = product?.amount ?? "";
          row[`${base}.price`] = product?.price ?? "";
          row[`${base}.manufacturer`] = product?.manufacturer ?? "";
          row[`${base}.notes`] = product?.notes ?? "";
          row[`${base}.received`] = typeof product?.received === "boolean" ? product.received : "";
        });
        return;
      }

      if (field === "delivery") {
        row["delivery.finalDate"] = order.delivery?.finalDate ?? "";
        row["delivery.condition"] = order.delivery?.condition ?? "";
        row["delivery.address.country"] = order.delivery?.address?.country ?? "";
        row["delivery.address.city"] = order.delivery?.address?.city ?? "";
        row["delivery.address.street"] = order.delivery?.address?.street ?? "";
        row["delivery.address.house"] = order.delivery?.address?.house ?? "";
        row["delivery.address.flat"] = order.delivery?.address?.flat ?? "";
        return;
      }

      if (field === "assignedManager") {
        row["assignedManager._id"] = order.assignedManager?._id?.toString?.() ?? "";
        row["assignedManager.firstName"] = order.assignedManager?.firstName ?? "";
        row["assignedManager.lastName"] = order.assignedManager?.lastName ?? "";
        return;
      }

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
        case "total_price":
        case "createdOn":
          projection.add(field);
          break;
      }
    });

    return [...projection];
  }

  async getOrder(id: Types.ObjectId): Promise<IOrder<ICustomer>> {
    if (!id) {
      throw new Error("Id was not provided");
    }
    const orderFromDB = await Order.findById(id);
    if (!orderFromDB) {
      return undefined;
    }
    const customer = await CustomerService.getCustomer(orderFromDB.customer._id);
    return { ...orderFromDB._doc, customer };
  }

  async update(
    orderId: Types.ObjectId,
    order: IOrderRequest,
    performerId: string,
    currentOrder: IOrder<ICustomer>,
  ): Promise<IOrder<ICustomer>> {
    const products = await productsMapping(order);
    const manager = await usersService.getUser(performerId);
    const customer = await CustomerService.getCustomer(order.customer);
    const customerSnapshot = this.buildCustomerSnapshot(customer);

    const newOrder: IOrder<IOrderCustomerSnapshot> = {
      status: ORDER_STATUSES.DRAFT,
      customer: customerSnapshot,
      products,
      delivery: currentOrder.delivery,
      total_price: getTotalPrice(products),
      history: currentOrder.history,
      createdOn: currentOrder.createdOn,
      comments: currentOrder.comments,
      assignedManager: currentOrder.assignedManager,
    };

    const changed = { products: false, customer: false };

    if (
      !_.isEqual(
        order.products,
        currentOrder.products.map((p) => p._id.toString()),
      )
    ) {
      changed.products = true;
      const o = _.cloneDeep(newOrder);
      o.customer = this.buildCustomerSnapshot(currentOrder.customer as ICustomer);
      newOrder.history.unshift(createHistoryEntry(o, ORDER_HISTORY_ACTIONS.REQUIRED_PRODUCTS_CHANGED, manager));
    }

    if (!_.isEqual(order.customer.toString(), currentOrder.customer._id.toString())) {
      changed.customer = true;
      const o = _.cloneDeep(newOrder);
      o.products = [...currentOrder.products];
      newOrder.history.unshift(createHistoryEntry(o, ORDER_HISTORY_ACTIONS.CUSTOMER_CHANGED, manager));
    }

    const updatedOrder = await Order.findByIdAndUpdate(orderId, newOrder, { new: true });
    if (!updatedOrder) {
      throw new Error("Order not found");
    }

    if (updatedOrder.assignedManager) {
      if (changed.products) {
        await this.notificationService.create({
          userId: updatedOrder.assignedManager._id.toString(),
          orderId: updatedOrder._id.toString(),
          type: "productsChanged",
          message: NOTIFICATIONS.productsChanged,
        });
      }
      if (changed.customer) {
        await this.notificationService.create({
          userId: updatedOrder.assignedManager._id.toString(),
          orderId: updatedOrder._id.toString(),
          type: "customerChanged",
          message: NOTIFICATIONS.customerChanged,
        });
      }
    }

    return this.getOrder(updatedOrder._id);
  }

  async delete(id: Types.ObjectId): Promise<IOrder<ICustomer>> {
    console.log(id);
    if (!id) {
      throw new Error("Id was not provided");
    }
    const order = await Order.findByIdAndDelete(id);
    if (!order) {
      return undefined;
    }
    const customer = await CustomerService.getCustomer(order.customer._id);
    return { ...order._doc, customer };
  }

  async getOrdersByCustomer(customerId: string) {
    if (!customerId) {
      throw new Error("Customer ID was not provided");
    }
    return Order.find({ "customer._id": new Types.ObjectId(customerId) });
  }

  async getOrdersByManager(managerId: string) {
    if (!managerId) {
      throw new Error("Manager ID was not provided");
    }

    if (!Types.ObjectId.isValid(managerId)) {
      throw new Error("Invalid Manager ID format");
    }

    return Order.find({ "assignedManager._id": new Types.ObjectId(managerId) });
  }

  async assignManager(orderId: string, managerId: string, performerId: string, currentOrder: IOrder<ICustomer>) {
    const manager = await usersService.getUser(managerId);
    const performer = await usersService.getUser(performerId);
    const newOrder: IOrder<ICustomer> = {
      ...currentOrder,
      assignedManager: manager,
    };

    newOrder.history.unshift(
      createHistoryEntry(
        newOrder as unknown as Omit<IHistory, "changedOn" | "action" | "performer">,
        ORDER_HISTORY_ACTIONS.MANAGER_ASSIGNED,
        performer,
      ),
    );

    const updatedOrder = await Order.findByIdAndUpdate(new Types.ObjectId(orderId), newOrder, { new: true });
    if (!updatedOrder) throw new Error("Order not found");

    await this.notificationService.create({
      userId: updatedOrder.assignedManager._id.toString(),
      orderId: updatedOrder._id.toString(),
      type: "assigned",
      message: NOTIFICATIONS.assigned,
    });

    return this.getOrder(updatedOrder._id);
  }

  async unassignManager(orderId: string, performerId: string, currentOrder: IOrder<ICustomer>) {
    const previousAssignee = currentOrder.assignedManager;
    const performer = await usersService.getUser(performerId);
    const newOrder: IOrder<ICustomer> = {
      ...currentOrder,
      assignedManager: null,
    };

    if (previousAssignee) {
      newOrder.history.unshift(
        createHistoryEntry(
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
        userId: previousAssignee._id.toString(),
        orderId: updatedOrder._id.toString(),
        type: "unassigned",
        message: NOTIFICATIONS.unassigned,
      });
    }

    return this.getOrder(updatedOrder._id);
  }
}

export default new OrderService();
