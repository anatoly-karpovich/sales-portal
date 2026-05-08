import { Types } from "mongoose";
import { DELIVERY, DELIVERY_STATUSES } from "../data/enums";
import { IDelivery, IProductInOrder, IProductInOrderResponse } from "../data/types";
import {
  IDeliveryPayload,
  IDeliverySnapshotCore,
  IDeliveryUpdatePayload,
  IPickupUpdatePayload,
} from "../data/types/delivery.type";
import { DELIVERY_PRICING_TIER, DELIVERY_PRICING_ZONE, ISettings } from "../data/types/settings.type";
import type { IPickupLocation } from "../data/types/settings.type";
import { US_STATE_CODES } from "../data/usStates";
import productsService from "./products.service";
import { SettingsService } from "./settings.service";

type PricingProductInput = {
  productId: Types.ObjectId | string;
  variantId: Types.ObjectId | string;
  quantity: number;
};
type PricingProducts = PricingProductInput[] | IProductInOrder[] | IProductInOrderResponse[];
type DeliveryCalculationInput = IDelivery | IDeliveryPayload;
type DateOnly = string;

type DeliveryPricingResponse = {
  price: number;
  pricingTier: DELIVERY_PRICING_TIER;
  lineCount: number;
  breakdown: {
    basePerLine: number;
    expressExtraPerLine: number;
  };
  schedule: IDeliverySnapshotCore["schedule"];
};

type PickupLocationMatch = {
  state: (typeof US_STATE_CODES)[number];
  location: IPickupLocation;
};

function createHttpError(message: string, statusCode: number): Error & { statusCode: number } {
  const error = new Error(message) as Error & { statusCode: number };
  error.statusCode = statusCode;
  return error;
}

export class PricingService {
  private settingsService = new SettingsService();

  async calculate(params: {
    products: PricingProducts;
    delivery?: IDeliveryUpdatePayload;
    pickup?: IPickupUpdatePayload;
  }) {
    const { products, delivery, pickup } = params;
    if (delivery && pickup) {
      throw createHttpError("Incorrect delivery payload", 400);
    }

    const linesCount = products.length;
    let unitsCount = 0;
    for (const item of products) {
      unitsCount += item.quantity;
    }

    const subtotal = await this.calculateProductsPrice(products);
    const deliveryPayload = await this.resolvePricingDeliveryPayload({ delivery, pickup });

    if (!deliveryPayload) {
      return {
        totalPrice: subtotal,
        products: {
          subtotal,
          linesCount,
          unitsCount,
        },
        delivery: {
          price: 0,
          pricingTier: null,
          lineCount: linesCount,
          schedule: null,
          breakdown: {
            basePerLine: 0,
            expressExtraPerLine: 0,
          },
        },
      };
    }

    const deliveryResult = await this.calculateDeliveryPricing(deliveryPayload, linesCount);
    return {
      totalPrice: subtotal + deliveryResult.price,
      products: {
        subtotal,
        linesCount,
        unitsCount,
      },
      delivery: deliveryResult,
    };
  }

  async calculateOrderTotals(params: { products: PricingProducts; delivery?: DeliveryCalculationInput | null }) {
    const { products, delivery } = params;
    const subtotal = await this.calculateProductsPrice(products);

    if (!delivery) {
      return {
        totalPrice: subtotal,
        productsSubtotal: subtotal,
        deliveryPrice: 0,
        deliverySnapshot: null,
      };
    }

    const deliveryPricing = await this.calculateDeliveryPricing(delivery, products.length);
    return {
      totalPrice: subtotal + deliveryPricing.price,
      productsSubtotal: subtotal,
      deliveryPrice: deliveryPricing.price,
      deliverySnapshot: this.buildDeliverySnapshot(delivery, deliveryPricing),
    };
  }

