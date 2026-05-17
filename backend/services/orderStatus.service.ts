import Order from "../models/order.model";
import OrderService from "./order.service";
import { createHistoryEntry } from "../utils/utils";
import mongoose, { Types } from "mongoose";
import { DELIVERY, DELIVERY_STATUSES, NOTIFICATIONS, ORDER_HISTORY_ACTIONS, ORDER_STATUSES } from "../data/enums";
import managersService from "./managers.service";
import { NotificationService } from "./notification.service";
import { OrderDetailsDTO } from "../data/types/dto/orders.dto";
import { PricingService } from "./pricing.service";
import InventoryService from "./inventory.service";

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
      if (currentOrder.status === ORDER_STATUSES.IN_PROCESS) {
        const error = new Error("Order is already in process") as Error & { statusCode: number };
        error.statusCode = 400;
        throw error;
      }

      newOrder.delivery = await this.pricingService.finalizeSchedule(currentOrder.delivery);
      newOrder.delivery = {
        ...newOrder.delivery,
        status:
          newOrder.delivery.condition === DELIVERY.PICK_UP
            ? DELIVERY_STATUSES.PICKUP_SCHEDULED
            : DELIVERY_STATUSES.DELIVERY_SCHEDULED,
      };
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
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        if (status === ORDER_STATUSES.IN_PROCESS) {
          await InventoryService.completeReservationByOrder(orderId, session, performerId);
        } else if (status === ORDER_STATUSES.CANCELED) {
          await InventoryService.releaseReservationByOrder({
            orderId,
            managerId: performerId,
            session,
          });
        }

        const updatedOrder = await Order.findByIdAndUpdate(newOrder._id, newOrder, { new: true, session });
        if (!updatedOrder) {
          throw new Error("Order not found");
        }
      });
    } finally {
      await session.endSession();
    }

    const updatedOrder = await Order.findById(orderId).lean().exec();
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
