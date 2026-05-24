import { Response } from "express";
import { Types } from "mongoose";
import { getDataDataFromToken, getTokenFromRequest } from "../utils/utils";
import { BaseResponseDTO } from "../data/types/dto/common.dto";
import {
  CreateInventoryAdjustmentRequestDTO,
  CreateInventoryInitialSetupRequestDTO,
  GetInventoryAdjustmentsByProductRequestDTO,
  GetInventoryAdjustmentsByVariantRequestDTO,
  GetInventoryByProductRequestDTO,
  GetInventoryListRequestDTO,
  GetInventoryReservationsListRequestDTO,
  InventoryAdjustmentsResponseDTO,
  InventoryReservationsResponseDTO,
  InventoryResponseDTO,
  InventoriesResponseDTO,
  PatchInventoryVariantSettingsRequestDTO,
} from "../data/types/dto/inventory.dto";
import {
  INVENTORY_ADJUSTMENT_TYPES,
  INVENTORY_STATUSES,
  PRODUCT_STATUSES,
  RESERVATION_TYPES,
} from "../data/enums";
import InventoryService from "../services/inventory.service";

const MIN_LIMIT = 10;
const MAX_LIMIT = 100;

class InventoryController {
  async getList(req: GetInventoryListRequestDTO, res: Response<InventoriesResponseDTO | BaseResponseDTO>) {
    try {
      const page = Math.max(parseInt(req.query.page ?? "1", 10), 1);
      const limit = Math.min(Math.max(parseInt(req.query.limit ?? `${MIN_LIMIT}`, 10), MIN_LIMIT), MAX_LIMIT);
      const skip = (page - 1) * limit;

      const manufacturers = Array.isArray(req.query.manufacturer)
        ? req.query.manufacturer
        : req.query.manufacturer
          ? [req.query.manufacturer]
          : [];
      const productStatus = (Array.isArray(req.query.productStatus)
        ? req.query.productStatus
        : req.query.productStatus
          ? [req.query.productStatus]
          : []
      ).filter((status): status is PRODUCT_STATUSES => Object.values(PRODUCT_STATUSES).includes(status as PRODUCT_STATUSES));
      const inventoryStatus = (Array.isArray(req.query.inventoryStatus)
        ? req.query.inventoryStatus
        : req.query.inventoryStatus
          ? [req.query.inventoryStatus]
          : []
      ).filter((status): status is INVENTORY_STATUSES => Object.values(INVENTORY_STATUSES).includes(status as INVENTORY_STATUSES));
      const sortField =
        req.query.sortField && ["updatedOn", "inventoryStatus", "product.name", "manufacturer"].includes(req.query.sortField)
          ? req.query.sortField
          : "updatedOn";
      const sortOrder = req.query.sortOrder === "asc" ? "asc" : "desc";

      const { inventories, total } = await InventoryService.getList(
        {
          search: req.query.search ?? "",
          manufacturers,
          productStatus,
          inventoryStatus,
        },
        {
          sortField: sortField as "updatedOn" | "inventoryStatus" | "product.name" | "manufacturer",
          sortOrder,
        },
        { skip, limit },
      );

      return res.status(200).json({
        Inventories: inventories as any,
        total,
        page,
        limit,
        search: req.query.search ?? "",
        manufacturer: manufacturers,
        productStatus,
        inventoryStatus,
        sorting: {
          sortField: sortField as "updatedOn" | "inventoryStatus" | "product.name" | "manufacturer",
          sortOrder,
        },
        IsSuccess: true,
        ErrorMessage: null,
      });
    } catch (e: any) {
      return res.status(500).json({ IsSuccess: false, ErrorMessage: e.message });
    }
  }

  async getByProductId(req: GetInventoryByProductRequestDTO, res: Response<InventoryResponseDTO | BaseResponseDTO>) {
    try {
      const productId = new Types.ObjectId(req.params.productId);
      const inventory = await InventoryService.getByProductId(productId);
      return res.status(200).json({ Inventory: inventory as any, IsSuccess: true, ErrorMessage: null });
    } catch (e: any) {
      const statusCode = typeof e?.statusCode === "number" ? e.statusCode : 500;
      return res.status(statusCode).json({ IsSuccess: false, ErrorMessage: e.message });
    }
  }