  async finalizeSchedule(delivery: IDelivery): Promise<IDelivery> {
    const settings = await this.settingsService.get();
    const cutoffHour = settings.shipping?.processing?.cutoffHour;
    if (typeof cutoffHour !== "number" || cutoffHour < 0 || cutoffHour > 23) {
      throw createHttpError("Shipping processing cutoff hour is not configured", 500);
    }

    const startsAt = this.getStartDateByCutoff(cutoffHour);

    if (delivery.condition === DELIVERY.DELIVERY) {
      const schedule = delivery.schedule;
      if (!("estimatedDays" in schedule)) {
        throw createHttpError("Delivery schedule does not contain estimatedDays", 400);
      }

      const dueDate = this.addDays(startsAt, schedule.estimatedDays);
      return {
        ...delivery,
        schedule: {
          express: schedule.express,
          estimatedDays: schedule.estimatedDays,
          estimatedDate: dueDate,
          startsAt,
          dueDate,
        },
      };
    }

    const schedule = delivery.schedule;
    if (!("readyInDays" in schedule) || !("holdForDays" in schedule)) {
      throw createHttpError("Pickup schedule does not contain ready/hold days", 400);
    }

    const availableFromDate = this.addDays(startsAt, schedule.readyInDays);
    const pickupByDate = this.addDays(availableFromDate, schedule.holdForDays);
    return {
      ...delivery,
      schedule: {
        readyInDays: schedule.readyInDays,
        holdForDays: schedule.holdForDays,
        availableFromDate,
        pickupByDate,
        startsAt,
      },
    };
  }

  async calculateProductsPrice(products: PricingProducts) {
    if (this.isProductsInOrder(products)) {
      const orderProducts = products as Array<Pick<IProductInOrder, "unitPrice" | "quantity">>;
      return orderProducts.reduce((sum, item) => {
        return sum + item.unitPrice * item.quantity;
      }, 0);
    }

    const requestProducts = products as PricingProductInput[];
    const ids = requestProducts.map((p) => p.productId);
    const productsDb = await productsService.getProductsBulk(ids);
    const productMap = new Map(productsDb.map((p) => [p._id.toString(), p]));

    return requestProducts.reduce((sum, item) => {
      const product = productMap.get(item.productId.toString());

      if (!product) {
        throw new Error(`[Pricing Service] Product with id ${item.productId} was not found`);
      }

      const variant = (product.variants ?? []).find(
        (productVariant) => productVariant?._id?.toString() === item.variantId.toString(),
      );

      if (!variant) {
        throw new Error(
          `[Pricing Service] Variant with id ${item.variantId} was not found in product ${item.productId}`,
        );
      }

      return sum + variant.price * item.quantity;
    }, 0);
  }

  recalculateDeliveryPriceByLines(params: { currentDelivery: IDelivery; currentLinesCount: number; nextLinesCount: number }) {
    const { currentDelivery, currentLinesCount, nextLinesCount } = params;
    if (currentDelivery.condition === DELIVERY.PICK_UP || currentLinesCount < 1) {
      return 0;
    }

    const perLinePrice = currentDelivery.price / currentLinesCount;
    return perLinePrice * nextLinesCount;
  }

