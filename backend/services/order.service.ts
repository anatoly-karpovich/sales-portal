import Order from "../models/order.model";
import Inventory from "../models/inventory.model";
import InventoryAdjustment from "../models/inventoryAdjustment.model";
import Reservation from "../models/reservation.model";
import CustomerService from "./customer.service";
import {
  IOrder,
  IOrderRequest,
  IOrderProductRequestItem,
  IOrderUpdateRequest,
  ICustomer,
  IHistory,
  IOrderCustomerSnapshot,
  IProductInOrder,
  IProductInOrderResponse,
} from "../data/types";
import { Types } from "mongoose";
import mongoose from "mongoose";
import { createHistoryEntry, productsMapping, getTodaysDate } from "../utils/utils";
import {
  DELIVERY,
  DELIVERY_STATUSES,
  NOTIFICATIONS,
  INVENTORY_ADJUSTMENT_TYPES,
  ORDER_HISTORY_ACTIONS,
  ORDER_STATUSES,
  RESERVATION_TYPES,
} from "../data/enums";
import _ from "lodash";
import managersService from "./managers.service";
import { NotificationService } from "./notification.service";
import ExportService from "./export.service";
import {
  InventoryReservationDTO,
  InventoryReservationLineStateDTO,
  InventoryReservationSummaryStateDTO,
  OrderDetailsDTO,
  OrderExportFormatDTO,
  OrderListItemDTO,
} from "../data/types/dto/orders.dto";
import { ICommentAuthor } from "../data/types/comments.type";
import { PricingService } from "./pricing.service";
import { IDeliveryPayload } from "../data/types/delivery.type";
import InventoryService from "./inventory.service";
import { SettingsService } from "./settings.service";

const pricingService = new PricingService();

class OrderService {
  private notificationService = new NotificationService();
  private settingsService = new SettingsService();
  private readonly exportableFields = new Set<string>([
    "status",
    "deliveryStatus",
    "total_price",
    "delivery",
    "customer",
    "products",
    "assignedManager",
    "createdOn",
  ]);

  private buildCustomerSnapshot(customer: ICustomer): IOrderCustomerSnapshot {
    return {
      _id: new Types.ObjectId(customer._id),
      email: customer.email,
      name: customer.name,
    };
  }

  private async getDraftReservationExpiryDate(): Promise<Date> {
    const settings = await this.settingsService.get();
    const ttlMs = settings?.reservations?.adminDraftReservationTtlMs ?? 24 * 60 * 60 * 1000;
    return new Date(Date.now() + ttlMs);
  }

  private createHttpError(message: string, statusCode: number): Error & { statusCode: number } {
    const error = new Error(message) as Error & { statusCode: number };
    error.statusCode = statusCode;
    return error;
  }

  private toReservationLineState(params: {
    orderedQuantity: number;
    reservedQuantity: number;
    directOrderQuantity: number;
    allowSellingOutOfStock: boolean | undefined;
  }): InventoryReservationLineStateDTO {
    const { orderedQuantity, reservedQuantity, directOrderQuantity, allowSellingOutOfStock } = params;

    if (reservedQuantity === orderedQuantity && orderedQuantity > 0) {
      return "Fully Reserved";
    }
    if (reservedQuantity > 0 && reservedQuantity < orderedQuantity) {
      return "Partially Reserved";
    }
    if (reservedQuantity === 0 && directOrderQuantity > 0) {
      return allowSellingOutOfStock ? "Direct Order" : "No Active Lock";
    }
    return "No Active Lock";
  }

  private toReservationSummaryState(params: {
    status: ORDER_STATUSES;
    hasActiveReservation: boolean;
    expiresAt: string | null;
  }): InventoryReservationSummaryStateDTO {
    const { status, hasActiveReservation, expiresAt } = params;

    if (hasActiveReservation) {
      return expiresAt ? "Temporary Lock" : "Processing Lock";
    }
    if (status === ORDER_STATUSES.COMPLETED) {
      return "Consumed";
    }
    if (status === ORDER_STATUSES.CANCELED) {
      return "Released";
    }
    return "No Active Lock";
  }

