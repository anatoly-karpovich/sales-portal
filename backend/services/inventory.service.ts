import mongoose, { ClientSession, Types } from "mongoose";
import {
  PRODUCT_STATUSES,
  INVENTORY_ADJUSTMENT_TYPES,
  INVENTORY_RECORD_STATUSES,
  INVENTORY_STATUSES,
  NOTIFICATIONS,
  ORDER_HISTORY_ACTIONS,
  ORDER_STATUSES,
  RESERVATION_TYPES,
  ROLES,
} from "../data/enums";
import type {
  IInventory,
  IInventoryAdjustment,
  IInventoryListItem,
  IInventoryReadModel,
  IInventoryVariant,
  IInventoryVariantReadModel,
  IProduct,
  IReservation,
} from "../data/types";
import { getTodaysDate, createHistoryEntry } from "../utils/utils";
import Inventory from "../models/inventory.model";
import InventoryAdjustment from "../models/inventoryAdjustment.model";
import Reservation from "../models/reservation.model";
import Product from "../models/product.model";
import Order from "../models/order.model";
import Manager from "../models/manager.model";
import { SettingsService } from "./settings.service";
import { NotificationService } from "./notification.service";

function createHttpError(message: string, statusCode: number): Error & { statusCode: number } {
  const error = new Error(message) as Error & { statusCode: number };
  error.statusCode = statusCode;
  return error;
}

type ReserveItemsInput = Array<{ productId: Types.ObjectId; variantId: Types.ObjectId; quantity: number }>;
type AdjustmentQuery = {
  type?: INVENTORY_ADJUSTMENT_TYPES[];
  orderId?: string;
  reservationId?: string;
  createdBy?: string;
  fromDate?: string;
  toDate?: string;
  page: number;
  limit: number;
  sortOrder: "asc" | "desc";
};

type ReservationReleaseParams = {
  orderId: Types.ObjectId;
  managerId: string;
  session: ClientSession;
  type?: INVENTORY_ADJUSTMENT_TYPES.RELEASE | INVENTORY_ADJUSTMENT_TYPES.EXPIRED_RESERVATION;
};

class InventoryService {
  private settingsService = new SettingsService();
  private notificationService = new NotificationService();

  private getNowString() {
    return getTodaysDate(true);
  }

  private toInventoryRecordStatus(productVariantStatus: PRODUCT_STATUSES): INVENTORY_RECORD_STATUSES {
    return productVariantStatus === PRODUCT_STATUSES.ARCHIVED
      ? INVENTORY_RECORD_STATUSES.ARCHIVED
      : INVENTORY_RECORD_STATUSES.ACTIVE;
  }

  private getReservationVariantKey(productId: Types.ObjectId | string, variantId: Types.ObjectId | string) {
    return `${productId.toString()}:${variantId.toString()}`;
  }

  private normalizeVariantQuantities(variant: Pick<IInventoryVariant, "quantity" | "reserved">) {
    const quantity = Math.max(0, variant.quantity ?? 0);
    const reserved = Math.max(0, variant.reserved ?? 0);
    const available = Math.max(quantity - reserved, 0);

    return { quantity, reserved, available };
  }

  private buildVariantUpdate(
    variant: IInventoryVariant & Record<string, any>,
    next: Partial<Pick<IInventoryVariant, "quantity" | "reserved" | "lowStockThreshold" | "allowSellingOutOfStock" | "status">>,
  ) {
    const normalized = this.normalizeVariantQuantities({
      quantity: next.quantity ?? variant.quantity,
      reserved: next.reserved ?? variant.reserved,
    });

    return {
      ...variant,
      quantity: normalized.quantity,
      reserved: normalized.reserved,
      available: normalized.available,
      lowStockThreshold: next.lowStockThreshold ?? variant.lowStockThreshold,
      allowSellingOutOfStock: next.allowSellingOutOfStock ?? variant.allowSellingOutOfStock,
      status: next.status ?? variant.status,
      updatedOn: this.getNowString(),
    };
  }

  recalculateVariantStatus(
    variant: Pick<IInventoryVariantReadModel, "status" | "available" | "lowStockThreshold">,
  ): INVENTORY_STATUSES {
    if (variant.status === INVENTORY_RECORD_STATUSES.ARCHIVED) {
      return INVENTORY_STATUSES.NOT_TRACKED;
    }
    if (variant.available <= 0) {
      return INVENTORY_STATUSES.OUT_OF_STOCK;
    }
    if (variant.available <= variant.lowStockThreshold) {
      return INVENTORY_STATUSES.LOW_STOCK;
    }
    return INVENTORY_STATUSES.IN_STOCK;
  }

