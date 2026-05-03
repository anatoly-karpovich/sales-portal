import { DELIVERY_STATUSES, NOTIFICATIONS, ORDER_HISTORY_ACTIONS, ORDER_STATUSES } from "../data/enums";
import type { IOrderReceiveRequestItem, IProductInOrder } from "../data/types";
import Order from "../models/order.model";
import OrderService from "./order.service";
import { createHistoryEntry } from "../utils/utils";
import { Types } from "mongoose";
import managersService from "./managers.service";
import { NotificationService } from "./notification.service";
import { OrderDetailsDTO } from "../data/types/dto/orders.dto";

class OrderReceiveService {
  private notificationService = new NotificationService();

  async receiveProducts(
    orderId: Types.ObjectId,
    products: IOrderReceiveRequestItem[],
    performerId: string,
    currentOrder: OrderDetailsDTO,
  ): Promise<OrderDetailsDTO> {
    if (!orderId) {
      throw new Error("Id was not provided");
    }

    const dbProducts: IProductInOrder[] = currentOrder.products.map((item) => ({
      product: { _id: new Types.ObjectId(item.product._id) },
      variant: { _id: new Types.ObjectId(item.variant._id) },
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      received: item.received,
    }));

    const manager = await managersService.getManager(performerId);
    const requestedProductKeys = products.map(
      (product) => `${product.productId.toString()}:${product.variantId.toString()}`,
    );
    const requestedProductKeysSet = new Set(requestedProductKeys);
    let receivedChanged = false;
    for (const requestedProductKey of requestedProductKeys) {
      const positionIndex = dbProducts.findIndex(
        (item) =>
          `${item.product._id.toString()}:${item.variant._id.toString()}` === requestedProductKey && !item.received,
      );
      if (positionIndex !== -1) {
        dbProducts[positionIndex] = { ...dbProducts[positionIndex], received: true };
        receivedChanged = true;
      }
    }

    if (!receivedChanged) {
      return OrderService.getOrder(orderId);
    }

    const receivedByProductId = new Map<string, boolean>(
      dbProducts.map((item) => [`${item.product._id.toString()}:${item.variant._id.toString()}`, item.received]),
    );
    const historyProducts = currentOrder.products.map((item) => ({
      ...item,
      received: requestedProductKeysSet.has(`${item.product._id.toString()}:${item.variant._id.toString()}`)
        ? true
        : (receivedByProductId.get(`${item.product._id.toString()}:${item.variant._id.toString()}`) ?? item.received),
    }));

    const orderForUpdate = {
      ...currentOrder,
      products: dbProducts,
      history: [...currentOrder.history],
      comments: [...currentOrder.comments],
    };

    const numberOfReceived = dbProducts.filter((el) => el.received).length;
    let action: ORDER_HISTORY_ACTIONS = ORDER_HISTORY_ACTIONS.RECEIVED;
    if (numberOfReceived > 0 && numberOfReceived < dbProducts.length) {
      orderForUpdate.status = ORDER_STATUSES.IN_PROCESS;
      orderForUpdate.delivery = {
        ...orderForUpdate.delivery,
        status: DELIVERY_STATUSES.PARTIALLY_DELIVERED,
      };
      action = ORDER_HISTORY_ACTIONS.RECEIVED;
    }
    if (numberOfReceived === dbProducts.length) {
      orderForUpdate.status = ORDER_STATUSES.COMPLETED;
      orderForUpdate.delivery = {
        ...orderForUpdate.delivery,
        status: DELIVERY_STATUSES.DELIVERED,
      };
      action = ORDER_HISTORY_ACTIONS.RECEIVED_ALL;
    }

    const historyEntrySource = {
      status: orderForUpdate.status,
      customer: currentOrder.customer._id as Types.ObjectId | string,
      products: historyProducts,
      delivery: orderForUpdate.delivery,
      total_price: orderForUpdate.total_price,
      assignedManager: orderForUpdate.assignedManager,
    };

    orderForUpdate.history.unshift(
      createHistoryEntry(
        historyEntrySource,
        action,
        manager,
      ),
    );
    const updatedOrder = await Order.findByIdAndUpdate(orderId, orderForUpdate, { new: true });
    if (!updatedOrder) {
      throw new Error("Order not found");
    }

    if (updatedOrder.assignedManager) {
      await this.notificationService.create({
        managerId: updatedOrder.assignedManager._id.toString(),
        orderId: updatedOrder._id.toString(),
        type: "productsDelivered",
        message: NOTIFICATIONS.productsDelivered,
      });
      if (updatedOrder.status === ORDER_STATUSES.COMPLETED) {
        await this.notificationService.create({
          managerId: updatedOrder.assignedManager._id.toString(),
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