  async createAdjustment(
    req: CreateInventoryAdjustmentRequestDTO,
    res: Response<InventoryResponseDTO | BaseResponseDTO>,
  ) {
    try {
      const managerData = getDataDataFromToken(getTokenFromRequest(req as any));
      const updatedInventory = await InventoryService.adjustStock(
        {
          productId: new Types.ObjectId(req.body.productId),
          variantId: new Types.ObjectId(req.body.variantId),
          type: req.body.type as
            | INVENTORY_ADJUSTMENT_TYPES.MANUAL_CORRECTION
            | INVENTORY_ADJUSTMENT_TYPES.STOCK_RECEIPT,
          quantity: req.body.quantity,
          comment: req.body.comment,
        },
        managerData.id,
      );

      return res.status(200).json({ Inventory: updatedInventory as any, IsSuccess: true, ErrorMessage: null });
    } catch (e: any) {
      const statusCode = typeof e?.statusCode === "number" ? e.statusCode : 500;
      return res.status(statusCode).json({ IsSuccess: false, ErrorMessage: e.message });
    }
  }

  async patchVariantSettings(
    req: PatchInventoryVariantSettingsRequestDTO,
    res: Response<InventoryResponseDTO | BaseResponseDTO>,
  ) {
    try {
      const updated = await InventoryService.updateVariantSettings(
        new Types.ObjectId(req.params.productId),
        new Types.ObjectId(req.params.variantId),
        {
          lowStockThreshold: req.body.lowStockThreshold,
          allowSellingOutOfStock: req.body.allowSellingOutOfStock,
        },
      );
      return res.status(200).json({ Inventory: updated as any, IsSuccess: true, ErrorMessage: null });
    } catch (e: any) {
      const statusCode = typeof e?.statusCode === "number" ? e.statusCode : 500;
      return res.status(statusCode).json({ IsSuccess: false, ErrorMessage: e.message });
    }
  }

  async createInitialSetup(
    req: CreateInventoryInitialSetupRequestDTO,
    res: Response<InventoryResponseDTO | BaseResponseDTO>,
  ) {
    try {
      const updated = await InventoryService.createInitialSetup(new Types.ObjectId(req.params.productId), req.body);
      return res.status(200).json({ Inventory: updated as any, IsSuccess: true, ErrorMessage: null });
    } catch (e: any) {
      const statusCode = typeof e?.statusCode === "number" ? e.statusCode : 500;
      return res.status(statusCode).json({ IsSuccess: false, ErrorMessage: e.message });
    }
  }

  async getProductAdjustments(
    req: GetInventoryAdjustmentsByProductRequestDTO,
    res: Response<InventoryAdjustmentsResponseDTO | BaseResponseDTO>,
  ) {
    try {
      const page = Math.max(parseInt(req.query.page ?? "1", 10), 1);
      const limit = Math.min(Math.max(parseInt(req.query.limit ?? `${MIN_LIMIT}`, 10), MIN_LIMIT), MAX_LIMIT);
      const sortOrder = req.query.sortOrder === "asc" ? "asc" : "desc";
      const typeFilter = (Array.isArray(req.query.type) ? req.query.type : req.query.type ? [req.query.type] : []).filter(
        (type): type is INVENTORY_ADJUSTMENT_TYPES => Object.values(INVENTORY_ADJUSTMENT_TYPES).includes(type as INVENTORY_ADJUSTMENT_TYPES),
      );

      const { adjustments, total } = await InventoryService.getAdjustmentsByProduct(
        new Types.ObjectId(req.params.productId),
        {
          page,
          limit,
          sortOrder,
          type: typeFilter,
          orderId: req.query.orderId,
          reservationId: req.query.reservationId,
          createdBy: req.query.createdBy,
          fromDate: req.query.fromDate,
          toDate: req.query.toDate,
        },
      );

      return res.status(200).json({
        Adjustments: adjustments as any,
        total,
        page,
        limit,
        sortOrder,
        IsSuccess: true,
        ErrorMessage: null,
      });
    } catch (e: any) {
      const statusCode = typeof e?.statusCode === "number" ? e.statusCode : 500;
      return res.status(statusCode).json({ IsSuccess: false, ErrorMessage: e.message });
    }
  }

