import Order from "../models/order.model";
import OrderService from "./order.service";
import { buildVariantDisplayName, createHistoryEntry } from "../utils/utils";
import mongoose, { Types } from "mongoose";
import {
  DELIVERY,
  DELIVERY_STATUSES,
  NOTIFICATIONS,
  ORDER_HISTORY_ACTIONS,
  ORDER_STATUSES,
  PRODUCT_STATUSES,
  RESERVATION_TYPES,
} from "../data/enums";
import managersService from "./managers.service";
import { NotificationService } from "./notification.service";
import { OrderDetailsDTO } from "../data/types/dto/orders.dto";
import { PricingService } from "./pricing.service";
import InventoryService from "./inventory.service";
import Product from "../models/product.model";
import { IOrderProductRequestItem, IProductInOrder } from "../data/types";
import { SettingsService } from "./settings.service";

class OrderStatusService {
  private notificationService = new NotificationService();
  private pricingService = new PricingService();
  private settingsService = new SettingsService();

  private createHttpError(message: string, statusCode: number): Error & { statusCode: number } {
    const error = new Error(message) as Error & { statusCode: number };
    error.statusCode = statusCode;
    return error;
  }

  private async getDraftReservationExpiryDate(): Promise<Date> {
    const settings = await this.settingsService.get();
    const ttlMs = settings?.reservations?.adminDraftReservationTtlMs ?? 24 * 60 * 60 * 1000;
    return new Date(Date.now() + ttlMs);
  }

  private normalizeAttributes(value: unknown): Record<string, string> {
    if (value instanceof Map) {
      return Object.fromEntries(value.entries());
    }
    if (value && typeof value === "object") {
      return value as Record<string, string>;
    }
    return {};
  }

