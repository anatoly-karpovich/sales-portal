import Order from "../models/order.model";
import CustomerService from "./customer.service";
import _ from "lodash";
import type { IOrder, ICustomer, IDelivery } from "../data/types";
import OrderService from "./order.service";
import { createHistoryEntry } from "../utils/utils";
import mongoose, { Types } from "mongoose";
import { NOTIFICATIONS, ORDER_HISTORY_ACTIONS } from "../data/enums";
import usersService from "./users.service";
import { NotificationService } from "./notification.service";

class OrderDeliveryService {
  private notificationService = new NotificationService();

  async updateDelivery(orderId: Types.ObjectId, delivery: IDelivery, performerId: string): Promise<IOrder<ICustomer>> {
    if (!orderId) {
      throw new Error("Id was not provided");
    }

    const orderFromDB = await OrderService.getOrder(orderId);
    const manager = await usersService.getUser(performerId);

    let action = orderFromDB.delivery
      ? ORDER_HISTORY_ACTIONS.DELIVERY_EDITED
      : ORDER_HISTORY_ACTIONS.DELIVERY_SCHEDULED;
    const newOrder: IOrder<Types.ObjectId> = {
      ...orderFromDB,
      customer: orderFromDB.customer._id,
      delivery: delivery,
    };
    newOrder.history.unshift(createHistoryEntry(newOrder, action, manager));
    const updatedOrder = await Order.findByIdAndUpdate(newOrder._id, newOrder, { new: true });
    const customer = await CustomerService.getCustomer(updatedOrder.customer);
    if (updatedOrder.assignedManager) {
      await this.notificationService.create({
        userId: updatedOrder.assignedManager._id.toString(),
        orderId: updatedOrder._id.toString(),
        type: "deliveryUpdated",
        message: NOTIFICATIONS.deliveryUpdated,
      });
    }
    return { ...updatedOrder._doc, customer };
  }
}

export default new OrderDeliveryService();