  private recalculateInventoryStatus(
    variants: Array<Pick<IInventoryVariantReadModel, "status" | "stockStatus">>,
  ): INVENTORY_STATUSES {
    const tracked = variants.filter((variant) => variant.status === INVENTORY_RECORD_STATUSES.ACTIVE);
    if (tracked.length === 0) {
      return INVENTORY_STATUSES.NOT_TRACKED;
    }

    if (tracked.every((variant) => variant.stockStatus === INVENTORY_STATUSES.OUT_OF_STOCK)) {
      return INVENTORY_STATUSES.OUT_OF_STOCK;
    }

    if (
      tracked.some((variant) => variant.stockStatus === INVENTORY_STATUSES.OUT_OF_STOCK) ||
      tracked.some((variant) => variant.stockStatus === INVENTORY_STATUSES.LOW_STOCK)
    ) {
      return INVENTORY_STATUSES.LOW_STOCK;
    }

    return INVENTORY_STATUSES.IN_STOCK;
  }

  private recalculateSummary(variants: IInventoryVariantReadModel[]) {
    const active = variants.filter((variant) => variant.status === INVENTORY_RECORD_STATUSES.ACTIVE);
    const totalQuantity = active.reduce((sum, variant) => sum + variant.quantity, 0);
    const totalReserved = active.reduce((sum, variant) => sum + variant.reserved, 0);
    const totalAvailable = active.reduce((sum, variant) => sum + variant.available, 0);
    const lowStockVariantsCount = active.filter((variant) => variant.stockStatus === INVENTORY_STATUSES.LOW_STOCK).length;
    const outOfStockVariantsCount = active.filter(
      (variant) => variant.stockStatus === INVENTORY_STATUSES.OUT_OF_STOCK,
    ).length;
    const inventoryStatus = this.recalculateInventoryStatus(active);

    return {
      totalQuantity,
      totalReserved,
      totalAvailable,
      lowStockVariantsCount,
      outOfStockVariantsCount,
      inventoryStatus,
    };
  }

  private buildReadModelInventory(
    inventory: IInventory & Record<string, any>,
  ): IInventoryReadModel {
    const variants = (inventory.variants ?? []).map((variant: any) => {
      const normalized = this.normalizeVariantQuantities({
        quantity: variant.quantity ?? 0,
        reserved: variant.reserved ?? 0,
      });
      const readVariant: IInventoryVariantReadModel = {
        ...variant,
        variantId: new Types.ObjectId(variant.variantId),
        quantity: normalized.quantity,
        reserved: normalized.reserved,
        available: normalized.available,
        stockStatus: this.recalculateVariantStatus({
          status: variant.status,
          available: normalized.available,
          lowStockThreshold: variant.lowStockThreshold,
        }),
      };
      return readVariant;
    });

    const summary = this.recalculateSummary(variants);

    return {
      ...(inventory as any),
      ...summary,
      variants,
    } as IInventoryReadModel;
  }

  private async getInventoryVariant(
    productId: Types.ObjectId,
    variantId: Types.ObjectId,
    session?: ClientSession,
  ) {
    const inventory = await Inventory.findOne({ productId }).session(session ?? null).lean().exec();
    if (!inventory) {
      throw createHttpError(`Inventory for product '${productId.toString()}' wasn't found`, 404);
    }

    const variant = (inventory.variants ?? []).find((item: any) => item.variantId.toString() === variantId.toString());
    if (!variant) {
      throw createHttpError(
        `Variant with id '${variantId.toString()}' wasn't found in inventory for product '${productId.toString()}'`,
        404,
      );
    }

    return { inventory, variant };
  }

  private async createAdjustment(payload: Omit<IInventoryAdjustment, "_id" | "createdOn">, session?: ClientSession) {
    await InventoryAdjustment.create(
      [
        {
          ...payload,
          createdOn: this.getNowString(),
        },
      ],
      { session },
    );
  }

  async recalculateInventorySummary(inventoryId: Types.ObjectId, session?: ClientSession): Promise<IInventoryReadModel | undefined> {
    const inventory = await Inventory.findById(inventoryId).session(session ?? null).lean().exec();
    if (!inventory) {
      return undefined;
    }

    return this.buildReadModelInventory(inventory as unknown as IInventory);
  }

  async createForProduct(product: IProduct, session?: ClientSession): Promise<IInventory> {
    const existing = await Inventory.findOne({ productId: new Types.ObjectId(product._id) })
      .session(session ?? null)
      .lean()
      .exec();
    if (existing) {
      return existing as unknown as IInventory;
    }

    const settings = await this.settingsService.get();
    const now = this.getNowString();

    const variants: IInventoryVariant[] = (product.variants ?? []).map((variant) => ({
      variantId: new Types.ObjectId(variant._id),
      quantity: 0,
      reserved: 0,
      available: 0,
      lowStockThreshold: settings.inventory.defaultLowStockThreshold,
      allowSellingOutOfStock: settings.inventory.allowSellingOutOfStockByDefault,
      status: this.toInventoryRecordStatus(variant.status),
      updatedOn: now,
    }));

    const created = await Inventory.create(
      [
        {
          productId: new Types.ObjectId(product._id),
          variants,
          status: INVENTORY_RECORD_STATUSES.ACTIVE,
          createdOn: now,
          updatedOn: now,
        },
      ],
      { session },
    );

    return created[0].toObject() as unknown as IInventory;
  }

