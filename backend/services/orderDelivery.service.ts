import Order from "../models/order.model";
import type { IDelivery } from "../data/types";
import OrderService from "./order.service";
import { createHistoryEntry } from "../utils/utils";
import { Types } from "mongoose";
import { DELIVERY, DELIVERY_STATUSES, NOTIFICATIONS, ORDER_HISTORY_ACTIONS } from "../data/enums";
import managersService from "./managers.service";
import { NotificationService } from "./notification.service";
import { OrderDetailsDTO } from "../data/types/dto/orders.dto";
import { PricingService } from "./pricing.service";
import { IDeliveryPayload } from "../data/types/delivery.type";

const pricingService = new PricingService();

class OrderDeliveryService {
  private notificationService = new NotificationService();

  async updateDelivery(
    orderId: Types.ObjectId,
    delivery: IDeliveryPayload,
    performerId: string,
    currentOrder: OrderDetailsDTO,
  ): Promise<OrderDetailsDTO> {
    if (!orderId) {
      throw new Error("Id was not provided");
    }
    const manager = await managersService.getManager(performerId);
    const prices = await pricingService.calculateOrderTotals({
      products: currentOrder.products,
      delivery: delivery,
    });
    if (!prices.deliverySnapshot) {
      throw new Error("Failed to build delivery snapshot");
    }
    const nextDeliveryStatus =
      delivery.condition === DELIVERY.PICK_UP
        ? DELIVERY_STATUSES.PICKUP_SCHEDULED
        : DELIVERY_STATUSES.DELIVERY_SCHEDULED;

    const newDelivery: IDelivery = {
      ...prices.deliverySnapshot,
      status: nextDeliveryStatus,
    };

    const action =
      currentOrder.delivery.status === DELIVERY_STATUSES.DRAFT
        ? delivery.condition === DELIVERY.PICK_UP
          ? ORDER_HISTORY_ACTIONS.PICKUP_SCHEDULED
          : ORDER_HISTORY_ACTIONS.DELIVERY_SCHEDULED
        : delivery.condition === DELIVERY.PICK_UP
          ? ORDER_HISTORY_ACTIONS.PICKUP_EDITED
          : ORDER_HISTORY_ACTIONS.DELIVERY_EDITED;

    const newOrder: OrderDetailsDTO = {
      ...currentOrder,
      delivery: newDelivery,
      total_price: prices.totalPrice,
    };
    // TODO(types): widen createHistoryEntry input contract to accept current order aggregate type.
    newOrder.history.unshift(
      createHistoryEntry(newOrder as unknown as Parameters<typeof createHistoryEntry>[0], action, manager),
    );
    const updatedOrder = await Order.findByIdAndUpdate(newOrder._id, newOrder, { new: true });
    if (!updatedOrder) {
      throw new Error("Order not found");
    }
    if (updatedOrder.assignedManager) {
      await this.notificationService.create({
        managerId: updatedOrder.assignedManager._id.toString(),
        orderId: updatedOrder._id.toString(),
        type: "deliveryUpdated",
        message: NOTIFICATIONS.deliveryUpdated,
      });
    }
    return OrderService.getOrder(updatedOrder._id);
  }
}

export default new OrderDeliveryService();
