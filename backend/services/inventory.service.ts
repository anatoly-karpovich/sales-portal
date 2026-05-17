import mongoose, { ClientSession, Types } from "mongoose";
import {
  INVENTORY_ADJUSTMENT_TYPES,
  INVENTORY_RECORD_STATUSES,
  INVENTORY_STATUSES,
  NOTIFICATIONS,
  ORDER_HISTORY_ACTIONS,
  ORDER_STATUSES,
  PRODUCT_STATUSES,
  RESERVATION_TYPES,
  ROLES,
} from "../data/enums";
import type {
  IInventory,
  IInventoryAdjustment,
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

  private getReservationVariantKey(productId: Types.ObjectId, variantId: Types.ObjectId) {
    return `${productId.toString()}:${variantId.toString()}`;
  }

  private toInventoryRecordStatus(productVariantStatus: PRODUCT_STATUSES): INVENTORY_RECORD_STATUSES {
    return productVariantStatus === PRODUCT_STATUSES.ARCHIVED
      ? INVENTORY_RECORD_STATUSES.ARCHIVED
      : INVENTORY_RECORD_STATUSES.ACTIVE;
  }

  private getReservedQuantityForVariant(
    productId: Types.ObjectId,
    variantId: Types.ObjectId,
    reservedByVariant: Map<string, number>,
  ) {
    return reservedByVariant.get(this.getReservationVariantKey(productId, variantId)) ?? 0;
  }

  private async getReservedQuantitiesByVariant(productIds?: Types.ObjectId[], session?: ClientSession) {
    const pipeline: any[] = [];

    if (productIds?.length) {
      pipeline.push({
        $match: {
          "items.productId": { $in: productIds },
        },
      });
    }

    pipeline.push(
      { $unwind: "$items" },
      ...(productIds?.length
        ? [
            {
              $match: {
                "items.productId": { $in: productIds },
              },
            },
          ]
        : []),
      {
        $group: {
          _id: {
            productId: "$items.productId",
            variantId: "$items.variantId",
          },
          reserved: { $sum: "$items.quantity" },
        },
      },
    );

    const aggregate = Reservation.aggregate(pipeline);
    if (session) {
      aggregate.session(session);
    }

    const rows = await aggregate.exec();
    const reservedByVariant = new Map<string, number>();
    for (const row of rows) {
      const productId = new Types.ObjectId(row._id.productId);
      const variantId = new Types.ObjectId(row._id.variantId);
      reservedByVariant.set(this.getReservationVariantKey(productId, variantId), row.reserved ?? 0);
    }

    return reservedByVariant;
  }

  recalculateVariantStatus(
    variant: Pick<IInventoryVariantReadModel, "status" | "allowSellingOutOfStock" | "available" | "lowStockThreshold">,
  ): INVENTORY_STATUSES {
    if (variant.status === INVENTORY_RECORD_STATUSES.ARCHIVED) {
      return INVENTORY_STATUSES.NOT_TRACKED;
    }
    if (variant.allowSellingOutOfStock) {
      return INVENTORY_STATUSES.IN_STOCK;
    }
    if (variant.available <= 0) {
      return INVENTORY_STATUSES.OUT_OF_STOCK;
    }
    if (variant.available <= variant.lowStockThreshold) {
      return INVENTORY_STATUSES.LOW_STOCK;
    }
    return INVENTORY_STATUSES.IN_STOCK;
  }

  private recalculateInventoryStatus(variants: IInventoryVariantReadModel[]): INVENTORY_STATUSES {
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
    reservedByVariant: Map<string, number>,
  ): IInventoryReadModel {
    const productId = new Types.ObjectId(inventory.productId);

    const variants = (inventory.variants ?? []).map((variant: any) => {
      const variantId = new Types.ObjectId(variant.variantId);
      const reserved = this.getReservedQuantityForVariant(productId, variantId, reservedByVariant);
      const available = (variant.quantity ?? 0) - reserved;
      const readVariant: IInventoryVariantReadModel = {
        ...variant,
        variantId,
        reserved,
        available,
        stockStatus: this.recalculateVariantStatus({
          status: variant.status,
          allowSellingOutOfStock: variant.allowSellingOutOfStock,
          available,
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

    const productId = new Types.ObjectId(inventory.productId);
    const reservedByVariant = await this.getReservedQuantitiesByVariant([productId], session);
    return this.buildReadModelInventory(inventory as unknown as IInventory, reservedByVariant);
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
          lowStockThreshold: settings.inventory.defaultLowStockThreshold,
          allowSellingOutOfStock: settings.inventory.allowSellingOutOfStockByDefault,
          status: this.toInventoryRecordStatus(variant.status),
          updatedOn: now,
        };
      }

      return {
        ...existing,
        variantId: new Types.ObjectId(existing.variantId),
        quantity: existing.quantity,
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

    const reservedByVariant = await this.getReservedQuantitiesByVariant([productId]);
    return this.buildReadModelInventory(synced as IInventory & Record<string, any>, reservedByVariant);
  }

  async getList(
    filters: {
      search: string;
      manufacturers: string[];
      categoryId?: string;
      rootCategoryId?: string;
      inventoryStatus: INVENTORY_STATUSES[];
      lowStockOnly: boolean;
      outOfStockOnly: boolean;
      includeArchived: boolean;
    },
    sorting: {
      sortField: "totalAvailable" | "totalReserved" | "updatedOn" | "lowStockVariantsCount" | "outOfStockVariantsCount";
      sortOrder: "asc" | "desc";
    },
    pagination: { skip: number; limit: number },
  ) {
    const productFilter: Record<string, unknown> = {};
    if (filters.manufacturers.length > 0) {
      productFilter.manufacturer = { $in: filters.manufacturers };
    }
    if (filters.categoryId) {
      productFilter.categoryId = new Types.ObjectId(filters.categoryId);
    }
    if (filters.rootCategoryId) {
      productFilter.rootCategoryId = new Types.ObjectId(filters.rootCategoryId);
    }
    if (filters.search.trim()) {
      const searchRegex = new RegExp(filters.search.trim(), "i");
      productFilter.$or = [{ name: { $regex: searchRegex } }, { manufacturer: { $regex: searchRegex } }];
    }

    const products = await Product.find(productFilter)
      .select("_id name manufacturer categoryId rootCategoryId status")
      .lean()
      .exec();

    if (products.length === 0) {
      return { inventories: [], total: 0 };
    }

    const productIds = products.map((product) => new Types.ObjectId(product._id));
    const inventoryFilter: Record<string, unknown> = { productId: { $in: productIds } };
    if (!filters.includeArchived) {
      inventoryFilter.status = INVENTORY_RECORD_STATUSES.ACTIVE;
    }

    const inventories = await Inventory.find(inventoryFilter).lean().exec();
    const reservedByVariant = await this.getReservedQuantitiesByVariant(productIds);
    const productById = new Map(products.map((product) => [product._id.toString(), product]));

    const normalized = inventories
      .map((inventory: any) => {
        const product = productById.get(inventory.productId.toString());
        if (!product) {
          return null;
        }

        const readModelInventory = this.buildReadModelInventory(inventory as IInventory & Record<string, any>, reservedByVariant);

        return {
          ...readModelInventory,
          product: {
            _id: product._id.toString(),
            name: product.name,
            manufacturer: product.manufacturer,
            categoryId: product.categoryId.toString(),
            rootCategoryId: product.rootCategoryId.toString(),
            status: product.status,
          },
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));

    const filtered = normalized.filter((inventory) => {
      if (filters.inventoryStatus.length > 0 && !filters.inventoryStatus.includes(inventory.inventoryStatus)) {
        return false;
      }
      if (filters.lowStockOnly && inventory.lowStockVariantsCount <= 0) {
        return false;
      }
      if (filters.outOfStockOnly && inventory.outOfStockVariantsCount <= 0) {
        return false;
      }
      return true;
    });

    const sortDirection = sorting.sortOrder === "asc" ? 1 : -1;
    filtered.sort((a, b) => {
      const sortField = sorting.sortField;
      const left = (a as any)[sortField];
      const right = (b as any)[sortField];

      let comparison = 0;
      if (typeof left === "number" && typeof right === "number") {
        comparison = left - right;
      } else {
        comparison = String(left).localeCompare(String(right));
      }

      if (comparison === 0 && sortField !== "updatedOn") {
        const leftUpdatedOn = new Date((a as any).updatedOn).getTime();
        const rightUpdatedOn = new Date((b as any).updatedOn).getTime();
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
        const reservedByVariant = await this.getReservedQuantitiesByVariant([payload.productId], session);

        const beforeQuantity = variant.quantity;
        const beforeReserved = this.getReservedQuantityForVariant(payload.productId, payload.variantId, reservedByVariant);

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

        if (!variant.allowSellingOutOfStock && afterQuantity < beforeReserved) {
          throw createHttpError("Quantity cannot be lower than reserved amount", 400);
        }

        const nextVariants = (inventory.variants ?? []).map((item: any) =>
          item.variantId.toString() === payload.variantId.toString()
            ? {
                ...item,
                quantity: afterQuantity,
                updatedOn: this.getNowString(),
              }
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
      const reservedByVariant = await this.getReservedQuantitiesByVariant([payload.productId]);
      return this.buildReadModelInventory(updated as IInventory & Record<string, any>, reservedByVariant);
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
    const reservedByVariant = await this.getReservedQuantitiesByVariant([productId]);
    const reserved = this.getReservedQuantityForVariant(productId, variantId, reservedByVariant);
    const nextAllowSelling = payload.allowSellingOutOfStock ?? variant.allowSellingOutOfStock;

    if (!nextAllowSelling && variant.quantity < reserved) {
      throw createHttpError("Quantity cannot be lower than reserved amount", 400);
    }

    const nextVariant = {
      ...variant,
      lowStockThreshold: payload.lowStockThreshold ?? variant.lowStockThreshold,
      allowSellingOutOfStock: nextAllowSelling,
      updatedOn: this.getNowString(),
    };

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

    return this.buildReadModelInventory(updated as IInventory & Record<string, any>, reservedByVariant);
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
    expiresAt: Date;
    session: ClientSession;
  }): Promise<IReservation> {
    const { orderId, items, reservationType, managerId, expiresAt, session } = params;

    const existingReservation = await Reservation.findOne({ orderId }).session(session).lean().exec();
    const productIds = [...new Set(
      [...items, ...(existingReservation?.items ?? [])].map((item) => item.productId.toString()),
    )].map((id) => new Types.ObjectId(id));

    const reservedByVariant = await this.getReservedQuantitiesByVariant(productIds, session);

    if (existingReservation) {
      for (const item of existingReservation.items ?? []) {
        const key = this.getReservationVariantKey(new Types.ObjectId(item.productId), new Types.ObjectId(item.variantId));
        const current = reservedByVariant.get(key) ?? 0;
        reservedByVariant.set(key, Math.max(0, current - item.quantity));
      }
    }

    const reservationIdForAdjustments = existingReservation
      ? new Types.ObjectId(existingReservation._id)
      : new Types.ObjectId();

    for (const item of items) {
      const inventory = await this.getOrCreateInventoryByProductId(item.productId, session);
      const variant = (inventory.variants ?? []).find((v: any) => v.variantId.toString() === item.variantId.toString());
      if (!variant) {
        throw createHttpError(`Variant with id '${item.variantId.toString()}' wasn't found in inventory`, 404);
      }
      if (variant.status !== INVENTORY_RECORD_STATUSES.ACTIVE) {
        throw createHttpError(`Variant with id '${item.variantId.toString()}' is not active in inventory`, 400);
      }

      const beforeReserved = this.getReservedQuantityForVariant(item.productId, item.variantId, reservedByVariant);
      const afterReserved = beforeReserved + item.quantity;
      const availableBefore = variant.quantity - beforeReserved;

      if (!variant.allowSellingOutOfStock && availableBefore < item.quantity) {
        throw createHttpError("Not enough stock", 409);
      }

      reservedByVariant.set(this.getReservationVariantKey(item.productId, item.variantId), afterReserved);

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
    }

    const now = this.getNowString();
    const reservation = await Reservation.findOneAndUpdate(
      { orderId },
      {
        $set: {
          type: reservationType,
          items,
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

    const productIds = [...new Set((reservation.items ?? []).map((item: any) => item.productId.toString()))].map(
      (id) => new Types.ObjectId(id),
    );
    const reservedByVariant = await this.getReservedQuantitiesByVariant(productIds, session);

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
      const beforeReserved = this.getReservedQuantityForVariant(productId, variantId, reservedByVariant);
      const afterReserved = Math.max(0, beforeReserved - item.quantity);
      reservedByVariant.set(this.getReservationVariantKey(productId, variantId), afterReserved);

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

  async completeReservationByOrder(orderId: Types.ObjectId, session: ClientSession, managerId?: string) {
    let resolvedManagerId = managerId;
    if (!resolvedManagerId) {
      const systemAdmin = await this.getSystemAdminManager(session);
      if (!systemAdmin?._id) {
        return;
      }
      resolvedManagerId = systemAdmin._id.toString();
    }

    await this.releaseReservationByOrder({
      orderId,
      managerId: resolvedManagerId,
      session,
      type: INVENTORY_ADJUSTMENT_TYPES.RELEASE,
    });
  }

  async applySaleForOrderLines(params: {
    orderId: Types.ObjectId;
    lines: ReserveItemsInput;
    managerId: string;
    session: ClientSession;
  }) {
    const { orderId, lines, managerId, session } = params;

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

      const reservedByVariant = await this.getReservedQuantitiesByVariant([line.productId], session);
      const reservedBefore = this.getReservedQuantityForVariant(line.productId, line.variantId, reservedByVariant);
      const quantityBefore = beforeVariant.quantity;
      const quantityAfter = quantityBefore - line.quantity;

      if (!beforeVariant.allowSellingOutOfStock && quantityAfter < reservedBefore) {
        throw createHttpError("Not enough stock", 409);
      }

      const nextVariants = (inventory.variants ?? []).map((variant: any) =>
        variant.variantId.toString() === line.variantId.toString()
          ? {
              ...variant,
              quantity: quantityAfter,
              updatedOn: this.getNowString(),
            }
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
          quantityChange: -line.quantity,
          quantityBefore,
          quantityAfter,
          reservedBefore: reservedBefore,
          reservedAfter: reservedBefore,
          orderId,
          createdBy: new Types.ObjectId(managerId),
        },
        session,
      );
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
    const toExpire = await Reservation.find({ expiresAt: { $lte: now } })
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

          await this.releaseReservationByOrder({
            orderId: new Types.ObjectId(reservation.orderId),
            managerId: systemAdmin._id.toString(),
            session,
            type: INVENTORY_ADJUSTMENT_TYPES.EXPIRED_RESERVATION,
          });

          const order = await Order.findById(reservation.orderId).session(session).lean().exec();
          if (!order || order.status !== ORDER_STATUSES.DRAFT) {
            expired += 1;
            return;
          }

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
