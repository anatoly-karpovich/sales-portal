import mongoose, { ClientSession, Types } from "mongoose";
import {
  INVENTORY_ADJUSTMENT_TYPES,
  INVENTORY_RECORD_STATUSES,
  INVENTORY_STATUSES,
  ORDER_HISTORY_ACTIONS,
  ORDER_STATUSES,
  PRODUCT_STATUSES,
  RESERVATION_STATUSES,
  RESERVATION_TYPES,
  ROLES,
} from "../data/enums";
import type {
  IInventory,
  IInventoryAdjustment,
  IInventoryVariant,
  IProduct,
  IReservation,
  IReservationItem,
} from "../data/types";
import { getTodaysDate, createHistoryEntry } from "../utils/utils";
import Inventory from "../models/inventory.model";
import InventoryAdjustment from "../models/inventoryAdjustment.model";
import Reservation from "../models/reservation.model";
import Product from "../models/product.model";
import Order from "../models/order.model";
import Manager from "../models/manager.model";
import { SettingsService } from "./settings.service";

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

class InventoryService {
  private settingsService = new SettingsService();

  private getNowString() {
    return getTodaysDate(true);
  }

  private toInventoryRecordStatus(productVariantStatus: PRODUCT_STATUSES): INVENTORY_RECORD_STATUSES {
    return productVariantStatus === PRODUCT_STATUSES.ARCHIVED
      ? INVENTORY_RECORD_STATUSES.ARCHIVED
      : INVENTORY_RECORD_STATUSES.ACTIVE;
  }

