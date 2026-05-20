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
import { IDeliveryPayload, IDeliveryUpdatePayload, IPickupUpdatePayload } from "../data/types/delivery.type";
import { SettingsService } from "./settings.service";
import type { IPickupLocation } from "../data/types/settings.type";
import { US_STATE_CODES } from "../data/usStates";

const pricingService = new PricingService();

function createHttpError(message: string, statusCode: number): Error & { statusCode: number } {
  const error = new Error(message) as Error & { statusCode: number };
  error.statusCode = statusCode;
  return error;
}

class OrderDeliveryService {
  private notificationService = new NotificationService();
  private settingsService = new SettingsService();

  async updateDelivery(
    orderId: Types.ObjectId,
    delivery: IDeliveryUpdatePayload,
    performerId: string,
    currentOrder: OrderDetailsDTO,
  ): Promise<OrderDetailsDTO> {
    const deliveryPayload: IDeliveryPayload = {
      condition: DELIVERY.DELIVERY,
      express: delivery.express,
      address: delivery.address,
    };

    return this.applyDeliveryUpdate({
      orderId,
      deliveryPayload,
      performerId,
      currentOrder,
    });
  }

  async updatePickup(
    orderId: Types.ObjectId,
    pickup: IPickupUpdatePayload,
    performerId: string,
    currentOrder: OrderDetailsDTO,
  ): Promise<OrderDetailsDTO> {
    const pickupLocationId = pickup.pickupLocationId.trim();
    const pickupLocation = await this.findPickupLocationById(pickupLocationId);
    if (!pickupLocation) {
      throw createHttpError(`Pickup location with id '${pickupLocationId}' wasn't found`, 404);
    }
    if (!pickupLocation.location.isActive) {
      throw createHttpError(`Pickup location with id '${pickupLocationId}' is inactive`, 404);
    }

    const deliveryPayload: IDeliveryPayload = {
      condition: DELIVERY.PICK_UP,
      address: {
        state: pickupLocation.state,
        city: pickupLocation.location.city,
        street: pickupLocation.location.address.street,
        house: pickupLocation.location.address.house,
        apartment: pickupLocation.location.address.apartment,
        zipCode: pickupLocation.location.address.zipCode,
      },
    };

    return this.applyDeliveryUpdate({
      orderId,
      deliveryPayload,
      performerId,
      currentOrder,
    });
  }

  private async applyDeliveryUpdate(params: {
    orderId: Types.ObjectId;
    deliveryPayload: IDeliveryPayload;
    performerId: string;
    currentOrder: OrderDetailsDTO;
  }): Promise<OrderDetailsDTO> {
    const { orderId, deliveryPayload, performerId, currentOrder } = params;
    if (!orderId) {
      throw new Error("Id was not provided");
    }

    const manager = await managersService.getManager(performerId);
    const prices = await pricingService.calculateOrderTotals({
      products: currentOrder.products,
      delivery: deliveryPayload,
    });
    if (!prices.deliverySnapshot) {
      throw new Error("Failed to build delivery snapshot");
    }

    const nextDeliveryStatus =
      deliveryPayload.condition === DELIVERY.PICK_UP
        ? DELIVERY_STATUSES.PICKUP_PLANNED
        : DELIVERY_STATUSES.DELIVERY_PLANNED;

    const newDelivery: IDelivery = {
      ...prices.deliverySnapshot,
      status: nextDeliveryStatus,
    };

    const action =
      currentOrder.delivery.status === DELIVERY_STATUSES.DRAFT
        ? deliveryPayload.condition === DELIVERY.PICK_UP
          ? ORDER_HISTORY_ACTIONS.PICKUP_PLANNED
          : ORDER_HISTORY_ACTIONS.DELIVERY_PLANNED
        : deliveryPayload.condition === DELIVERY.PICK_UP
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

    const { inventoryReservation: _inventoryReservation, ...persistedOrder } = newOrder;
    const updatedOrder = await Order.findByIdAndUpdate(newOrder._id, persistedOrder, { new: true });
    if (!updatedOrder) {
      throw new Error("Order not found");
    }

    if (updatedOrder.assignedManager) {
      await this.notificationService.create({
        managerId: updatedOrder.assignedManager._id.toString(),
        orderId: updatedOrder._id.toString(),
        type: "deliveryUpdated",
        message: NOTIFICATIONS.deliveryUpdated(updatedOrder._id.toString()),
      });
    }

    return OrderService.getOrder(updatedOrder._id);
  }

  private async findPickupLocationById(
    pickupLocationId: string,
  ): Promise<{ state: (typeof US_STATE_CODES)[number]; location: IPickupLocation } | null> {
    const settings = await this.settingsService.get();
    const locationsByState = settings?.shipping?.pickup?.locations;
    if (!locationsByState) {
      return null;
    }

    for (const state of US_STATE_CODES) {
      const locations = locationsByState[state];
      if (!locations) {
        continue;
      }

      const found = locations.find((location) => location.id === pickupLocationId);
      if (found) {
        return { state, location: found };
      }
    }

    return null;
  }
}

export default new OrderDeliveryService();