  private async rebuildProductsForReopen(currentOrder: OrderDetailsDTO): Promise<IProductInOrder[]> {
    const requestedProducts: IOrderProductRequestItem[] = currentOrder.products.map((item) => ({
      productId: new Types.ObjectId(item.productId),
      variantId: new Types.ObjectId(item.variantId),
      quantity: item.quantity,
    }));

    const uniqueProductIds = [...new Set(requestedProducts.map((item) => item.productId.toString()))].map(
      (productId) => new Types.ObjectId(productId),
    );
    const existingProducts = await Product.find({ _id: { $in: uniqueProductIds } })
      .select("_id name manufacturer status imageUrl attributes variants._id variants.status variants.price variants.attributes variants.imageUrl")
      .lean();
    const productById = new Map(existingProducts.map((product) => [product._id.toString(), product]));

    return requestedProducts.map((requestedProduct) => {
      const product = productById.get(requestedProduct.productId.toString());
      if (!product) {
        throw this.createHttpError(`Product with id '${requestedProduct.productId.toString()}' wasn't found`, 404);
      }

      if (product.status !== PRODUCT_STATUSES.ACTIVE) {
        throw this.createHttpError(`Product with id '${requestedProduct.productId.toString()}' is not active`, 400);
      }

      const variant = (product.variants ?? []).find(
        (productVariant) => productVariant?._id?.toString() === requestedProduct.variantId.toString(),
      );
      if (!variant) {
        throw this.createHttpError(
          `Variant with id '${requestedProduct.variantId.toString()}' wasn't found in product '${requestedProduct.productId.toString()}'`,
          404,
        );
      }

      if (variant.status !== PRODUCT_STATUSES.ACTIVE) {
        throw this.createHttpError(`Variant with id '${requestedProduct.variantId.toString()}' is not active`, 400);
      }

      const normalizedVariantAttributes = this.normalizeAttributes(variant.attributes);
      const productAttributes = Array.isArray((product as any).attributes) ? (product as any).attributes : [];

      return {
        productId: new Types.ObjectId(requestedProduct.productId),
        variantId: new Types.ObjectId(requestedProduct.variantId),
        manufacturer: product.manufacturer,
        unitPrice: variant.price,
        quantity: requestedProduct.quantity,
        name: product.name,
        displayName: buildVariantDisplayName({ name: product.name, attributes: productAttributes }, { attributes: normalizedVariantAttributes }),
        attributes: normalizedVariantAttributes,
        received: false,
        ...(variant.imageUrl ?? product.imageUrl ? { imageUrl: variant.imageUrl ?? product.imageUrl } : {}),
      };
    });
  }

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
    const historyActions: ORDER_HISTORY_ACTIONS[] = [];
    let wasAutoAssigned = false;
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
      if (!currentOrder.assignedManager) {
        if (!manager) {
          throw new Error("Performer manager was not found");
        }
        newOrder.assignedManager = manager;
        wasAutoAssigned = true;
        historyActions.push(ORDER_HISTORY_ACTIONS.MANAGER_ASSIGNED);
      }
      historyActions.push(ORDER_HISTORY_ACTIONS.PROCESSED);
    } else if (status === ORDER_STATUSES.CANCELED) {
      historyActions.push(ORDER_HISTORY_ACTIONS.CANCELED);
    } else if (status === ORDER_STATUSES.DRAFT) {
      historyActions.push(ORDER_HISTORY_ACTIONS.REOPENED);
      const refreshedProducts = await this.rebuildProductsForReopen(currentOrder);
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
        products: refreshedProducts,
        delivery: defaultDraftDeliveryPayload,
      });
      if (!pricesWithDraftDelivery.deliverySnapshot) {
        throw new Error("Failed to build default delivery snapshot");
      }
      newOrder.products = refreshedProducts;
      newOrder.delivery = {
        ...pricesWithDraftDelivery.deliverySnapshot,
        status: DELIVERY_STATUSES.DRAFT,
      };
      newOrder.total_price = pricesWithDraftDelivery.totalPrice;
    }

    for (let index = historyActions.length - 1; index >= 0; index -= 1) {
      newOrder.history.unshift(
        createHistoryEntry(newOrder, historyActions[index], manager),
      );
    }
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        if (status === ORDER_STATUSES.IN_PROCESS) {
          await InventoryService.markReservationAsOrderProcessing(orderId, session);
        } else if (status === ORDER_STATUSES.CANCELED) {
          await InventoryService.releaseReservationByOrder({
            orderId,
            managerId: performerId,
            session,
          });
        } else if (status === ORDER_STATUSES.DRAFT) {
          await InventoryService.releaseReservationByOrder({
            orderId,
            managerId: performerId,
            session,
          });
          await InventoryService.reserveItems({
            orderId,
            items: newOrder.products.map((item) => ({
              productId: new Types.ObjectId(item.productId),
              variantId: new Types.ObjectId(item.variantId),
              quantity: item.quantity,
            })),
            reservationType: RESERVATION_TYPES.ADMIN_DRAFT,
            managerId: performerId,
            expiresAt: await this.getDraftReservationExpiryDate(),
            session,
          });
        }

        const { inventoryReservation: _inventoryReservation, ...persistedOrder } = newOrder;
        const updatedOrder = await Order.findByIdAndUpdate(newOrder._id, persistedOrder, { new: true, session });
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
      if (wasAutoAssigned) {
        await this.notificationService.create({
          managerId: updatedOrder.assignedManager._id.toString(),
          orderId: updatedOrder._id.toString(),
          type: "assigned",
          message: NOTIFICATIONS.assignedAutomatically(updatedOrder._id.toString()),
        });
      }
      await this.notificationService.create({
        managerId: updatedOrder.assignedManager._id.toString(),
        orderId: updatedOrder._id.toString(),
        type: "statusChanged",
        message: NOTIFICATIONS.statusChanged({
          status: updatedOrder.status,
          orderId: updatedOrder._id.toString(),
          reason: updatedOrder.status === ORDER_STATUSES.CANCELED ? "manualCancel" : undefined,
        }),
      });
    }
    return OrderService.getOrder(updatedOrder._id);
  }
}

export default new OrderStatusService();
