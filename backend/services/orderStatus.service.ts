import Order from "../models/order.model";
import CustomerService from "./customer.service";
import OrderService from "./order.service";
import _ from "lodash";
import type { IOrder, ICustomer } from "../data/types";
import { createHistoryEntry } from "../utils/utils";
import mongoose, { Types } from "mongoose";
import { NOTIFICATIONS, ORDER_HISTORY_ACTIONS, ORDER_STATUSES } from "../data/enums";
import usersService from "./users.service";
import { NotificationService } from "./notification.service";

class OrderStatusService {
  private notificationService = new NotificationService();
  async updateStatus(orderId: Types.ObjectId, status: string, performerId: string): Promise<IOrder<ICustomer>> {
    if (!orderId) {
      throw new Error("Id was not provided");
    }
    const orderFromDB = await OrderService.getOrder(orderId);
    const manager = await usersService.getUser(performerId);
    const newOrder: IOrder<Types.ObjectId> = {
      ...orderFromDB,
      customer: orderFromDB.customer._id,
      status: status as ORDER_STATUSES,
    };
    let action: ORDER_HISTORY_ACTIONS;
    if (status === ORDER_STATUSES.IN_PROCESS) action = ORDER_HISTORY_ACTIONS.PROCESSED;
    if (status === ORDER_STATUSES.CANCELED) action = ORDER_HISTORY_ACTIONS.CANCELED;
    if (status === ORDER_STATUSES.DRAFT) {
      action = ORDER_HISTORY_ACTIONS.REOPENED;
      newOrder.delivery = null;
    }

    newOrder.history.unshift(createHistoryEntry(newOrder, action, manager));
    const updatedOrder = await Order.findByIdAndUpdate(newOrder._id, newOrder, { new: true });
    const customer = await CustomerService.getCustomer(updatedOrder.customer);
    if (updatedOrder.assignedManager) {
      await this.notificationService.create({
        userId: updatedOrder.assignedManager._id.toString(),
        orderId: updatedOrder._id.toString(),
        type: "statusChanged",
        message: NOTIFICATIONS.statusChanged(updatedOrder.status),
      });
    }
    return { ...updatedOrder._doc, customer };
  }
}

export default new OrderStatusService();