  async getVariantAdjustments(
    req: GetInventoryAdjustmentsByVariantRequestDTO,
    res: Response<InventoryAdjustmentsResponseDTO | BaseResponseDTO>,
  ) {
    try {
      const page = Math.max(parseInt(req.query.page ?? "1", 10), 1);
      const limit = Math.min(Math.max(parseInt(req.query.limit ?? `${MIN_LIMIT}`, 10), MIN_LIMIT), MAX_LIMIT);
      const sortOrder = req.query.sortOrder === "asc" ? "asc" : "desc";
      const typeFilter = (Array.isArray(req.query.type) ? req.query.type : req.query.type ? [req.query.type] : []).filter(
        (type): type is INVENTORY_ADJUSTMENT_TYPES => Object.values(INVENTORY_ADJUSTMENT_TYPES).includes(type as INVENTORY_ADJUSTMENT_TYPES),
      );

      const { adjustments, total } = await InventoryService.getAdjustmentsByVariant(
        new Types.ObjectId(req.params.productId),
        new Types.ObjectId(req.params.variantId),
        {
          page,
          limit,
          sortOrder,
          type: typeFilter,
          orderId: req.query.orderId,
          reservationId: req.query.reservationId,
          createdBy: req.query.createdBy,
          fromDate: req.query.fromDate,
          toDate: req.query.toDate,
        },
      );

      return res.status(200).json({
        Adjustments: adjustments as any,
        total,
        page,
        limit,
        sortOrder,
        IsSuccess: true,
        ErrorMessage: null,
      });
    } catch (e: any) {
      const statusCode = typeof e?.statusCode === "number" ? e.statusCode : 500;
      return res.status(statusCode).json({ IsSuccess: false, ErrorMessage: e.message });
    }
  }

  async getReservationsList(
    req: GetInventoryReservationsListRequestDTO,
    res: Response<InventoryReservationsResponseDTO | BaseResponseDTO>,
  ) {
    try {
      const page = Math.max(parseInt(req.query.page ?? "1", 10), 1);
      const limit = Math.min(Math.max(parseInt(req.query.limit ?? `${MIN_LIMIT}`, 10), MIN_LIMIT), MAX_LIMIT);
      const sortField =
        req.query.sortField && ["createdOn", "expiresAt"].includes(req.query.sortField)
          ? req.query.sortField
          : "createdOn";
      const sortOrder = req.query.sortOrder === "asc" ? "asc" : "desc";
      const typeFilter = (Array.isArray(req.query.type) ? req.query.type : req.query.type ? [req.query.type] : []).filter(
        (type): type is RESERVATION_TYPES => Object.values(RESERVATION_TYPES).includes(type as RESERVATION_TYPES),
      );

      const { reservations, summary, total } = await InventoryService.getReservations({
        search: req.query.search ?? "",
        type: typeFilter,
        fromDate: req.query.fromDate,
        toDate: req.query.toDate,
        expiresBefore: req.query.expiresBefore,
        page,
        limit,
        sortField: sortField as "createdOn" | "expiresAt",
        sortOrder,
      });

      return res.status(200).json({
        Reservations: reservations as any,
        summary,
        total,
        page,
        limit,
        search: req.query.search ?? "",
        type: typeFilter,
        fromDate: req.query.fromDate ?? "",
        toDate: req.query.toDate ?? "",
        expiresBefore: req.query.expiresBefore ?? "",
        sorting: {
          sortField: sortField as "createdOn" | "expiresAt",
          sortOrder,
        },
        IsSuccess: true,
        ErrorMessage: null,
      });
    } catch (e: any) {
      const statusCode = typeof e?.statusCode === "number" ? e.statusCode : 500;
      return res.status(statusCode).json({ IsSuccess: false, ErrorMessage: e.message });
    }
  }
}

export default new InventoryController();
