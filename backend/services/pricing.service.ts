import { Types } from "mongoose";
import { DELIVERY } from "../data/enums";
import { IDelivery, IOrderProductRequestItem, IProductInOrder, IProductInOrderResponse } from "../data/types";
import { IDeliveryPayload, IDeliverySnapshotCore } from "../data/types/delivery.type";
import { DELIVERY_PRICING_TIER, DELIVERY_PRICING_ZONE, ISettings } from "../data/types/settings.type";
import productsService from "./products.service";
import { SettingsService } from "./settings.service";

type PricingProductInput = Pick<IOrderProductRequestItem, "quantity"> & { id: Types.ObjectId | string };
type PricingProducts = PricingProductInput[] | IProductInOrder[] | IProductInOrderResponse[];
type Delivery = IDelivery | IDeliveryPayload;

type DeliveryPricingResponse = {
  price: number;
  pricingTier: DELIVERY_PRICING_TIER;
  isExpress: boolean;
  lineCount: number;
  estimatedDays: number;
  estimatedDate: string;
  availableFromDate: string | null;
  pickupByDate: string | null;
  breakdown: {
    basePerLine: number;
    expressExtraPerLine: number;
  };
};

export class PricingService {
  private settingsService = new SettingsService();

  async calculate(params: { products: PricingProducts; delivery?: Delivery }) {
    const { products, delivery } = params;
    const linesCount = products.length;
    let unitsCount = 0;
    for (const item of products) {
      unitsCount += item.quantity;
    }
    const subtotal = await this.calculateProductsPrice(products);

    if (!delivery) {
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
          isExpress: false,
          lineCount: linesCount,
          estimatedDays: null,
          estimatedDate: null,
          availableFromDate: null,
          pickupByDate: null,
          breakdown: {
            basePerLine: 0,
            expressExtraPerLine: 0,
          },
        },
      };
    }

    const deliveryResult = await this.calculateDeliveryPricing(delivery, linesCount);
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

  async calculateOrderTotals(params: { products: PricingProducts; delivery?: Delivery | null }) {
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

  async calculateProductsPrice(products: PricingProducts) {
    if (this.isProductsInOrder(products)) {
      const orderProducts = products as Array<Pick<IProductInOrder, "unitPrice" | "quantity">>;
      return orderProducts.reduce((sum, item) => {
        return sum + item.unitPrice * item.quantity;
      }, 0);
    }

    const requestProducts = products as PricingProductInput[];
    const ids = requestProducts.map((p) => p.id);
    const productsDb = await productsService.getProductsBulk(ids);
    const productMap = new Map(productsDb.map((p) => [p._id.toString(), p]));

    return requestProducts.reduce((sum, item) => {
      const product = productMap.get(item.id.toString());

      if (!product) {
        throw new Error(`[Pricing Service] Product with id ${item.id} was not found`);
      }

      return sum + product.price * item.quantity;
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

  private async calculateDeliveryPricing(delivery: Delivery, orderLinesCount: number): Promise<DeliveryPricingResponse> {
    const settings = await this.settingsService.get();

    if (delivery.condition === DELIVERY.PICK_UP) {
      const readyInDays = settings.shipping?.pickup?.policy?.readyInDays ?? 0;
      const holdForDays = settings.shipping?.pickup?.policy?.holdForDays ?? 0;
      const availableFromDate = this.getEstimatedDate(readyInDays);
      const pickupByDate = this.getEstimatedDate(readyInDays + holdForDays);
      return {
        price: 0,
        pricingTier: DELIVERY_PRICING_TIER.PICKUP,
        isExpress: false,
        lineCount: orderLinesCount,
        estimatedDays: readyInDays,
        estimatedDate: availableFromDate,
        availableFromDate,
        pickupByDate,
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

    return {
      price,
      pricingTier: this.mapZoneToTier(locationZone),
      isExpress,
      lineCount: orderLinesCount,
      estimatedDays,
      estimatedDate: this.getEstimatedDate(estimatedDays),
      availableFromDate: null,
      pickupByDate: null,
      breakdown: {
        basePerLine,
        expressExtraPerLine,
      },
    };
  }

  private isProductsInOrder(products: PricingProducts): products is IProductInOrder[] | IProductInOrderResponse[] {
    for (const p of products) {
      if (!("product" in p) || !("unitPrice" in p)) return false;
    }
    return true;
  }

  private getDeliveryPricingZone(delivery: Delivery, settings: ISettings): DELIVERY_PRICING_ZONE {
    if (this.isSameCity({ delivery, settings })) {
      return DELIVERY_PRICING_ZONE.LOCAL_CITY;
    } else if (this.isSameState({ delivery, settings })) {
      return DELIVERY_PRICING_ZONE.SAME_STATE;
    } else {
      return DELIVERY_PRICING_ZONE.OUT_OF_STATE;
    }
  }

  private isSameCity({ delivery, settings }: { delivery: Delivery; settings: ISettings }): boolean {
    const deliveryCity = this.normalizeValue(delivery.address.city);
    const deliveryState = this.normalizeState(delivery.address.state);
    const locations = settings.shipping.pickup.locations[deliveryState]?.filter((location) => location.isActive);
    if (!locations) return false;

    return locations.some((location) => this.normalizeValue(location.city) === deliveryCity);
  }

  private isSameState({ delivery, settings }: { delivery: Delivery; settings: ISettings }): boolean {
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

  private getEstimatedDate(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString();
  }

  private getExpressFlag(delivery: Delivery): boolean {
    if ("schedule" in delivery) {
      return "express" in delivery.schedule ? delivery.schedule.express : false;
    }
    return delivery.express === true;
  }

  private buildDeliverySnapshot(delivery: Delivery, pricing: DeliveryPricingResponse): IDeliverySnapshotCore {
    if (delivery.condition === DELIVERY.PICK_UP) {
      return {
        condition: delivery.condition,
        address: delivery.address,
        price: pricing.price,
        pricingTier: pricing.pricingTier,
        schedule: {
          availableFromDate: pricing.availableFromDate ?? pricing.estimatedDate,
          pickupByDate: pricing.pickupByDate ?? pricing.estimatedDate,
        },
      };
    }

    return {
      condition: delivery.condition,
      address: delivery.address,
      price: pricing.price,
      pricingTier: pricing.pricingTier,
      schedule: {
        express: pricing.isExpress,
        estimatedDate: pricing.estimatedDate,
      },
    };
  }
}