  async syncWithProductVariants(product: IProduct, session?: ClientSession): Promise<IInventory> {
    const settings = await this.settingsService.get();
    const now = this.getNowString();
    const productId = new Types.ObjectId(product._id);
    const inventory = await Inventory.findOne({ productId }).session(session ?? null).lean().exec();

    if (!inventory) {
      return this.createForProduct(product, session);
    }

    const existingByVariantId = new Map(
      (inventory.variants ?? []).map((variant: any) => [variant.variantId.toString(), variant]),
    );

    const nextVariants: IInventoryVariant[] = (product.variants ?? []).map((variant) => {
      const variantId = variant._id?.toString?.() ?? "";
      const existing = existingByVariantId.get(variantId);
      if (!existing) {
        return {
          variantId: new Types.ObjectId(variant._id),
          quantity: 0,
          reserved: 0,
          available: 0,
          lowStockThreshold: settings.inventory.defaultLowStockThreshold,
          allowSellingOutOfStock: settings.inventory.allowSellingOutOfStockByDefault,
          status: this.toInventoryRecordStatus(variant.status),
          updatedOn: now,
        };
      }

      const normalized = this.normalizeVariantQuantities({
        quantity: existing.quantity ?? 0,
        reserved: existing.reserved ?? 0,
      });

      return {
        ...existing,
        variantId: new Types.ObjectId(existing.variantId),
        quantity: normalized.quantity,
        reserved: normalized.reserved,
        available: normalized.available,
        lowStockThreshold: existing.lowStockThreshold,
        allowSellingOutOfStock: existing.allowSellingOutOfStock,
        status: this.toInventoryRecordStatus(variant.status),
        updatedOn: now,
      };
    });

    const updated = await Inventory.findOneAndUpdate(
      { productId },
      {
        variants: nextVariants,
        updatedOn: now,
      },
      { new: true, session },
    )
      .lean()
      .exec();

    return updated as unknown as IInventory;
  }

  async getByProductId(productId: Types.ObjectId): Promise<IInventoryReadModel> {
    const product = await Product.findById(productId).lean().exec();
    if (!product) {
      throw createHttpError(`Product with id '${productId.toString()}' wasn't found`, 404);
    }

    const inventory = await Inventory.findOne({ productId }).lean().exec();
    const synced = inventory
      ? await this.syncWithProductVariants(product as unknown as IProduct)
      : await this.createForProduct(product as unknown as IProduct);

    return this.buildReadModelInventory(synced as IInventory & Record<string, any>);
  }

