import { NOTIFICATIONS, ORDER_HISTORY_ACTIONS, ORDER_STATUSES } from "../data/enums";
import type { IOrder, ICustomer } from "../data/types";
import Order from "../models/order.model";
import OrderService from "./order.service";
import { createHistoryEntry } from "../utils/utils";
import { Types } from "mongoose";
import usersService from "./users.service";
import { NotificationService } from "./notification.service";

class OrderReceiveService {
  private notificationService = new NotificationService();

  private normalizeOrderProduct(product: any) {
    const source = product?._doc && typeof product._doc === "object" ? product._doc : product;
    const productId = this.extractProductId(product);
    if (!productId) {
      return null;
    }

    return {
      _id: new Types.ObjectId(productId),
      name: source?.name,
      amount: source?.amount,
      price: source?.price,
      manufacturer: source?.manufacturer,
      createdOn: source?.createdOn,
      notes: source?.notes,
      received: source?.received === true,
    };
  }

  private extractProductId(product: any): string | undefined {
    if (!product || typeof product !== "object") return undefined;
    if (typeof product._id === "string") return product._id;
    if (product._id?.toString) return product._id.toString();
    if (typeof product._doc?._id === "string") return product._doc._id;
    if (product._doc?._id?.toString) return product._doc._id.toString();
    return undefined;
  }

  async receiveProducts(
    orderId: Types.ObjectId,
    products: string[],
    performerId: string,
    currentOrder: IOrder<ICustomer>,
  ): Promise<IOrder<ICustomer>> {
    if (!orderId) {
      throw new Error("Id was not provided");
    }
    const orderFromDB: IOrder<ICustomer> = {
      ...currentOrder,
      products: currentOrder.products
        .map((product) => this.normalizeOrderProduct(product))
        .filter((product): product is NonNullable<ReturnType<OrderReceiveService["normalizeOrderProduct"]>> => !!product),
      history: [...currentOrder.history],
      comments: [...currentOrder.comments],
    };
    const previousStatus = orderFromDB.status;
    const manager = await usersService.getUser(performerId);
    const requestedProductIds = products.map((productId) => productId.toString());
    let receivedChanged = false;
    for (const requestedProductId of requestedProductIds) {
      const productIndex = orderFromDB.products.findIndex((product) => {
        const productId = this.extractProductId(product);
        return productId === requestedProductId && !product.received;
      });

      if (productIndex !== -1) {
        orderFromDB.products[productIndex] = { ...orderFromDB.products[productIndex], received: true };
        receivedChanged = true;
      }
    }

    if (!receivedChanged) {
      return OrderService.getOrder(orderId);
    }

    const numberOfReceived = orderFromDB.products.filter((el) => el.received).length;
    let action: ORDER_HISTORY_ACTIONS = ORDER_HISTORY_ACTIONS.RECEIVED;
    if (numberOfReceived > 0 && numberOfReceived < orderFromDB.products.length) {
      orderFromDB.status = ORDER_STATUSES.PARTIALLY_RECEIVED;
      action = ORDER_HISTORY_ACTIONS.RECEIVED;
    }
    if (numberOfReceived === orderFromDB.products.length) {
      orderFromDB.status = ORDER_STATUSES.RECEIVED;
      action = ORDER_HISTORY_ACTIONS.RECEIVED_ALL;
    }

    orderFromDB.history.unshift(
      createHistoryEntry(orderFromDB as unknown as Parameters<typeof createHistoryEntry>[0], action, manager),
    );
    const updatedOrder = await Order.findByIdAndUpdate(orderId, orderFromDB, { new: true });
    if (!updatedOrder) {
      throw new Error("Order not found");
    }

    if (updatedOrder.assignedManager) {
      await this.notificationService.create({
        userId: updatedOrder.assignedManager._id.toString(),
        orderId: updatedOrder._id.toString(),
        type: "productsDelivered",
        message: NOTIFICATIONS.productsDelivered,
      });
      if (updatedOrder.status === ORDER_STATUSES.RECEIVED) {
        await this.notificationService.create({
          userId: updatedOrder.assignedManager._id.toString(),
          orderId: updatedOrder._id.toString(),
          type: "statusChanged",
          message: NOTIFICATIONS.statusChanged(updatedOrder.status),
        });
      } else if (
        updatedOrder.status === ORDER_STATUSES.PARTIALLY_RECEIVED &&
        previousStatus === ORDER_STATUSES.IN_PROCESS
      ) {
        await this.notificationService.create({
          userId: updatedOrder.assignedManager._id.toString(),
          orderId: updatedOrder._id.toString(),
          type: "statusChanged",
          message: NOTIFICATIONS.statusChanged(updatedOrder.status),
        });
      }
    }

    return OrderService.getOrder(updatedOrder._id);
  }
}

export default new OrderReceiveService();