  private toIsoDateString(value: unknown): string | null {
    if (!value) {
      return null;
    }
    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? null : value.toISOString();
    }
    const parsed = new Date(value as string);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }

  private async getAllowSellingOutOfStockByLine(products: IProductInOrder[]): Promise<Map<string, boolean>> {
    const productIds = [
      ...new Set(products.map((item) => item.productId?.toString()).filter((value): value is string => Boolean(value))),
    ].map((value) => new Types.ObjectId(value));

    if (productIds.length === 0) {
      return new Map();
    }

    const inventories = await Inventory.find({ productId: { $in: productIds } })
      .select("productId variants.variantId variants.allowSellingOutOfStock")
      .lean()
      .exec();

    const allowByLineKey = new Map<string, boolean>();
    for (const inventory of inventories as Array<{
      productId: Types.ObjectId;
      variants?: Array<{ variantId: Types.ObjectId; allowSellingOutOfStock?: boolean }>;
    }>) {
      const productId = inventory.productId?.toString?.();
      if (!productId) {
        continue;
      }
      for (const variant of inventory.variants ?? []) {
        const variantId = variant.variantId?.toString?.();
        if (!variantId) {
          continue;
        }
        allowByLineKey.set(`${productId}:${variantId}`, Boolean(variant.allowSellingOutOfStock));
      }
    }

    return allowByLineKey;
  }

  private async buildInventoryReservation(
    order: Pick<IOrder, "status" | "products"> & { _id: Types.ObjectId },
  ): Promise<InventoryReservationDTO> {
    const reservation = await Reservation.findOne({ orderId: order._id })
      .select("type items expiresAt")
      .lean()
      .exec();

    const reservationItemsByLine = new Map<string, number>();
    for (const item of (reservation?.items ?? []) as Array<{ productId: Types.ObjectId; variantId: Types.ObjectId; quantity: number }>) {
      const key = `${item.productId.toString()}:${item.variantId.toString()}`;
      reservationItemsByLine.set(key, (reservationItemsByLine.get(key) ?? 0) + Math.max(item.quantity ?? 0, 0));
    }

    const hasActiveReservation = reservationItemsByLine.size > 0;
    const expiresAt = hasActiveReservation ? this.toIsoDateString((reservation as { expiresAt?: unknown } | null)?.expiresAt) : null;
    const summaryState = this.toReservationSummaryState({
      status: order.status,
      hasActiveReservation,
      expiresAt,
    });
    const consumedFromStockByLine =
      summaryState === "Consumed" && !hasActiveReservation
        ? await this.getConsumedFromStockByLine(order._id)
        : new Map<string, number>();
    const allowSellingOutOfStockByLine = await this.getAllowSellingOutOfStockByLine(order.products as IProductInOrder[]);

    const lines = (order.products as IProductInOrder[]).map((line) => {
      const productId = line.productId.toString();
      const variantId = line.variantId.toString();
      const key = `${productId}:${variantId}`;
      const orderedQuantity = Math.max(line.quantity ?? 0, 0);
      const isTerminalWithoutReservation =
        !hasActiveReservation &&
        (summaryState === "Consumed" || summaryState === "Released");
      if (isTerminalWithoutReservation) {
        const consumedFromStock = Math.min(
          Math.max(consumedFromStockByLine.get(key) ?? 0, 0),
          orderedQuantity,
        );
        const directOrderQuantity = summaryState === "Consumed"
          ? Math.max(orderedQuantity - consumedFromStock, 0)
          : 0;
        return {
          productId,
          variantId,
          orderedQuantity,
          reservedQuantity: summaryState === "Consumed" ? consumedFromStock : 0,
          directOrderQuantity,
          state: summaryState,
        };
      }
      const rawReserved = Math.max(reservationItemsByLine.get(key) ?? 0, 0);
      const reservedQuantity = Math.min(rawReserved, orderedQuantity);
      const directOrderQuantity = Math.max(orderedQuantity - reservedQuantity, 0);

      return {
        productId,
        variantId,
        orderedQuantity,
        reservedQuantity,
        directOrderQuantity,
        state: this.toReservationLineState({
          orderedQuantity,
          reservedQuantity,
          directOrderQuantity,
          allowSellingOutOfStock: allowSellingOutOfStockByLine.get(key),
        }),
      };
    });

    return {
      summary: {
        state: summaryState,
        expiresAt,
        type: hasActiveReservation
          ? ((reservation as { type?: "Admin Draft" | "Customer Draft" | "Order Processing" } | null)?.type ?? null)
          : null,
      },
      lines,
    };
  }

  private async getConsumedFromStockByLine(orderId: Types.ObjectId): Promise<Map<string, number>> {
    const saleAdjustments = await InventoryAdjustment.find({
      orderId,
      type: INVENTORY_ADJUSTMENT_TYPES.SALE,
    })
      .select("productId variantId quantityChange")
      .lean()
      .exec();

    const consumedByLine = new Map<string, number>();
    for (const adjustment of saleAdjustments as Array<{
      productId: Types.ObjectId;
      variantId: Types.ObjectId;
      quantityChange: number;
    }>) {
      const key = `${adjustment.productId.toString()}:${adjustment.variantId.toString()}`;
      const consumed = Math.max(-(adjustment.quantityChange ?? 0), 0);
      consumedByLine.set(key, (consumedByLine.get(key) ?? 0) + consumed);
    }

    return consumedByLine;
  }

  private toRequestOrderLine(
    product: Pick<IProductInOrder, "productId" | "variantId" | "quantity">,
  ): IOrderProductRequestItem {
    return {
      productId: new Types.ObjectId(product.productId),
      variantId: new Types.ObjectId(product.variantId),
      quantity: product.quantity,
    };
  }

  private withOverdueDelivery<T extends { status: ORDER_STATUSES; delivery: OrderDetailsDTO["delivery"] }>(order: T): T {
    const overdue = pricingService.isOrderOverdue({
      orderStatus: order.status,
      status: order.delivery.status,
      schedule: order.delivery.schedule,
    });

    return {
      ...order,
      delivery: {
        ...order.delivery,
        isOverdue: overdue.isOverdue,
        overdueByDays: overdue.overdueByDays,
      },
    };
  }

  private async mergeProductsForUpdate(
    currentProducts: IProductInOrder[],
    requestedProducts: IOrderRequest["products"] | undefined,
  ): Promise<IProductInOrder[]> {
    if (!requestedProducts) {
      return currentProducts;
    }

    const currentById = new Map<string, IProductInOrder>(
      currentProducts.map((item) => [`${item.productId.toString()}:${item.variantId.toString()}`, item]),
    );

    const newKeys = requestedProducts
      .map((item) => `${item.productId.toString()}:${item.variantId.toString()}`)
      .filter((key) => !currentById.has(key));

    const freshSnapshots = newKeys.length
      ? await productsMapping({
          products: requestedProducts.filter(
            (item) => !currentById.has(`${item.productId.toString()}:${item.variantId.toString()}`),
          ),
        })
      : [];
    const freshById = new Map<string, IProductInOrder>(
      freshSnapshots.map((item) => [`${item.productId.toString()}:${item.variantId.toString()}`, item]),
    );

    return requestedProducts.map((item) => {
      const idStr = `${item.productId.toString()}:${item.variantId.toString()}`;
      const existing = currentById.get(idStr);
      if (existing) {
        return {
          productId: new Types.ObjectId(existing.productId),
          variantId: new Types.ObjectId(existing.variantId),
          manufacturer: existing.manufacturer,
          unitPrice: existing.unitPrice,
          quantity: item.quantity,
          name: existing.name,
          attributes: existing.attributes,
          received: existing.received,
          imageUrl: existing.imageUrl,
        };
      }
      const fresh = freshById.get(idStr);
      if (!fresh) {
        throw new Error(
          `Variant with id '${item.variantId.toString()}' was not found in product '${item.productId.toString()}'`,
        );
      }
      return {
        ...fresh,
        productId: new Types.ObjectId(item.productId),
        variantId: new Types.ObjectId(item.variantId),
        quantity: item.quantity,
      };
    });
  }

  private buildDefaultDraftDeliveryPayload(customer: Pick<ICustomer, "state" | "city" | "street" | "house" | "apartment" | "zipCode">): IDeliveryPayload {
    return {
      condition: DELIVERY.DELIVERY,
      express: false,
      address: {
        state: customer.state,
        city: customer.city,
        street: customer.street,
        house: customer.house,
        apartment: customer.apartment,
        zipCode: customer.zipCode,
      },
    };
  }

  private async enrichProducts(products: IProductInOrder[]): Promise<IProductInOrderResponse[]> {
    if (!products || products.length === 0) {
      return [];
    }

    return products.map((item) => {
      return {
        product: {
          _id: new Types.ObjectId(item.productId),
          name: item.name,
        },
        variant: {
          _id: new Types.ObjectId(item.variantId),
        },
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        received: item.received,
      };
    });
  }

  async create(order: IOrderRequest, performerdId: string): Promise<OrderDetailsDTO> {
    const session = await mongoose.startSession();

    try {
      const products = await productsMapping(order);
      const performer = await managersService.getManager(performerdId);
      const customer = await CustomerService.getCustomer(order.customer);
      const customerSnapshot = this.buildCustomerSnapshot(customer);
      const defaultDelivery = this.buildDefaultDraftDeliveryPayload(customer);
      const prices = await pricingService.calculateOrderTotals({ products, delivery: defaultDelivery });

      if (!prices.deliverySnapshot) {
        throw new Error("Failed to build default delivery snapshot");
      }

      const orderId = new Types.ObjectId();
      const newOrder: IOrder<IOrderCustomerSnapshot> = {
        _id: orderId,
        status: ORDER_STATUSES.DRAFT,
        customer: customerSnapshot,
        products,
        delivery: {
          ...prices.deliverySnapshot,
          status: DELIVERY_STATUSES.DRAFT,
        },
        total_price: prices.totalPrice,
        createdOn: getTodaysDate(true),
        history: [],
        comments: [],
        assignedManager: null,
      };

      newOrder.history.unshift(
        createHistoryEntry(newOrder, ORDER_HISTORY_ACTIONS.CREATED, performer),
      );

      await session.withTransaction(async () => {
        await Order.create([newOrder], { session });
        await InventoryService.reserveItems({
          orderId,
          items: order.products.map((item) => ({
            productId: new Types.ObjectId(item.productId),
            variantId: new Types.ObjectId(item.variantId),
            quantity: item.quantity,
          })),
          reservationType: RESERVATION_TYPES.ADMIN_DRAFT,
          managerId: performerdId,
          expiresAt: await this.getDraftReservationExpiryDate(),
          session,
        });
      });

      await this.notificationService.create({
        managerId: performerdId,
        orderId: orderId.toString(),
        type: "newOrder",
        message: NOTIFICATIONS.newOrder(orderId.toString()),
      });

      return this.getOrder(orderId);
    } finally {
      await session.endSession();
    }
  }

  async getAll(): Promise<OrderListItemDTO[]> {
    const orders = await Order.find().lean().exec();
    const reversed = orders.reverse() as unknown as IOrder<IOrderCustomerSnapshot>[];
    return Promise.all(
      reversed.map(async (o) =>
        this.withOverdueDelivery({
          ...o,
          products: await this.enrichProducts(o.products as IProductInOrder[]),
        }),
      ),
    );
  }

  async getSorted(
    filters: { search?: string; status?: string[]; deliveryStatus?: string[] },
    sortOptions: { sortField: string; sortOrder: string },
    pagination: { skip: number; limit: number },
    projectionFields?: string[],
    includeOverdue: boolean = true,
  ): Promise<{ orders: OrderListItemDTO[]; total: number }> {
    const { search = "", status = [], deliveryStatus = [] } = filters;
    const { skip, limit } = pagination;

    const filter: Record<string, unknown> = {};

    if (status.length > 0) {
      filter.status = { $in: status };
    }
    if (deliveryStatus.length > 0) {
      filter["delivery.status"] = { $in: deliveryStatus };
    }

    if (search.trim() !== "") {
      const searchRegex = new RegExp(search, "i");
      const searchNumber = parseFloat(search);
      const searchConditions: Record<string, unknown>[] = [
        { "customer.name": { $regex: searchRegex } },
        { "customer.email": { $regex: searchRegex } },
        { status: { $regex: searchRegex } },
        { "delivery.status": { $regex: searchRegex } },
      ];

      if (Types.ObjectId.isValid(search.trim())) {
        searchConditions.push({ _id: new Types.ObjectId(search.trim()) });
      }

      if (!isNaN(searchNumber)) {
        searchConditions.push({ total_price: searchNumber });
      }

      filter.$or = searchConditions;
    }

    const allowedSortFields = new Set(["createdOn", "total_price", "status"]);
    const sortField = allowedSortFields.has(sortOptions.sortField) ? sortOptions.sortField : "createdOn";
    const sortOrder = sortOptions.sortOrder === "asc" ? 1 : -1;
    const sort: Record<string, 1 | -1> = { [sortField]: sortOrder };
    if (sortField !== "createdOn") {
      sort.createdOn = sortOrder;
    }

    const listQuery = Order.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .collation({ locale: "en", strength: 2 })
      .lean();

    if (projectionFields && projectionFields.length > 0) {
      listQuery.select(projectionFields.join(" "));
    } else {
      listQuery.select("-history -comments");
    }

    const [orders, total] = await Promise.all([listQuery.exec(), Order.countDocuments(filter).exec()]);

    const dbOrders = orders as unknown as IOrder<IOrderCustomerSnapshot>[];
    const enriched = await this.enrichOrdersList(dbOrders);
    const ordersWithOverdue = includeOverdue
      ? enriched.map((order) => this.withOverdueDelivery(order))
      : enriched;
    return { orders: ordersWithOverdue, total };
  }

  private async enrichOrdersList(orders: IOrder<IOrderCustomerSnapshot>[]): Promise<OrderListItemDTO[]> {
    if (orders.length === 0) {
      return [];
    }
    const allProducts = orders.flatMap((order) => (order.products ?? []) as IProductInOrder[]);
    const enrichedFlat = await this.enrichProducts(allProducts);
    let cursor = 0;
    return orders.map((order) => {
      const len = (order.products ?? []).length;
      const slice = enrichedFlat.slice(cursor, cursor + len);
      cursor += len;
      return { ...order, products: slice };
    });
  }

  async exportOrders(params: {
    format: OrderExportFormatDTO;
    fields: string[];
    filters?: {
      search?: string;
      status?: string[];
      deliveryStatus?: string[];
      page?: number;
      limit?: number;
      sortField?: "createdOn" | "total_price" | "status";
      sortOrder?: "asc" | "desc";
    } | null;
  }): Promise<{ fileName: string; contentType: string; content: string }> {
    const { format, fields, filters } = params;

    if (!["csv", "json"].includes(format)) {
      throw new Error("EXPORT_VALIDATION:Invalid export format");
    }

    ExportService.assertSelectedFields(fields, this.exportableFields);

    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 0;
    const pagination =
      typeof page === "number" && typeof limit === "number" && page > 0 && limit > 0
        ? { skip: (page - 1) * limit, limit }
        : { skip: 0, limit: 1000000 };

    const { orders } = await this.getSorted(
      {
        search: filters?.search ?? "",
        status: filters?.status ?? [],
        deliveryStatus: filters?.deliveryStatus ?? [],
      },
      { sortField: filters?.sortField ?? "createdOn", sortOrder: filters?.sortOrder ?? "desc" },
      pagination,
      this.buildExportProjection(fields),
      false,
    );

    const rows = orders.map((order) => this.flattenOrderForExport(order, fields));
    const headers = this.getHeaders(rows);
    const fileName = ExportService.buildFileName("orders-export", format);

    if (format === "json") {
      return {
        fileName,
        contentType: "application/json; charset=utf-8",
        content: JSON.stringify(rows, null, 2),
      };
    }

    return {
      fileName,
      contentType: "text/csv; charset=utf-8",
      content: `\uFEFF${ExportService.toCsv(rows, headers)}`,
    };
  }

  private flattenOrderForExport(order: OrderListItemDTO, fields: string[]): Record<string, unknown> {
    const row: Record<string, unknown> = {};

    fields.forEach((field) => {
      if (field === "customer") {
        row["customer._id"] = order.customer?._id?.toString?.() ?? "";
        row["customer.email"] = order.customer?.email ?? "";
        row["customer.name"] = order.customer?.name ?? "";
        return;
      }

      if (field === "products") {
        const products = Array.isArray(order.products) ? order.products : [];
        products.forEach((item, index) => {
          const base = `products[${index + 1}]`;
          row[`${base}.product._id`] = item?.product?._id?.toString?.() ?? "";
          row[`${base}.variant._id`] = item?.variant?._id?.toString?.() ?? "";
          row[`${base}.product.name`] = item?.product?.name ?? "";
          row[`${base}.unitPrice`] = typeof item?.unitPrice === "number" ? item.unitPrice : "";
          row[`${base}.quantity`] = typeof item?.quantity === "number" ? item.quantity : "";
          row[`${base}.received`] = typeof item?.received === "boolean" ? item.received : "";
        });
        return;
      }

      if (field === "delivery") {
        row["delivery.condition"] = order.delivery?.condition ?? "";
        row["delivery.schedule.estimatedDate"] =
          order.delivery?.schedule && "estimatedDate" in order.delivery.schedule ? order.delivery.schedule.estimatedDate : "";
        row["delivery.schedule.estimatedDays"] =
          order.delivery?.schedule && "estimatedDays" in order.delivery.schedule ? order.delivery.schedule.estimatedDays : "";
        row["delivery.schedule.startsAt"] =
          order.delivery?.schedule && "startsAt" in order.delivery.schedule ? order.delivery.schedule.startsAt : "";
        row["delivery.schedule.dueDate"] =
          order.delivery?.schedule && "dueDate" in order.delivery.schedule ? order.delivery.schedule.dueDate : "";
        row["delivery.schedule.readyInDays"] =
          order.delivery?.schedule && "readyInDays" in order.delivery.schedule ? order.delivery.schedule.readyInDays : "";
        row["delivery.schedule.holdForDays"] =
          order.delivery?.schedule && "holdForDays" in order.delivery.schedule ? order.delivery.schedule.holdForDays : "";
        row["delivery.schedule.availableFromDate"] =
          order.delivery?.schedule && "availableFromDate" in order.delivery.schedule
            ? order.delivery.schedule.availableFromDate
            : "";
        row["delivery.schedule.pickupByDate"] =
          order.delivery?.schedule && "pickupByDate" in order.delivery.schedule ? order.delivery.schedule.pickupByDate : "";
        row["delivery.schedule.express"] =
          order.delivery?.schedule && "express" in order.delivery.schedule ? order.delivery.schedule.express : "";
        row["delivery.pricingTier"] = order.delivery?.pricingTier ?? "";
        row["delivery.price"] = typeof order.delivery?.price === "number" ? order.delivery.price : "";
        row["delivery.address.state"] = order.delivery?.address?.state ?? "";
        row["delivery.address.city"] = order.delivery?.address?.city ?? "";
        row["delivery.address.street"] = order.delivery?.address?.street ?? "";
        row["delivery.address.house"] = order.delivery?.address?.house ?? "";
        row["delivery.address.apartment"] = order.delivery?.address?.apartment ?? "";
        row["delivery.address.zipCode"] = order.delivery?.address?.zipCode ?? "";
        return;
      }

      if (field === "deliveryStatus") {
        row.deliveryStatus = order.delivery?.status ?? "";
        return;
      }

      if (field === "assignedManager") {
        row["assignedManager._id"] = order.assignedManager?._id?.toString?.() ?? "";
        row["assignedManager.firstName"] = order.assignedManager?.firstName ?? "";
        row["assignedManager.lastName"] = order.assignedManager?.lastName ?? "";
        return;
      }

      // TODO(types): avoid generic index cast by using a typed export-field map.
      row[field] = (order as unknown as Record<string, unknown>)[field] ?? "";
    });

    return row;
  }

  private getHeaders(rows: Record<string, unknown>[]): string[] {
    const headers: string[] = [];
    rows.forEach((row) => {
      Object.keys(row).forEach((key) => {
        if (!headers.includes(key)) headers.push(key);
      });
    });
    return headers;
  }

  private buildExportProjection(fields: string[]): string[] {
    const projection = new Set<string>();

    fields.forEach((field) => {
      switch (field) {
        case "customer":
          projection.add("customer");
          break;
        case "products":
          projection.add("products");
          break;
        case "delivery":
          projection.add("delivery");
          break;
        case "assignedManager":
          projection.add("assignedManager");
          break;
        case "status":
        case "deliveryStatus":
          projection.add("delivery.status");
          break;
        case "total_price":
        case "createdOn":
          projection.add(field);
          break;
      }
    });

    return [...projection];
  }

  async getOrder(id: Types.ObjectId): Promise<OrderDetailsDTO> {
    if (!id) {
      throw new Error("Id was not provided");
    }
    const orderFromDB = await Order.findById(id).lean().exec();
    if (!orderFromDB) {
      return undefined;
    }
    const customer = await CustomerService.getCustomer(orderFromDB.customer._id);
    const products = (orderFromDB.products as unknown as IProductInOrder[]).map((item) => ({ ...item }));
    const inventoryReservation = await this.buildInventoryReservation({
      _id: new Types.ObjectId(orderFromDB._id),
      status: orderFromDB.status as ORDER_STATUSES,
      products,
    });
    const authorIds = [
      ...new Set(
        (orderFromDB.comments ?? [])
          .map((comment) => {
            const createdBy = comment.createdBy;
            if (!createdBy) return null;
            return createdBy.toString();
          })
          .filter((value): value is string => Boolean(value)),
      ),
    ];

    const authors = await managersService.getManagersByIds(authorIds);
    const authorById = new Map<string, ICommentAuthor>(
      authors.map((author) => [
        author._id.toString(),
        {
          _id: author._id,
          username: author.username,
          firstName: author.firstName,
          lastName: author.lastName,
        },
      ]),
    );

    const commentsWithResolvedAuthors = (orderFromDB.comments ?? []).map((comment) => {
      const createdBy = comment.createdBy;
      if (!createdBy) {
        return comment;
      }

      const resolvedAuthor = authorById.get(createdBy.toString());
      if (!resolvedAuthor) {
        return comment;
      }

      return { ...comment, createdBy: resolvedAuthor };
    });

    return this.withOverdueDelivery({
      ...(orderFromDB as unknown as IOrder<IOrderCustomerSnapshot>),
      customer,
      products,
      comments: commentsWithResolvedAuthors,
      inventoryReservation,
    } as unknown as OrderDetailsDTO);
  }

  async update(
    orderId: Types.ObjectId,
    order: IOrderUpdateRequest,
    performerId: string,
    currentOrder: OrderDetailsDTO,
  ): Promise<OrderDetailsDTO> {
    const session = await mongoose.startSession();
    try {
      const nextCustomer = order.customer
        ? await CustomerService.getCustomer(order.customer)
        : (currentOrder.customer as ICustomer);

      const currentProducts: IProductInOrder[] = currentOrder.products.map((item) => ({ ...item }));
      const nextProducts: IProductInOrder[] = await this.mergeProductsForUpdate(currentProducts, order.products);

      const manager = await managersService.getManager(performerId);
      const customerSnapshot = this.buildCustomerSnapshot(nextCustomer);
      const isCustomerChanged = Boolean(
        order.customer && !_.isEqual(order.customer.toString(), currentOrder.customer._id.toString()),
      );

      let nextDelivery = currentOrder.delivery;
      let totalPrice = 0;

      if (isCustomerChanged) {
        const defaultDeliveryPayload = this.buildDefaultDraftDeliveryPayload(nextCustomer);
        const pricesWithDraftDelivery = await pricingService.calculateOrderTotals({
          products: nextProducts,
          delivery: defaultDeliveryPayload,
        });

        if (!pricesWithDraftDelivery.deliverySnapshot) {
          throw new Error("Failed to build default delivery snapshot");
        }

        nextDelivery = {
          ...pricesWithDraftDelivery.deliverySnapshot,
          status: DELIVERY_STATUSES.DRAFT,
        };
        totalPrice = pricesWithDraftDelivery.totalPrice;
      } else {
        const currentLinesCount = currentProducts.length;
        const nextLinesCount = nextProducts.length;

        if (currentLinesCount !== nextLinesCount) {
          const recalculatedDeliveryPrice = pricingService.recalculateDeliveryPriceByLines({
            currentDelivery: currentOrder.delivery,
            currentLinesCount,
            nextLinesCount,
          });

          nextDelivery = {
            ...currentOrder.delivery,
            price: recalculatedDeliveryPrice,
          };
        }

        const pricesWithoutDelivery = await pricingService.calculateOrderTotals({ products: nextProducts });
        totalPrice = pricesWithoutDelivery.productsSubtotal + nextDelivery.price;
      }

      const newOrder: IOrder<IOrderCustomerSnapshot> = {
        _id: orderId,
        status: ORDER_STATUSES.DRAFT,
        customer: customerSnapshot,
        products: nextProducts,
        delivery: nextDelivery,
        total_price: totalPrice,
        history: currentOrder.history,
        createdOn: currentOrder.createdOn,
        comments: currentOrder.comments,
        assignedManager: currentOrder.assignedManager,
      };

      const changed = { products: false, customer: false };
      const nextHistoryProducts = nextProducts.map((item) => ({ ...item }));
      const currentHistoryProducts = currentOrder.products.map((item) => ({ ...item }));

      if (order.products) {
        const requested = order.products.map((item) => ({
          productId: item.productId.toString(),
          variantId: item.variantId.toString(),
          quantity: item.quantity,
        }));
        const currentTuples = currentProducts.map((item) => ({
          productId: item.productId.toString(),
          variantId: item.variantId.toString(),
          quantity: item.quantity,
        }));
        if (!_.isEqual(requested, currentTuples)) {
          changed.products = true;
          const historyEntrySource = {
            ..._.cloneDeep(newOrder),
            products: nextHistoryProducts,
            customer: this.buildCustomerSnapshot(currentOrder.customer as ICustomer),
          };
          newOrder.history.unshift(
            createHistoryEntry(historyEntrySource, ORDER_HISTORY_ACTIONS.REQUIRED_PRODUCTS_CHANGED, manager),
          );
        }
      }

      if (isCustomerChanged) {
        changed.customer = true;
        const historyEntrySource = {
          ..._.cloneDeep(newOrder),
          products: currentHistoryProducts,
        };
        newOrder.history.unshift(createHistoryEntry(historyEntrySource, ORDER_HISTORY_ACTIONS.CUSTOMER_CHANGED, manager));
      }

      await session.withTransaction(async () => {
        if (changed.products) {
          await InventoryService.releaseReservationByOrder({
            orderId,
            managerId: performerId,
            session,
          });
          await InventoryService.reserveItems({
            orderId,
            items: nextProducts.map((item) => ({
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

        const updatedOrder = await Order.findByIdAndUpdate(orderId, newOrder, { new: true, session }).lean().exec();
        if (!updatedOrder) {
          throw new Error("Order not found");
        }
      });

      const updatedOrder = await Order.findById(orderId).lean().exec();
      if (!updatedOrder) {
        throw new Error("Order not found");
      }

      if (updatedOrder.assignedManager) {
        if (changed.products) {
          await this.notificationService.create({
            managerId: updatedOrder.assignedManager._id.toString(),
            orderId: updatedOrder._id.toString(),
            type: "productsChanged",
            message: NOTIFICATIONS.productsChanged(updatedOrder._id.toString()),
          });
        }
        if (changed.customer) {
          await this.notificationService.create({
            managerId: updatedOrder.assignedManager._id.toString(),
            orderId: updatedOrder._id.toString(),
            type: "customerChanged",
            message: NOTIFICATIONS.customerChanged(updatedOrder._id.toString()),
          });
        }
      }

      return this.getOrder(orderId);
    } finally {
      await session.endSession();
    }
  }

  async addProduct(
    orderId: Types.ObjectId,
    product: IOrderProductRequestItem,
    performerId: string,
    currentOrder: OrderDetailsDTO,
  ): Promise<OrderDetailsDTO> {
    const currentProducts = currentOrder.products.map((item) => this.toRequestOrderLine(item));

    const nextKey = `${product.productId.toString()}:${product.variantId.toString()}`;
    const hasDuplicate = currentProducts.some(
      (item) => `${item.productId.toString()}:${item.variantId.toString()}` === nextKey,
    );
    if (hasDuplicate) {
      throw this.createHttpError(
        `Product with Id '${product.productId.toString()}' and variant '${product.variantId.toString()}' is already requested`,
        409,
      );
    }

    return this.update(orderId, { products: [...currentProducts, product] }, performerId, currentOrder);
  }

  async replaceProduct(
    orderId: Types.ObjectId,
    from: Pick<IOrderProductRequestItem, "productId" | "variantId">,
    to: IOrderProductRequestItem,
    performerId: string,
    currentOrder: OrderDetailsDTO,
  ): Promise<OrderDetailsDTO> {
    const currentProducts = currentOrder.products.map((item) => this.toRequestOrderLine(item));

    const fromKey = `${from.productId.toString()}:${from.variantId.toString()}`;
    const replaceIndex = currentProducts.findIndex(
      (item) => `${item.productId.toString()}:${item.variantId.toString()}` === fromKey,
    );
    if (replaceIndex < 0) {
      throw this.createHttpError(
        `Product with Id '${from.productId.toString()}' and variant '${from.variantId.toString()}' is not requested`,
        404,
      );
    }

    const toKey = `${to.productId.toString()}:${to.variantId.toString()}`;
    const duplicateIndex = currentProducts.findIndex(
      (item) => `${item.productId.toString()}:${item.variantId.toString()}` === toKey,
    );
    if (duplicateIndex >= 0 && duplicateIndex !== replaceIndex) {
      throw this.createHttpError(
        `Product with Id '${to.productId.toString()}' and variant '${to.variantId.toString()}' is already requested`,
        409,
      );
    }

    const nextProducts = [...currentProducts];
    nextProducts[replaceIndex] = to;
    return this.update(orderId, { products: nextProducts }, performerId, currentOrder);
  }

  async deleteProduct(
    orderId: Types.ObjectId,
    product: Pick<IOrderProductRequestItem, "productId" | "variantId">,
    performerId: string,
    currentOrder: OrderDetailsDTO,
  ): Promise<OrderDetailsDTO> {
    const currentProducts = currentOrder.products.map((item) => this.toRequestOrderLine(item));

    if (currentProducts.length <= 1) {
      throw this.createHttpError("Cannot delete the last product from order", 400);
    }

    const deleteKey = `${product.productId.toString()}:${product.variantId.toString()}`;
    const nextProducts = currentProducts.filter(
      (item) => `${item.productId.toString()}:${item.variantId.toString()}` !== deleteKey,
    );
    if (nextProducts.length === currentProducts.length) {
      throw this.createHttpError(
        `Product with Id '${product.productId.toString()}' and variant '${product.variantId.toString()}' is not requested`,
        404,
      );
    }

    return this.update(orderId, { products: nextProducts }, performerId, currentOrder);
  }

  async replaceCustomer(
    orderId: Types.ObjectId,
    customerId: Types.ObjectId,
    performerId: string,
    currentOrder: OrderDetailsDTO,
  ): Promise<OrderDetailsDTO> {
    return this.update(orderId, { customer: customerId }, performerId, currentOrder);
  }

  async delete(id: Types.ObjectId): Promise<void> {
    console.log(id);
    if (!id) {
      throw new Error("Id was not provided");
    }
    const order = await Order.findByIdAndDelete(id).lean().exec();
    if (!order) {
      return;
    }
  }

  async getOrdersByCustomer(customerId: string) {
    if (!customerId) {
      throw new Error("Customer ID was not provided");
    }
    const orders = await Order.find({ "customer._id": new Types.ObjectId(customerId) })
      .lean()
      .exec();
    return orders.map(
      (order) =>
        this.withOverdueDelivery(order as unknown as OrderDetailsDTO) as unknown as IOrder<IOrderCustomerSnapshot>,
    );
  }

  async getOrdersByManager(managerId: string) {
    if (!managerId) {
      throw new Error("Manager ID was not provided");
    }

    if (!Types.ObjectId.isValid(managerId)) {
      throw new Error("Invalid Manager ID format");
    }

    const orders = await Order.find({ "assignedManager._id": new Types.ObjectId(managerId) })
      .lean()
      .exec();
    return orders.map((order) => this.withOverdueDelivery(order as unknown as OrderDetailsDTO));
  }

  async assignManager(orderId: string, managerId: string, performerId: string, currentOrder: OrderDetailsDTO) {
    const manager = await managersService.getManager(managerId);
    const performer = await managersService.getManager(performerId);
    const newOrder: OrderDetailsDTO = {
      ...currentOrder,
      assignedManager: manager,
    };

    newOrder.history.unshift(
      createHistoryEntry(
        // TODO(types): align createHistoryEntry input type with order aggregate shape to remove cast.
        newOrder as unknown as Omit<IHistory, "changedOn" | "action" | "performer">,
        ORDER_HISTORY_ACTIONS.MANAGER_ASSIGNED,
        performer,
      ),
    );

    const { inventoryReservation: _inventoryReservation, ...persistedOrder } = newOrder;
    const updatedOrder = await Order.findByIdAndUpdate(new Types.ObjectId(orderId), persistedOrder, { new: true });
    if (!updatedOrder) throw new Error("Order not found");

    await this.notificationService.create({
      managerId: updatedOrder.assignedManager._id.toString(),
      orderId: updatedOrder._id.toString(),
      type: "assigned",
      message: NOTIFICATIONS.assigned(updatedOrder._id.toString()),
    });

    return this.getOrder(updatedOrder._id);
  }

  async unassignManager(orderId: string, performerId: string, currentOrder: OrderDetailsDTO) {
    const previousAssignee = currentOrder.assignedManager;
    const performer = await managersService.getManager(performerId);
    const newOrder: OrderDetailsDTO = {
      ...currentOrder,
      assignedManager: null,
    };

    if (previousAssignee) {
      newOrder.history.unshift(
        createHistoryEntry(
          // TODO(types): align createHistoryEntry input type with order aggregate shape to remove cast.
          newOrder as unknown as Omit<IHistory, "changedOn" | "action" | "performer">,
          ORDER_HISTORY_ACTIONS.MANAGER_UNASSIGNED,
          performer,
        ),
      );
    }

    const { inventoryReservation: _inventoryReservation, ...persistedOrder } = newOrder;
    const updatedOrder = await Order.findByIdAndUpdate(new Types.ObjectId(orderId), persistedOrder, { new: true });
    if (!updatedOrder) throw new Error("Order not found");

    if (previousAssignee) {
      await this.notificationService.create({
        managerId: previousAssignee._id.toString(),
        orderId: updatedOrder._id.toString(),
        type: "unassigned",
        message: NOTIFICATIONS.unassigned(updatedOrder._id.toString()),
      });
    }

    return this.getOrder(updatedOrder._id);
  }
}

export default new OrderService();