  recalculateVariantStatus(variant: Pick<IInventoryVariant, "status" | "allowSellingOutOfStock" | "available" | "lowStockThreshold">): INVENTORY_STATUSES {
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

  private recalculateInventoryStatus(variants: IInventoryVariant[]): INVENTORY_STATUSES {
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

  private recalculateSummary(variants: IInventoryVariant[]) {
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

  async recalculateInventorySummary(inventoryId: Types.ObjectId, session?: ClientSession): Promise<IInventory | undefined> {
    const inventory = await Inventory.findById(inventoryId).session(session ?? null).lean().exec();
    if (!inventory) {
      return undefined;
    }

    const variants = (inventory.variants ?? []).map((variant: any) => {
      const available = variant.quantity - variant.reserved;
      const status = this.recalculateVariantStatus({
        status: variant.status,
        allowSellingOutOfStock: variant.allowSellingOutOfStock,
        available,
        lowStockThreshold: variant.lowStockThreshold,
      });
      return {
        ...variant,
        available,
        stockStatus: status,
      } as IInventoryVariant;
    });

    const summary = this.recalculateSummary(variants);
    const updated = await Inventory.findByIdAndUpdate(
      inventoryId,
      {
        variants,
        ...summary,
        updatedOn: this.getNowString(),
      },
      { new: true, session },
    )
      .lean()
      .exec();

    return updated as unknown as IInventory;
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

    const variants: IInventoryVariant[] = (product.variants ?? []).map((variant) => {
      const status = this.toInventoryRecordStatus(variant.status);
      const entry: IInventoryVariant = {
        variantId: new Types.ObjectId(variant._id),
        quantity: 0,
        reserved: 0,
        available: 0,
        lowStockThreshold: settings.inventory.defaultLowStockThreshold,
        allowSellingOutOfStock: settings.inventory.allowSellingOutOfStockByDefault,
        stockStatus: INVENTORY_STATUSES.OUT_OF_STOCK,
        status,
        updatedOn: now,
      };
      entry.stockStatus = this.recalculateVariantStatus(entry);
      return entry;
    });

    const summary = this.recalculateSummary(variants);

    const created = await Inventory.create(
      [
        {
          productId: new Types.ObjectId(product._id),
          variants,
          ...summary,
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
        const created: IInventoryVariant = {
          variantId: new Types.ObjectId(variant._id),
          quantity: 0,
          reserved: 0,
          available: 0,
          lowStockThreshold: settings.inventory.defaultLowStockThreshold,
          allowSellingOutOfStock: settings.inventory.allowSellingOutOfStockByDefault,
          stockStatus: INVENTORY_STATUSES.OUT_OF_STOCK,
          status: this.toInventoryRecordStatus(variant.status),
          updatedOn: now,
        };
        created.stockStatus = this.recalculateVariantStatus(created);
        return created;
      }

      const nextVariant: IInventoryVariant = {
        ...existing,
        variantId: new Types.ObjectId(existing.variantId),
        status: this.toInventoryRecordStatus(variant.status),
        available: existing.quantity - existing.reserved,
        updatedOn: now,
      };
      nextVariant.stockStatus = this.recalculateVariantStatus(nextVariant);
      return nextVariant;
    });

    const summary = this.recalculateSummary(nextVariants);

    const updated = await Inventory.findOneAndUpdate(
      { productId },
      {
        variants: nextVariants,
        ...summary,
        updatedOn: now,
      },
      { new: true, session },
    )
      .lean()
      .exec();

    return updated as unknown as IInventory;
  }

  async getByProductId(productId: Types.ObjectId): Promise<IInventory> {
    const product = await Product.findById(productId).lean().exec();
    if (!product) {
      throw createHttpError(`Product with id '${productId.toString()}' wasn't found`, 404);
    }

    const inventory = await Inventory.findOne({ productId }).lean().exec();
    if (!inventory) {
      return this.createForProduct(product as unknown as IProduct);
    }

    return this.syncWithProductVariants(product as unknown as IProduct);
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

    const productIds = products.map((product) => product._id);
    const inventoryFilter: Record<string, unknown> = {
      productId: { $in: productIds },
    };

    if (!filters.includeArchived) {
      inventoryFilter.status = INVENTORY_RECORD_STATUSES.ACTIVE;
    }
    if (filters.inventoryStatus.length > 0) {
      inventoryFilter.inventoryStatus = { $in: filters.inventoryStatus };
    }
    if (filters.lowStockOnly) {
      inventoryFilter.lowStockVariantsCount = { $gt: 0 };
    }
    if (filters.outOfStockOnly) {
      inventoryFilter.outOfStockVariantsCount = { $gt: 0 };
    }

    const sortDirection = sorting.sortOrder === "asc" ? 1 : -1;
    const sort: Record<string, 1 | -1> = { [sorting.sortField]: sortDirection };
    if (sorting.sortField !== "updatedOn") {
      sort.updatedOn = -1;
    }

    const [inventories, total] = await Promise.all([
      Inventory.find(inventoryFilter)
        .sort(sort)
        .skip(pagination.skip)
        .limit(pagination.limit)
        .lean()
        .exec(),
      Inventory.countDocuments(inventoryFilter).exec(),
    ]);

    const productById = new Map(products.map((product) => [product._id.toString(), product]));
    const response = inventories
      .map((inventory: any) => {
        const product = productById.get(inventory.productId.toString());
        if (!product) {
          return null;
        }
        return {
          ...inventory,
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

    return { inventories: response, total };
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

  private async getVariantFromInventory(productId: Types.ObjectId, variantId: Types.ObjectId, session?: ClientSession) {
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
  ): Promise<IInventory> {
    const session = await mongoose.startSession();

    try {
      let inventoryId: Types.ObjectId | null = null;
      await session.withTransaction(async () => {
        const { inventory, variant } = await this.getVariantFromInventory(payload.productId, payload.variantId, session);
        inventoryId = new Types.ObjectId(inventory._id);

        const beforeQuantity = variant.quantity;
        const beforeReserved = variant.reserved;
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

        const afterAvailable = afterQuantity - beforeReserved;
        const nextVariant = {
          ...variant,
          quantity: afterQuantity,
          available: afterAvailable,
          stockStatus: this.recalculateVariantStatus({
            ...variant,
            available: afterAvailable,
          }),
          updatedOn: this.getNowString(),
        };

        const nextVariants = (inventory.variants ?? []).map((item: any) =>
          item.variantId.toString() === payload.variantId.toString() ? nextVariant : item,
        );

        const summary = this.recalculateSummary(nextVariants as IInventoryVariant[]);

        await Inventory.findByIdAndUpdate(
          inventory._id,
          {
            variants: nextVariants,
            ...summary,
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
      return (await Inventory.findById(inventoryId).lean().exec()) as unknown as IInventory;
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
  ): Promise<IInventory> {
    const { inventory, variant } = await this.getVariantFromInventory(productId, variantId);

    const nextVariant = {
      ...variant,
      lowStockThreshold: payload.lowStockThreshold ?? variant.lowStockThreshold,
      allowSellingOutOfStock: payload.allowSellingOutOfStock ?? variant.allowSellingOutOfStock,
      available: variant.quantity - variant.reserved,
      updatedOn: this.getNowString(),
    };
    nextVariant.stockStatus = this.recalculateVariantStatus(nextVariant);

    const nextVariants = (inventory.variants ?? []).map((item: any) =>
      item.variantId.toString() === variantId.toString() ? nextVariant : item,
    );
    const summary = this.recalculateSummary(nextVariants as IInventoryVariant[]);

    const updated = await Inventory.findByIdAndUpdate(
      inventory._id,
      {
        variants: nextVariants,
        ...summary,
        updatedOn: this.getNowString(),
      },
      { new: true },
    )
      .lean()
      .exec();

    return updated as unknown as IInventory;
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

  private async applyReserveForItem(params: {
    productId: Types.ObjectId;
    variantId: Types.ObjectId;
    quantity: number;
    orderId: Types.ObjectId;
    reservationId: Types.ObjectId;
    managerId: Types.ObjectId;
    session: ClientSession;
  }) {
    const { productId, variantId, quantity, orderId, reservationId, managerId, session } = params;

    const inventory = await this.getOrCreateInventoryByProductId(productId, session);
    const beforeVariant = (inventory.variants ?? []).find(
      (variant: any) => variant.variantId.toString() === variantId.toString(),
    );
    if (!beforeVariant) {
      throw createHttpError(`Variant with id '${variantId.toString()}' wasn't found in inventory`, 404);
    }
    if (beforeVariant.status !== INVENTORY_RECORD_STATUSES.ACTIVE) {
      throw createHttpError(`Variant with id '${variantId.toString()}' is not active in inventory`, 400);
    }

    if (!beforeVariant.allowSellingOutOfStock && beforeVariant.available < quantity) {
      throw createHttpError("Not enough stock", 409);
    }

    const beforeReserved = beforeVariant.reserved;
    const beforeQuantity = beforeVariant.quantity;
    const afterReserved = beforeReserved + quantity;
    const afterAvailable = beforeQuantity - afterReserved;

    const nextVariant: IInventoryVariant = {
      ...beforeVariant,
      reserved: afterReserved,
      available: afterAvailable,
      updatedOn: this.getNowString(),
    };
    nextVariant.stockStatus = this.recalculateVariantStatus(nextVariant);

    const nextVariants = (inventory.variants ?? []).map((variant: any) =>
      variant.variantId.toString() === variantId.toString() ? nextVariant : variant,
    );

    const summary = this.recalculateSummary(nextVariants as IInventoryVariant[]);

    await Inventory.findByIdAndUpdate(
      inventory._id,
      {
        variants: nextVariants,
        ...summary,
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
        type: INVENTORY_ADJUSTMENT_TYPES.RESERVE,
        quantityChange: 0,
        quantityBefore: beforeQuantity,
        quantityAfter: beforeQuantity,
        reservedBefore: beforeReserved,
        reservedAfter: afterReserved,
        orderId,
        reservationId,
        createdBy: managerId,
      },
      session,
    );
  }

  private async applyReleaseForItem(params: {
    reservation: IReservation;
    item: IReservationItem;
    managerId: Types.ObjectId;
    adjustmentType: INVENTORY_ADJUSTMENT_TYPES.RELEASE | INVENTORY_ADJUSTMENT_TYPES.EXPIRED_RESERVATION;
    session: ClientSession;
  }) {
    const { reservation, item, managerId, adjustmentType, session } = params;

    const inventory = await Inventory.findOne({ productId: item.productId }).session(session).lean().exec();
    if (!inventory) {
      return;
    }

    const beforeVariant = (inventory.variants ?? []).find(
      (variant: any) => variant.variantId.toString() === item.variantId.toString(),
    );
    if (!beforeVariant) {
      return;
    }

    const beforeReserved = beforeVariant.reserved;
    const beforeQuantity = beforeVariant.quantity;
    const releaseQty = Math.min(item.quantity, beforeReserved);
    const afterReserved = beforeReserved - releaseQty;
    const afterAvailable = beforeQuantity - afterReserved;

    const nextVariant: IInventoryVariant = {
      ...beforeVariant,
      reserved: afterReserved,
      available: afterAvailable,
      updatedOn: this.getNowString(),
    };
    nextVariant.stockStatus = this.recalculateVariantStatus(nextVariant);

    const nextVariants = (inventory.variants ?? []).map((variant: any) =>
      variant.variantId.toString() === item.variantId.toString() ? nextVariant : variant,
    );

    const summary = this.recalculateSummary(nextVariants as IInventoryVariant[]);

    await Inventory.findByIdAndUpdate(
      inventory._id,
      {
        variants: nextVariants,
        ...summary,
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
        type: adjustmentType,
        quantityChange: 0,
        quantityBefore: beforeQuantity,
        quantityAfter: beforeQuantity,
        reservedBefore: beforeReserved,
        reservedAfter: afterReserved,
        orderId: reservation.orderId,
        reservationId: new Types.ObjectId(reservation._id),
        createdBy: managerId,
      },
      session,
    );
  }

  private async getSystemAdminManager(session?: ClientSession) {
    return Manager.findOne({ roles: ROLES.ADMIN })
      .session(session ?? null)
      .select("_id username firstName lastName roles createdOn")
      .lean()
      .exec();
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

    const reservationId = new Types.ObjectId();
    const now = this.getNowString();

    const reservation = await Reservation.create(
      [
        {
          _id: reservationId,
          orderId,
          type: reservationType,
          status: RESERVATION_STATUSES.ACTIVE,
          items,
          expiresAt,
          createdOn: now,
          updatedOn: now,
        },
      ],
      { session },
    );

    for (const item of items) {
      await this.applyReserveForItem({
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
        orderId,
        reservationId,
        managerId: new Types.ObjectId(managerId),
        session,
      });
    }

    return reservation[0].toObject() as unknown as IReservation;
  }

  async releaseReservationByOrder(params: {
    orderId: Types.ObjectId;
    managerId: string;
    session: ClientSession;
    allowedStatuses?: RESERVATION_STATUSES[];
    type?: INVENTORY_ADJUSTMENT_TYPES.RELEASE | INVENTORY_ADJUSTMENT_TYPES.EXPIRED_RESERVATION;
    nextStatus?: RESERVATION_STATUSES;
  }): Promise<IReservation | null> {
    const {
      orderId,
      managerId,
      session,
      allowedStatuses = [RESERVATION_STATUSES.ACTIVE, RESERVATION_STATUSES.COMPLETED],
      type = INVENTORY_ADJUSTMENT_TYPES.RELEASE,
      nextStatus = RESERVATION_STATUSES.RELEASED,
    } = params;

    const reservation = await Reservation.findOneAndUpdate(
      {
        orderId,
        status: { $in: allowedStatuses },
      },
      {
        status: nextStatus,
        updatedOn: this.getNowString(),
      },
      { new: true, session },
    )
      .lean()
      .exec();

    if (!reservation) {
      return null;
    }

    for (const item of reservation.items ?? []) {
      await this.applyReleaseForItem({
        reservation: reservation as unknown as IReservation,
        item,
        managerId: new Types.ObjectId(managerId),
        adjustmentType: type,
        session,
      });
    }

    return reservation as unknown as IReservation;
  }

  async completeReservationByOrder(orderId: Types.ObjectId, session: ClientSession) {
    await Reservation.findOneAndUpdate(
      {
        orderId,
        status: RESERVATION_STATUSES.ACTIVE,
      },
      {
        status: RESERVATION_STATUSES.COMPLETED,
        updatedOn: this.getNowString(),
      },
      { session },
    )
      .lean()
      .exec();
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

      const quantityBefore = beforeVariant.quantity;
      const reservedBefore = beforeVariant.reserved;
      const quantityAfter = quantityBefore - line.quantity;
      const reservedAfter = Math.max(0, reservedBefore - line.quantity);

      if (!beforeVariant.allowSellingOutOfStock && quantityAfter < 0) {
        throw createHttpError("Not enough stock", 409);
      }

      const nextVariant: IInventoryVariant = {
        ...beforeVariant,
        quantity: quantityAfter,
        reserved: reservedAfter,
        available: quantityAfter - reservedAfter,
        updatedOn: this.getNowString(),
      };
      nextVariant.stockStatus = this.recalculateVariantStatus(nextVariant);

      const nextVariants = (inventory.variants ?? []).map((variant: any) =>
        variant.variantId.toString() === line.variantId.toString() ? nextVariant : variant,
      );
      const summary = this.recalculateSummary(nextVariants as IInventoryVariant[]);

      await Inventory.findByIdAndUpdate(
        inventory._id,
        {
          variants: nextVariants,
          ...summary,
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
          reservedBefore,
          reservedAfter,
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
      Reservation.deleteMany({
        items: {
          $elemMatch: {
            productId,
            variantId,
          },
        },
      })
        .session(session ?? null)
        .exec(),
    ]);

    const inventory = await Inventory.findOne({ productId }).session(session ?? null).lean().exec();
    if (inventory) {
      await this.recalculateInventorySummary(new Types.ObjectId(inventory._id), session);
    }
  }

  async expireReservations() {
    const now = new Date();
    const toExpire = await Reservation.find({ status: RESERVATION_STATUSES.ACTIVE, expiresAt: { $lte: now } })
      .select("_id")
      .lean()
      .exec();

    if (!toExpire.length) {
      return { expired: 0 };
    }

    let expired = 0;

    for (const reservationRef of toExpire) {
      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          const systemAdmin = await this.getSystemAdminManager(session);
          if (!systemAdmin?._id) {
            return;
          }

          const reservation = await Reservation.findOneAndUpdate(
            {
              _id: reservationRef._id,
              status: RESERVATION_STATUSES.ACTIVE,
            },
            {
              status: RESERVATION_STATUSES.EXPIRED,
              updatedOn: this.getNowString(),
            },
            { new: true, session },
          )
            .lean()
            .exec();

          if (!reservation) {
            return;
          }

          for (const item of reservation.items ?? []) {
            await this.applyReleaseForItem({
              reservation: reservation as unknown as IReservation,
              item,
              managerId: new Types.ObjectId(systemAdmin._id),
              adjustmentType: INVENTORY_ADJUSTMENT_TYPES.EXPIRED_RESERVATION,
              session,
            });
          }

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
          expired += 1;
        });
      } finally {
        await session.endSession();
      }
    }

    return { expired };
  }
}

export default new InventoryService();
