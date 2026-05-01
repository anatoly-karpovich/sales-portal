import Order from "../models/order.model";
import OrderService from "./order.service";
import { createHistoryEntry } from "../utils/utils";
import { Types } from "mongoose";
import { DELIVERY, DELIVERY_STATUSES, NOTIFICATIONS, ORDER_HISTORY_ACTIONS, ORDER_STATUSES } from "../data/enums";
import managersService from "./managers.service";
import { NotificationService } from "./notification.service";
import { OrderDetailsDTO } from "../data/types/dto/orders.dto";
import { PricingService } from "./pricing.service";

class OrderStatusService {
  private notificationService = new NotificationService();
  private pricingService = new PricingService();
  async updateStatus(
    orderId: Types.ObjectId,
    status: ORDER_STATUSES,
    performerId: string,
    currentOrder: OrderDetailsDTO,
  ): Promise<OrderDetailsDTO> {
    if (!orderId) {
      throw new Error("Id was not provided");
    }
    const manager = await managersService.getManager(performerId);
    const newOrder: OrderDetailsDTO = {
      ...currentOrder,
      status: status as ORDER_STATUSES,
    };
    let action: ORDER_HISTORY_ACTIONS = ORDER_HISTORY_ACTIONS.PROCESSED;
    if (status === ORDER_STATUSES.IN_PROCESS) {
      action = ORDER_HISTORY_ACTIONS.PROCESSED;
    } else if (status === ORDER_STATUSES.CANCELED) {
      action = ORDER_HISTORY_ACTIONS.CANCELED;
    } else if (status === ORDER_STATUSES.DRAFT) {
      action = ORDER_HISTORY_ACTIONS.REOPENED;
      const defaultDraftDeliveryPayload = {
        condition: DELIVERY.DELIVERY,
        express: false,
        address: {
          state: currentOrder.customer.state,
          city: currentOrder.customer.city,
          street: currentOrder.customer.street,
          house: currentOrder.customer.house,
          apartment: currentOrder.customer.apartment,
          zipCode: currentOrder.customer.zipCode,
        },
      };
      const pricesWithDraftDelivery = await this.pricingService.calculateOrderTotals({
        products: currentOrder.products,
        delivery: defaultDraftDeliveryPayload,
      });
      if (!pricesWithDraftDelivery.deliverySnapshot) {
        throw new Error("Failed to build default delivery snapshot");
      }
      newOrder.delivery = {
        ...pricesWithDraftDelivery.deliverySnapshot,
        status: DELIVERY_STATUSES.DRAFT,
      };
      newOrder.total_price = pricesWithDraftDelivery.totalPrice;
    }

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
        type: "statusChanged",
        message: NOTIFICATIONS.statusChanged(updatedOrder.status),
      });
    }
    return OrderService.getOrder(updatedOrder._id);
  }
}

export default new OrderStatusService();