  async getList(
    filters: {
      search: string;
      manufacturers: string[];
      productStatus: PRODUCT_STATUSES[];
      inventoryStatus: INVENTORY_STATUSES[];
    },
    sorting: {
      sortField: "updatedOn" | "inventoryStatus" | "product.name" | "manufacturer";
      sortOrder: "asc" | "desc";
    },
    pagination: { skip: number; limit: number },
  ) {
    const productFilter: Record<string, unknown> = {};
    if (filters.manufacturers.length > 0) {
      productFilter.manufacturer = { $in: filters.manufacturers };
    }
    if (filters.productStatus.length > 0) {
      productFilter.status = { $in: filters.productStatus };
    }
    if (filters.search.trim()) {
      const searchRegex = new RegExp(filters.search.trim(), "i");
      productFilter.$or = [{ name: { $regex: searchRegex } }, { manufacturer: { $regex: searchRegex } }];
    }

    const products = await Product.find(productFilter)
      .select("_id name manufacturer status")
      .lean()
      .exec();

    if (products.length === 0) {
      return { inventories: [], total: 0 };
    }

    const productIds = products.map((product) => new Types.ObjectId(product._id));
    const inventories = await Inventory.find({ productId: { $in: productIds } }).lean().exec();
    const productById = new Map(products.map((product) => [product._id.toString(), product]));

    const normalized = inventories
      .map((inventory: any): IInventoryListItem | null => {
        const product = productById.get(inventory.productId.toString());
        if (!product) {
          return null;
        }

        const variants = (inventory.variants ?? []).map((variant: any) => {
          const normalizedVariant = this.normalizeVariantQuantities({
            quantity: variant.quantity ?? 0,
            reserved: variant.reserved ?? 0,
          });
          const stockStatus = this.recalculateVariantStatus({
            status: variant.status,
            available: normalizedVariant.available,
            lowStockThreshold: variant.lowStockThreshold,
          });
          return {
            status: variant.status,
            stockStatus,
          };
        });

        const activeVariants = variants.filter((variant) => variant.status === INVENTORY_RECORD_STATUSES.ACTIVE);
        const lowStockVariantsCount = activeVariants.filter(
          (variant) => variant.stockStatus === INVENTORY_STATUSES.LOW_STOCK,
        ).length;
        const outOfStockVariantsCount = activeVariants.filter(
          (variant) => variant.stockStatus === INVENTORY_STATUSES.OUT_OF_STOCK,
        ).length;
        const inventoryStatus = this.recalculateInventoryStatus(activeVariants);

        return {
          _id: inventory._id.toString(),
          productId: inventory.productId.toString(),
          product: {
            _id: product._id.toString(),
            name: product.name,
            manufacturer: product.manufacturer,
            status: product.status,
          },
          status: inventory.status,
          inventoryStatus,
          variantsCount: (inventory.variants ?? []).length,
          lowStockVariantsCount,
          outOfStockVariantsCount,
          updatedOn: inventory.updatedOn,
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));

    const filtered = normalized.filter((inventory) => {
      if (filters.inventoryStatus.length > 0 && !filters.inventoryStatus.includes(inventory.inventoryStatus)) {
        return false;
      }
      return true;
    });

    const inventoryStatusRank: Record<INVENTORY_STATUSES, number> = {
      [INVENTORY_STATUSES.OUT_OF_STOCK]: 4,
      [INVENTORY_STATUSES.LOW_STOCK]: 3,
      [INVENTORY_STATUSES.IN_STOCK]: 2,
      [INVENTORY_STATUSES.NOT_TRACKED]: 1,
    };
    const sortDirection = sorting.sortOrder === "asc" ? 1 : -1;
    filtered.sort((a, b) => {
      const sortField = sorting.sortField;
      let comparison = 0;
      if (sortField === "updatedOn") {
        comparison = new Date(a.updatedOn).getTime() - new Date(b.updatedOn).getTime();
      } else if (sortField === "inventoryStatus") {
        comparison = inventoryStatusRank[a.inventoryStatus] - inventoryStatusRank[b.inventoryStatus];
      } else if (sortField === "product.name") {
        comparison = a.product.name.localeCompare(b.product.name);
      } else if (sortField === "manufacturer") {
        comparison = a.product.manufacturer.localeCompare(b.product.manufacturer);
      }

      if (comparison === 0) {
        const leftUpdatedOn = new Date(a.updatedOn).getTime();
        const rightUpdatedOn = new Date(b.updatedOn).getTime();
        return rightUpdatedOn - leftUpdatedOn;
      }

      return comparison * sortDirection;
    });

    const paginated = filtered.slice(pagination.skip, pagination.skip + pagination.limit);
    return { inventories: paginated, total: filtered.length };
  }

  async getAdjustmentsByProduct(productId: Types.ObjectId, query: AdjustmentQuery) {
    return this.getAdjustments({ productId, query });
  }

  async getAdjustmentsByVariant(productId: Types.ObjectId, variantId: Types.ObjectId, query: AdjustmentQuery) {
    return this.getAdjustments({ productId, variantId, query });
  }

  private async getAdjustments(params: {
    productId: Types.ObjectId;
    variantId?: Types.ObjectId;
    query: AdjustmentQuery;
  }) {
    const { productId, variantId, query } = params;
    const filter: Record<string, unknown> = { productId };

    if (variantId) {
      filter.variantId = variantId;
    }
    if (query.type && query.type.length > 0) {
      filter.type = { $in: query.type };
    }
    if (query.orderId) {
      filter.orderId = new Types.ObjectId(query.orderId);
    }
    if (query.reservationId) {
      filter.reservationId = new Types.ObjectId(query.reservationId);
    }
    if (query.createdBy) {
      filter.createdBy = new Types.ObjectId(query.createdBy);
    }
    if (query.fromDate || query.toDate) {
      const dateFilter: Record<string, Date> = {};
      if (query.fromDate) {
        dateFilter.$gte = new Date(query.fromDate);
      }
      if (query.toDate) {
        dateFilter.$lte = new Date(query.toDate);
      }
      filter.createdOn = dateFilter;
    }

    const sort = query.sortOrder === "asc" ? 1 : -1;
    const skip = (query.page - 1) * query.limit;

    const [adjustments, total] = await Promise.all([
      InventoryAdjustment.find(filter).sort({ createdOn: sort }).skip(skip).limit(query.limit).lean().exec(),
      InventoryAdjustment.countDocuments(filter).exec(),
    ]);

    return { adjustments, total };
  }

  async adjustStock(
    payload: {
      productId: Types.ObjectId;
      variantId: Types.ObjectId;
      type:
        | INVENTORY_ADJUSTMENT_TYPES.MANUAL_INCREASE
        | INVENTORY_ADJUSTMENT_TYPES.MANUAL_DECREASE
        | INVENTORY_ADJUSTMENT_TYPES.MANUAL_CORRECTION
        | INVENTORY_ADJUSTMENT_TYPES.DAMAGE
        | INVENTORY_ADJUSTMENT_TYPES.RETURN;
      quantity: number;
      reason?: string;
      comment?: string;
    },
    managerId: string,
  ): Promise<IInventoryReadModel> {
    const session = await mongoose.startSession();

    try {
      let inventoryId: Types.ObjectId | null = null;
      await session.withTransaction(async () => {
        const { inventory, variant } = await this.getInventoryVariant(payload.productId, payload.variantId, session);
        inventoryId = new Types.ObjectId(inventory._id);
        const beforeQuantity = variant.quantity;
        const beforeReserved = variant.reserved ?? 0;

        let afterQuantity = beforeQuantity;
        let quantityChange = 0;

        if (
          payload.type === INVENTORY_ADJUSTMENT_TYPES.MANUAL_INCREASE ||
          payload.type === INVENTORY_ADJUSTMENT_TYPES.RETURN
        ) {
          quantityChange = payload.quantity;
          afterQuantity = beforeQuantity + payload.quantity;
        } else if (
          payload.type === INVENTORY_ADJUSTMENT_TYPES.MANUAL_DECREASE ||
          payload.type === INVENTORY_ADJUSTMENT_TYPES.DAMAGE
        ) {
          quantityChange = -payload.quantity;
          afterQuantity = beforeQuantity - payload.quantity;
        } else {
          quantityChange = payload.quantity - beforeQuantity;
          afterQuantity = payload.quantity;
        }

        if (afterQuantity < 0) {
          throw createHttpError("Quantity cannot be negative", 400);
        }

        if (afterQuantity < beforeReserved) {
          throw createHttpError("Quantity cannot be lower than reserved amount", 409);
        }

        const nextVariants = (inventory.variants ?? []).map((item: any) =>
          item.variantId.toString() === payload.variantId.toString()
            ? this.buildVariantUpdate(item, { quantity: afterQuantity, reserved: beforeReserved })
            : item,
        );

        await Inventory.findByIdAndUpdate(
          inventory._id,
          {
            variants: nextVariants,
            updatedOn: this.getNowString(),
          },
          { session },
        )
          .lean()
          .exec();

        await this.createAdjustment(
          {
            inventoryId: new Types.ObjectId(inventory._id),
            productId: payload.productId,
            variantId: payload.variantId,
            type: payload.type,
            quantityChange,
            quantityBefore: beforeQuantity,
            quantityAfter: afterQuantity,
            reservedBefore: beforeReserved,
            reservedAfter: beforeReserved,
            reason: payload.reason,
            comment: payload.comment,
            createdBy: new Types.ObjectId(managerId),
          },
          session,
        );
      });

      if (!inventoryId) {
        throw createHttpError("Inventory was not updated", 500);
      }

      const updated = (await Inventory.findById(inventoryId).lean().exec()) as IInventory | null;
      if (!updated) {
        throw createHttpError("Inventory was not found after update", 500);
      }
      return this.buildReadModelInventory(updated as IInventory & Record<string, any>);
    } finally {
      await session.endSession();
    }
  }

  async updateVariantSettings(
    productId: Types.ObjectId,
    variantId: Types.ObjectId,
    payload: {
      lowStockThreshold?: number;
      allowSellingOutOfStock?: boolean;
    },
  ): Promise<IInventoryReadModel> {
    const { inventory, variant } = await this.getInventoryVariant(productId, variantId);
    const reserved = variant.reserved ?? 0;
    const nextAllowSelling = payload.allowSellingOutOfStock ?? variant.allowSellingOutOfStock;

    if (!nextAllowSelling && variant.quantity < reserved) {
      throw createHttpError("Quantity cannot be lower than reserved amount", 409);
    }

    const nextVariant = this.buildVariantUpdate(variant as any, {
      lowStockThreshold: payload.lowStockThreshold ?? variant.lowStockThreshold,
      allowSellingOutOfStock: nextAllowSelling,
    });

    const nextVariants = (inventory.variants ?? []).map((item: any) =>
      item.variantId.toString() === variantId.toString() ? nextVariant : item,
    );

    const updated = await Inventory.findByIdAndUpdate(
      inventory._id,
      {
        variants: nextVariants,
        updatedOn: this.getNowString(),
      },
      { new: true },
    )
      .lean()
      .exec();

    if (!updated) {
      throw createHttpError("Inventory was not updated", 500);
    }

    return this.buildReadModelInventory(updated as IInventory & Record<string, any>);
  }

  private async getOrCreateInventoryByProductId(productId: Types.ObjectId, session: ClientSession) {
    const existing = await Inventory.findOne({ productId }).session(session).lean().exec();
    if (existing) {
      return existing;
    }

    const product = await Product.findById(productId).session(session).lean().exec();
    if (!product) {
      throw createHttpError(`Product with id '${productId.toString()}' wasn't found`, 404);
    }

    return this.createForProduct(product as unknown as IProduct, session);
  }

  async reserveItems(params: {
    orderId: Types.ObjectId;
    items: ReserveItemsInput;
    reservationType: RESERVATION_TYPES;
    managerId: string;
    expiresAt: Date | null;
    session: ClientSession;
  }): Promise<IReservation | null> {
    const { orderId, items, reservationType, managerId, expiresAt, session } = params;

    const existingReservation = await Reservation.findOne({ orderId }).session(session).lean().exec();
    const existingItemsByKey = new Map<string, number>();
    for (const item of existingReservation?.items ?? []) {
      const key = this.getReservationVariantKey(item.productId, item.variantId);
      existingItemsByKey.set(key, (existingItemsByKey.get(key) ?? 0) + item.quantity);
    }

    const reservationIdForAdjustments = existingReservation
      ? new Types.ObjectId(existingReservation._id)
      : new Types.ObjectId();
    const nextReservationItems: Array<{ productId: Types.ObjectId; variantId: Types.ObjectId; quantity: number }> = [];

    for (const item of items) {
      const inventory = await this.getOrCreateInventoryByProductId(item.productId, session);
      const variant = (inventory.variants ?? []).find((v: any) => v.variantId.toString() === item.variantId.toString());
      if (!variant) {
        throw createHttpError(`Variant with id '${item.variantId.toString()}' wasn't found in inventory`, 404);
      }
      if (variant.status !== INVENTORY_RECORD_STATUSES.ACTIVE) {
        throw createHttpError(`Variant with id '${item.variantId.toString()}' is not active in inventory`, 400);
      }

      const key = this.getReservationVariantKey(item.productId, item.variantId);
      const previouslyReservedByOrder = existingItemsByKey.get(key) ?? 0;
      const beforeReserved = variant.reserved ?? 0;
      const baseReservedWithoutOrder = Math.max(0, beforeReserved - previouslyReservedByOrder);
      const availableBefore = Math.max((variant.quantity ?? 0) - baseReservedWithoutOrder, 0);

      if (!variant.allowSellingOutOfStock && availableBefore < item.quantity) {
        throw createHttpError("Not enough stock", 409);
      }

      const reservedQuantity = variant.allowSellingOutOfStock ? Math.min(item.quantity, availableBefore) : item.quantity;
      const afterReserved = baseReservedWithoutOrder + reservedQuantity;
      const nextVariant = this.buildVariantUpdate(variant as any, { reserved: afterReserved });

      const nextVariants = (inventory.variants ?? []).map((v: any) =>
        v.variantId.toString() === item.variantId.toString() ? nextVariant : v,
      );

      await Inventory.findByIdAndUpdate(
        inventory._id,
        {
          variants: nextVariants,
          updatedOn: this.getNowString(),
        },
        { session },
      )
        .lean()
        .exec();

      await this.createAdjustment(
        {
          inventoryId: new Types.ObjectId(inventory._id),
          productId: item.productId,
          variantId: item.variantId,
          type: INVENTORY_ADJUSTMENT_TYPES.RESERVE,
          quantityChange: 0,
          quantityBefore: variant.quantity,
          quantityAfter: variant.quantity,
          reservedBefore: beforeReserved,
          reservedAfter: afterReserved,
          orderId,
          reservationId: reservationIdForAdjustments,
          createdBy: new Types.ObjectId(managerId),
        },
        session,
      );

      if (reservedQuantity > 0) {
        nextReservationItems.push({
          productId: new Types.ObjectId(item.productId),
          variantId: new Types.ObjectId(item.variantId),
          quantity: reservedQuantity,
        });
      }
    }

    if (nextReservationItems.length === 0) {
      if (existingReservation) {
        await Reservation.deleteOne({ _id: existingReservation._id }).session(session).exec();
      }
      return null;
    }

    const now = this.getNowString();
    const reservation = await Reservation.findOneAndUpdate(
      { orderId },
      {
        $set: {
          type: reservationType,
          items: nextReservationItems,
          expiresAt,
          updatedOn: now,
        },
        $setOnInsert: {
          _id: reservationIdForAdjustments,
          createdOn: now,
        },
      },
      { new: true, upsert: true, session },
    )
      .lean()
      .exec();

    return reservation as unknown as IReservation;
  }

  async releaseReservationByOrder(params: ReservationReleaseParams & Record<string, unknown>): Promise<IReservation | null> {
    const { orderId, managerId, session, type = INVENTORY_ADJUSTMENT_TYPES.RELEASE } = params;

    const reservation = await Reservation.findOne({ orderId }).session(session).lean().exec();
    if (!reservation) {
      return null;
    }

    for (const item of reservation.items ?? []) {
      const inventory = await Inventory.findOne({ productId: item.productId }).session(session).lean().exec();
      if (!inventory) {
        continue;
      }

      const variant = (inventory.variants ?? []).find((v: any) => v.variantId.toString() === item.variantId.toString());
      if (!variant) {
        continue;
      }

      const productId = new Types.ObjectId(item.productId);
      const variantId = new Types.ObjectId(item.variantId);
      const beforeReserved = variant.reserved ?? 0;
      const afterReserved = Math.max(0, beforeReserved - item.quantity);
      const nextVariant = this.buildVariantUpdate(variant as any, { reserved: afterReserved });
      const nextVariants = (inventory.variants ?? []).map((v: any) =>
        v.variantId.toString() === variantId.toString() ? nextVariant : v,
      );

      await Inventory.findByIdAndUpdate(
        inventory._id,
        {
          variants: nextVariants,
          updatedOn: this.getNowString(),
        },
        { session },
      )
        .lean()
        .exec();

      await this.createAdjustment(
        {
          inventoryId: new Types.ObjectId(inventory._id),
          productId,
          variantId,
          type,
          quantityChange: 0,
          quantityBefore: variant.quantity,
          quantityAfter: variant.quantity,
          reservedBefore: beforeReserved,
          reservedAfter: afterReserved,
          orderId,
          reservationId: new Types.ObjectId(reservation._id),
          createdBy: new Types.ObjectId(managerId),
        },
        session,
      );
    }

    await Reservation.deleteOne({ _id: reservation._id }).session(session).exec();
    return reservation as unknown as IReservation;
  }

  private async getSystemAdminManager(session?: ClientSession) {
    return Manager.findOne({ roles: ROLES.ADMIN })
      .session(session ?? null)
      .select("_id username firstName lastName roles createdOn")
      .lean()
      .exec();
  }

  async markReservationAsOrderProcessing(orderId: Types.ObjectId, session: ClientSession) {
    const reservation = await Reservation.findOne({ orderId }).session(session).lean().exec();
    if (!reservation) {
      return null;
    }

    const updated = await Reservation.findByIdAndUpdate(
      reservation._id,
      {
        type: RESERVATION_TYPES.ORDER_PROCESSING,
        expiresAt: null,
        updatedOn: this.getNowString(),
      },
      { new: true, session },
    )
      .lean()
      .exec();

    return updated as unknown as IReservation | null;
  }

  async applySaleForOrderLines(params: {
    orderId: Types.ObjectId;
    lines: ReserveItemsInput;
    managerId: string;
    session: ClientSession;
  }) {
    const { orderId, lines, managerId, session } = params;
    const reservation = await Reservation.findOne({ orderId }).session(session).lean().exec();
    const reservationItemsByKey = new Map<string, number>();
    for (const item of reservation?.items ?? []) {
      const key = this.getReservationVariantKey(item.productId, item.variantId);
      reservationItemsByKey.set(key, (reservationItemsByKey.get(key) ?? 0) + item.quantity);
    }

    for (const line of lines) {
      const inventory = await this.getOrCreateInventoryByProductId(line.productId, session);
      const beforeVariant = (inventory.variants ?? []).find(
        (variant: any) => variant.variantId.toString() === line.variantId.toString(),
      );
      if (!beforeVariant) {
        throw createHttpError(
          `Variant with id '${line.variantId.toString()}' wasn't found in inventory for product '${line.productId.toString()}'`,
          404,
        );
      }

      const reservedBefore = beforeVariant.reserved ?? 0;
      const quantityBefore = beforeVariant.quantity;
      const key = this.getReservationVariantKey(line.productId, line.variantId);
      const reservedFromOrder = reservationItemsByKey.get(key) ?? 0;
      const stockQuantityToSell = Math.min(reservedFromOrder, reservedBefore, quantityBefore);
      const quantityAfter = quantityBefore - stockQuantityToSell;
      const reservedAfter = Math.max(0, reservedBefore - stockQuantityToSell);

      if (stockQuantityToSell <= 0) {
        continue;
      }

      const nextVariant = this.buildVariantUpdate(beforeVariant as any, {
        quantity: quantityAfter,
        reserved: reservedAfter,
      });

      const nextVariants = (inventory.variants ?? []).map((variant: any) =>
        variant.variantId.toString() === line.variantId.toString()
          ? nextVariant
          : variant,
      );

      await Inventory.findByIdAndUpdate(
        inventory._id,
        {
          variants: nextVariants,
          updatedOn: this.getNowString(),
        },
        { session },
      )
        .lean()
        .exec();

      await this.createAdjustment(
        {
          inventoryId: new Types.ObjectId(inventory._id),
          productId: line.productId,
          variantId: line.variantId,
          type: INVENTORY_ADJUSTMENT_TYPES.SALE,
          quantityChange: -stockQuantityToSell,
          quantityBefore,
          quantityAfter,
          reservedBefore,
          reservedAfter,
          orderId,
          createdBy: new Types.ObjectId(managerId),
        },
        session,
      );

      if (reservedFromOrder > 0) {
        const nextReservedFromOrder = Math.max(0, reservedFromOrder - stockQuantityToSell);
        reservationItemsByKey.set(key, nextReservedFromOrder);
      }
    }

    if (reservation) {
      const nextReservationItems = (reservation.items ?? [])
        .map((item) => {
          const key = this.getReservationVariantKey(item.productId, item.variantId);
          const nextQuantity = reservationItemsByKey.get(key) ?? item.quantity;
          if (nextQuantity <= 0) {
            return null;
          }
          return {
            productId: new Types.ObjectId(item.productId),
            variantId: new Types.ObjectId(item.variantId),
            quantity: nextQuantity,
          };
        })
        .filter((item): item is NonNullable<typeof item> => Boolean(item));

      if (nextReservationItems.length === 0) {
        await Reservation.deleteOne({ _id: reservation._id }).session(session).exec();
      } else {
        await Reservation.findByIdAndUpdate(
          reservation._id,
          {
            items: nextReservationItems,
            updatedOn: this.getNowString(),
          },
          { session },
        )
          .lean()
          .exec();
      }
    }
  }

  async deleteByProductId(productId: Types.ObjectId, session?: ClientSession) {
    await Promise.all([
      Inventory.deleteOne({ productId }).session(session ?? null).exec(),
      InventoryAdjustment.deleteMany({ productId }).session(session ?? null).exec(),
      Reservation.deleteMany({ "items.productId": productId }).session(session ?? null).exec(),
    ]);
  }

  async deleteVariantData(productId: Types.ObjectId, variantId: Types.ObjectId, session?: ClientSession) {
    await Promise.all([
      Inventory.updateOne({ productId }, { $pull: { variants: { variantId } } }).session(session ?? null).exec(),
      InventoryAdjustment.deleteMany({ productId, variantId }).session(session ?? null).exec(),
      Reservation.updateMany(
        { items: { $elemMatch: { productId, variantId } } },
        { $pull: { items: { productId, variantId } } },
      )
        .session(session ?? null)
        .exec(),
      Reservation.deleteMany({ items: { $size: 0 } }).session(session ?? null).exec(),
    ]);
  }

  async expireReservations() {
    const now = new Date();
    const toExpire = await Reservation.find({ expiresAt: { $ne: null, $lte: now } })
      .select("_id")
      .lean()
      .exec();

    if (!toExpire.length) {
      return { expired: 0 };
    }

    let expired = 0;

    for (const reservationRef of toExpire) {
      const session = await mongoose.startSession();
      let cancellationNotificationTarget: { managerId: string; orderId: string } | null = null;
      try {
        await session.withTransaction(async () => {
          const systemAdmin = await this.getSystemAdminManager(session);
          if (!systemAdmin?._id) {
            return;
          }

          const reservation = await Reservation.findOne({ _id: reservationRef._id }).session(session).lean().exec();
          if (!reservation) {
            return;
          }

          const order = await Order.findById(reservation.orderId).session(session).lean().exec();
          if (!order) {
            console.error(
              `[reservation-expiration] orphan reservation ${reservation._id.toString()} for missing order ${reservation.orderId.toString()}`,
            );
            return;
          }

          if (order.status !== ORDER_STATUSES.DRAFT) {
            console.error(
              `[reservation-expiration] skipping non-draft reservation ${reservation._id.toString()} for order ${order._id.toString()} status=${order.status} type=${reservation.type} expiresAt=${reservation.expiresAt}`,
            );
            return;
          }

          await this.releaseReservationByOrder({
            orderId: new Types.ObjectId(reservation.orderId),
            managerId: systemAdmin._id.toString(),
            session,
            type: INVENTORY_ADJUSTMENT_TYPES.EXPIRED_RESERVATION,
          });

          const nextOrder = {
            ...order,
            status: ORDER_STATUSES.CANCELED,
          };

          nextOrder.history = [...(order.history ?? [])];
          nextOrder.history.unshift(
            createHistoryEntry(
              {
                status: ORDER_STATUSES.CANCELED,
                customer: order.customer._id,
                products: order.products,
                delivery: order.delivery,
                total_price: order.total_price,
                assignedManager: order.assignedManager,
              },
              ORDER_HISTORY_ACTIONS.CANCELED,
              systemAdmin as any,
            ),
          );

          await Order.findByIdAndUpdate(order._id, nextOrder, { session }).exec();
          if (order.assignedManager?._id) {
            cancellationNotificationTarget = {
              managerId: order.assignedManager._id.toString(),
              orderId: order._id.toString(),
            };
          }
          expired += 1;
        });
        if (cancellationNotificationTarget) {
          await this.notificationService.create({
            managerId: cancellationNotificationTarget.managerId,
            orderId: cancellationNotificationTarget.orderId,
            type: "statusChanged",
            message: NOTIFICATIONS.statusChanged({
              status: ORDER_STATUSES.CANCELED,
              orderId: cancellationNotificationTarget.orderId,
              reason: "reservationExpired",
            }),
          });
        }
      } finally {
        await session.endSession();
      }
    }

    return { expired };
  }
}

export default new InventoryService();
