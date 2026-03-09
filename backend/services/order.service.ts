import Order from "../models/order.model";
import CustomerService from "./customer.service";
import { IOrder, IOrderRequest, ICustomer, IHistory, IOrderCustomerSnapshot } from "../data/types";
import { Types } from "mongoose";
import { getTotalPrice, createHistoryEntry, productsMapping, getTodaysDate } from "../utils/utils";
import { NOTIFICATIONS, ORDER_HISTORY_ACTIONS, ORDER_STATUSES } from "../data/enums";
import _ from "lodash";
import usersService from "./users.service";
import { NotificationService } from "./notification.service";

class OrderService {
  private notificationService = new NotificationService();

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

    const [orders, total] = await Promise.all([
      Order.find(filter).sort(sort).skip(skip).limit(limit).collation({ locale: "en", strength: 2 }).exec(),
      Order.countDocuments(filter).exec(),
    ]);

    return { orders: orders.map((order) => order._doc), total };
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

  async update(orderId: Types.ObjectId, order: IOrderRequest, performerId: string): Promise<IOrder<ICustomer>> {
    const products = await productsMapping(order);
    const orderFromDb = await Order.findById(orderId);
    if (!orderFromDb) {
      throw new Error("Order not found");
    }
    const manager = await usersService.getUser(performerId);
    const customer = await CustomerService.getCustomer(order.customer);
    const customerSnapshot = this.buildCustomerSnapshot(customer);

    const newOrder: IOrder<IOrderCustomerSnapshot> = {
      status: ORDER_STATUSES.DRAFT,
      customer: customerSnapshot,
      products,
      delivery: orderFromDb.delivery,
      total_price: getTotalPrice(products),
      history: orderFromDb.history,
      createdOn: orderFromDb.createdOn,
      comments: orderFromDb.comments,
      assignedManager: orderFromDb.assignedManager,
    };

    const changed = { products: false, customer: false };

    if (
      !_.isEqual(
        order.products,
        orderFromDb.products.map((p) => p._id.toString()),
      )
    ) {
      changed.products = true;
      const o = _.cloneDeep(newOrder);
      o.customer = orderFromDb.customer;
      newOrder.history.unshift(createHistoryEntry(o, ORDER_HISTORY_ACTIONS.REQUIRED_PRODUCTS_CHANGED, manager));
    }

    if (!_.isEqual(order.customer.toString(), orderFromDb.customer._id.toString())) {
      changed.customer = true;
      const o = _.cloneDeep(newOrder);
      o.products = [...orderFromDb.products];
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

  async assignManager(orderId: string, managerId: string, performerId: string) {
    const manager = await usersService.getUser(managerId);
    const order = await Order.findById(orderId);
    if (!order) throw new Error("Order not found");
    order.assignedManager = manager;

    const performer = await usersService.getUser(performerId);
    order.history.unshift(
      createHistoryEntry(
        order as unknown as Omit<IHistory, "changedOn" | "action" | "performer">,
        ORDER_HISTORY_ACTIONS.MANAGER_ASSIGNED,
        performer,
      ),
    );

    await order.save();

    await this.notificationService.create({
      userId: order.assignedManager._id.toString(),
      orderId: order._id.toString(),
      type: "assigned",
      message: NOTIFICATIONS.assigned,
    });

    return this.getOrder(order._id);
  }

  async unassignManager(orderId: string, performerId: string) {
    const order = await Order.findById(orderId);
    if (!order) throw new Error("Order not found");

    const previousAssignee = order.assignedManager;
    order.assignedManager = null;
    const performer = await usersService.getUser(performerId);

    if (previousAssignee) {
      order.history.unshift(
        createHistoryEntry(
          order as unknown as Omit<IHistory, "changedOn" | "action" | "performer">,
          ORDER_HISTORY_ACTIONS.MANAGER_UNASSIGNED,
          performer,
        ),
      );
    }

    await order.save();

    if (previousAssignee) {
      await this.notificationService.create({
        userId: previousAssignee._id.toString(),
        orderId: order._id.toString(),
        type: "unassigned",
        message: NOTIFICATIONS.unassigned,
      });
    }

    return this.getOrder(order._id);
  }
}

export default new OrderService();