  private async resolvePricingDeliveryPayload(params: {
    delivery?: IDeliveryUpdatePayload;
    pickup?: IPickupUpdatePayload;
  }): Promise<IDeliveryPayload | null> {
    const { delivery, pickup } = params;

    if (delivery) {
      return {
        condition: DELIVERY.DELIVERY,
        express: delivery.express,
        address: delivery.address,
      };
    }

    if (!pickup) {
      return null;
    }

    const pickupLocationId = pickup.pickupLocationId.trim();
    const pickupLocation = await this.findPickupLocationById(pickupLocationId);
    if (!pickupLocation) {
      throw createHttpError(`Pickup location with id '${pickupLocationId}' wasn't found`, 404);
    }
    if (!pickupLocation.location.isActive) {
      throw createHttpError(`Pickup location with id '${pickupLocationId}' is inactive`, 404);
    }

    return {
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
  }

  private async calculateDeliveryPricing(
    delivery: DeliveryCalculationInput,
    orderLinesCount: number,
  ): Promise<DeliveryPricingResponse> {
    const settings = await this.settingsService.get();

    if (delivery.condition === DELIVERY.PICK_UP) {
      const readyInDays = settings.shipping?.pickup?.policy?.readyInDays ?? 0;
      const holdForDays = settings.shipping?.pickup?.policy?.holdForDays ?? 0;
      const previewStartsAt = this.getCurrentDateOnly();
      const estimatedAvailableFromDate = this.addDays(previewStartsAt, readyInDays);
      const estimatedPickupByDate = this.addDays(estimatedAvailableFromDate, holdForDays);
      return {
        price: 0,
        pricingTier: DELIVERY_PRICING_TIER.PICKUP,
        lineCount: orderLinesCount,
        schedule: {
          readyInDays,
          holdForDays,
          availableFromDate: estimatedAvailableFromDate,
          pickupByDate: estimatedPickupByDate,
          startsAt: null,
        },
        breakdown: {
          basePerLine: 0,
          expressExtraPerLine: 0,
        },
      };
    }

    const locationZone = this.getDeliveryPricingZone(delivery, settings);
    const locationPricing = settings.shipping.delivery.pricing[locationZone];
    const isExpress = this.getExpressFlag(delivery);
    const expressExtraPerLine = isExpress ? locationPricing.express.extraPrice : 0;
    const basePerLine = locationPricing.basePrice;
    const price = (basePerLine + expressExtraPerLine) * orderLinesCount;
    const estimatedDays = isExpress ? locationPricing.express.days : locationPricing.minDays;
    const estimatedDate = this.addDays(this.getCurrentDateOnly(), estimatedDays);

    return {
      price,
      pricingTier: this.mapZoneToTier(locationZone),
      lineCount: orderLinesCount,
      schedule: {
        express: isExpress,
        estimatedDays,
        estimatedDate,
        startsAt: null,
        dueDate: null,
      },
      breakdown: {
        basePerLine,
        expressExtraPerLine,
      },
    };
  }

  private isProductsInOrder(products: PricingProducts): products is IProductInOrder[] | IProductInOrderResponse[] {
    for (const p of products) {
      if (!("unitPrice" in p)) return false;
    }
    return true;
  }

  private getDeliveryPricingZone(delivery: DeliveryCalculationInput, settings: ISettings): DELIVERY_PRICING_ZONE {
    if (this.isSameCity({ delivery, settings })) {
      return DELIVERY_PRICING_ZONE.LOCAL_CITY;
    } else if (this.isSameState({ delivery, settings })) {
      return DELIVERY_PRICING_ZONE.SAME_STATE;
    } else {
      return DELIVERY_PRICING_ZONE.OUT_OF_STATE;
    }
  }

  private isSameCity({ delivery, settings }: { delivery: DeliveryCalculationInput; settings: ISettings }): boolean {
    const deliveryCity = this.normalizeValue(delivery.address.city);
    const deliveryState = this.normalizeState(delivery.address.state);
    const locations = settings.shipping.pickup.locations[deliveryState]?.filter((location) => location.isActive);
    if (!locations) return false;

    return locations.some((location) => this.normalizeValue(location.city) === deliveryCity);
  }

  private isSameState({ delivery, settings }: { delivery: DeliveryCalculationInput; settings: ISettings }): boolean {
    const deliveryState = this.normalizeState(delivery.address.state);
    const locations = settings.shipping.pickup.locations[deliveryState];
    if (!locations) {
      return false;
    }
    return locations.some((location) => location.isActive);
  }

  private mapZoneToTier(zone: DELIVERY_PRICING_ZONE): DELIVERY_PRICING_TIER {
    switch (zone) {
      case DELIVERY_PRICING_ZONE.LOCAL_CITY:
        return DELIVERY_PRICING_TIER.LOCAL_CITY;
      case DELIVERY_PRICING_ZONE.SAME_STATE:
        return DELIVERY_PRICING_TIER.SAME_STATE;
      default:
        return DELIVERY_PRICING_TIER.OUT_OF_STATE;
    }
  }

  private normalizeValue(value: string) {
    return value.trim().toLowerCase().replace(/\s+/g, " ");
  }

  private normalizeState(value: string) {
    return value.trim().toUpperCase();
  }

  private getExpressFlag(delivery: DeliveryCalculationInput): boolean {
    if ("schedule" in delivery) {
      return "express" in delivery.schedule ? delivery.schedule.express : false;
    }
    return delivery.express === true;
  }

  private buildDeliverySnapshot(delivery: DeliveryCalculationInput, pricing: DeliveryPricingResponse): IDeliverySnapshotCore {
    if (delivery.condition === DELIVERY.PICK_UP) {
      const schedule = pricing.schedule as {
        readyInDays: number;
        holdForDays: number;
        availableFromDate: string;
        pickupByDate: string;
        startsAt: string | null;
      };
      return {
        condition: delivery.condition,
        address: delivery.address,
        price: pricing.price,
        pricingTier: pricing.pricingTier,
        schedule: {
          readyInDays: schedule.readyInDays,
          holdForDays: schedule.holdForDays,
          availableFromDate: schedule.availableFromDate,
          pickupByDate: schedule.pickupByDate,
          startsAt: schedule.startsAt,
        },
      };
    }

    const schedule = pricing.schedule as {
      express: boolean;
      estimatedDays: number;
      estimatedDate: string;
      startsAt: string | null;
      dueDate: string | null;
    };
    return {
      condition: delivery.condition,
      address: delivery.address,
      price: pricing.price,
      pricingTier: pricing.pricingTier,
      schedule: {
        express: schedule.express,
        estimatedDays: schedule.estimatedDays,
        estimatedDate: schedule.estimatedDate,
        startsAt: schedule.startsAt,
        dueDate: schedule.dueDate,
      },
    };
  }

  private async findPickupLocationById(pickupLocationId: string): Promise<PickupLocationMatch | null> {
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

  private getStartDateByCutoff(cutoffHour: number): DateOnly {
    const now = new Date();
    const today = this.getCurrentDateOnly();
    if (now.getHours() >= cutoffHour) {
      return this.addDays(today, 1);
    }
    return today;
  }

  private getCurrentDateOnly(): DateOnly {
    return this.formatDateOnly(new Date());
  }

  private addDays(dateOnly: DateOnly, days: number): DateOnly {
    const date = this.parseDateOnly(dateOnly);
    date.setDate(date.getDate() + days);
    return this.formatDateOnly(date);
  }

  private parseDateOnly(dateOnly: DateOnly): Date {
    const [year, month, day] = dateOnly.split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  private formatDateOnly(date: Date): DateOnly {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  isOrderOverdue(order: Pick<IDelivery, "status" | "schedule"> & { orderStatus: string }) {
    if (order.orderStatus !== "In Process") {
      return { isOverdue: false, overdueByDays: 0 };
    }

    if (order.status === DELIVERY_STATUSES.DRAFT || order.status === DELIVERY_STATUSES.DELIVERED) {
      return { isOverdue: false, overdueByDays: 0 };
    }

    let dueDate: string | null = null;
    if ("dueDate" in order.schedule) {
      dueDate = order.schedule.dueDate;
    } else if ("pickupByDate" in order.schedule) {
      dueDate = order.schedule.pickupByDate;
    }

    if (!dueDate) {
      return { isOverdue: false, overdueByDays: 0 };
    }

    const today = this.getCurrentDateOnly();
    if (today <= dueDate) {
      return { isOverdue: false, overdueByDays: 0 };
    }

    const overdueByDays = this.daysBetween(dueDate, today);
    return { isOverdue: true, overdueByDays };
  }

  private daysBetween(fromDate: DateOnly, toDate: DateOnly): number {
    const from = this.parseDateOnly(fromDate);
    const to = this.parseDateOnly(toDate);
    const msPerDay = 24 * 60 * 60 * 1000;
    return Math.max(0, Math.floor((to.getTime() - from.getTime()) / msPerDay));
  }
}
