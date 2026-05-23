import { NextFunction, Response } from "express";
import { Types } from "mongoose";
import {
  INVENTORY_ADJUSTMENT_TYPES,
  INVENTORY_STATUSES,
  PRODUCT_STATUSES,
  RESERVATION_TYPES,
} from "../data/enums";
import { BaseResponseDTO } from "../data/types/dto/common.dto";
import {
  CreateInventoryAdjustmentRequestDTO,
  GetInventoryAdjustmentsByProductRequestDTO,
  GetInventoryAdjustmentsByVariantRequestDTO,
  GetInventoryByProductRequestDTO,
  GetInventoryReservationsListRequestDTO,
  PatchInventoryVariantSettingsRequestDTO,
} from "../data/types/dto/inventory.dto";
import Product from "../models/product.model";

export async function inventoryProductById(
  req: GetInventoryByProductRequestDTO,
  res: Response<BaseResponseDTO>,
  next: NextFunction,
) {
  try {
    const productId = req.params.productId;
    if (!productId || !Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ IsSuccess: false, ErrorMessage: "Incorrect request params" });
    }

    const product = await Product.findById(new Types.ObjectId(productId)).select("_id").lean().exec();
    if (!product) {
      return res.status(404).json({ IsSuccess: false, ErrorMessage: `Product with id '${productId}' wasn't found` });
    }

    next();
  } catch (e: any) {
    return res.status(500).json({ IsSuccess: false, ErrorMessage: e.message });
  }
}

export async function inventoryVariantById(
  req: PatchInventoryVariantSettingsRequestDTO | GetInventoryAdjustmentsByVariantRequestDTO,
  res: Response<BaseResponseDTO>,
  next: NextFunction,
) {
  try {
    const { productId, variantId } = req.params;
    if (!productId || !Types.ObjectId.isValid(productId) || !variantId || !Types.ObjectId.isValid(variantId)) {
      return res.status(400).json({ IsSuccess: false, ErrorMessage: "Incorrect request params" });
    }

    const product = await Product.findById(new Types.ObjectId(productId)).select("variants._id").lean().exec();
    if (!product) {
      return res.status(404).json({ IsSuccess: false, ErrorMessage: `Product with id '${productId}' wasn't found` });
    }

    const exists = (product.variants ?? []).some((variant: any) => variant._id?.toString() === variantId);
    if (!exists) {
      return res
        .status(404)
        .json({ IsSuccess: false, ErrorMessage: `Variant with id '${variantId}' wasn't found in product '${productId}'` });
    }

    next();
  } catch (e: any) {
    return res.status(500).json({ IsSuccess: false, ErrorMessage: e.message });
  }
}

export async function inventoryAdjustmentValidation(
  req: CreateInventoryAdjustmentRequestDTO,
  res: Response<BaseResponseDTO>,
  next: NextFunction,
) {
  try {
    const { productId, variantId, type, quantity } = req.body;
    if (!Types.ObjectId.isValid(productId) || !Types.ObjectId.isValid(variantId)) {
      return res.status(400).json({ IsSuccess: false, ErrorMessage: "Incorrect request body" });
    }
    if (!Object.values(INVENTORY_ADJUSTMENT_TYPES).includes(type)) {
      return res.status(400).json({ IsSuccess: false, ErrorMessage: "Incorrect request body" });
    }
    if (!Number.isInteger(quantity) || quantity < 1) {
      return res.status(400).json({ IsSuccess: false, ErrorMessage: "Incorrect request body" });
    }

    const product = await Product.findById(new Types.ObjectId(productId)).select("variants._id status").lean().exec();
    if (!product) {
      return res.status(404).json({ IsSuccess: false, ErrorMessage: `Product with id '${productId}' wasn't found` });
    }

    if (product.status === PRODUCT_STATUSES.DRAFT) {
      return res.status(409).json({
        IsSuccess: false,
        ErrorMessage: "Manual inventory adjustments are not allowed for draft products",
      });
    }

    const exists = (product.variants ?? []).some((variant: any) => variant._id?.toString() === variantId);
    if (!exists) {
      return res
        .status(404)
        .json({ IsSuccess: false, ErrorMessage: `Variant with id '${variantId}' wasn't found in product '${productId}'` });
    }

    next();
  } catch (e: any) {
    return res.status(500).json({ IsSuccess: false, ErrorMessage: e.message });
  }
}

export function inventoryListValidation(req: any, res: Response<BaseResponseDTO>, next: NextFunction) {
  try {
    const { inventoryStatus, productStatus, sortField } = req.query;
    const statuses = Array.isArray(inventoryStatus) ? inventoryStatus : inventoryStatus ? [inventoryStatus] : [];
    const invalid = statuses.some((status) => !Object.values(INVENTORY_STATUSES).includes(status as INVENTORY_STATUSES));
    if (invalid) {
      return res.status(400).json({ IsSuccess: false, ErrorMessage: "Invalid inventoryStatus filter value" });
    }

    const productStatuses = Array.isArray(productStatus) ? productStatus : productStatus ? [productStatus] : [];
    const invalidProductStatus = productStatuses.some(
      (status) => !Object.values(PRODUCT_STATUSES).includes(status as PRODUCT_STATUSES),
    );
    if (invalidProductStatus) {
      return res.status(400).json({ IsSuccess: false, ErrorMessage: "Invalid productStatus filter value" });
    }

    if (sortField && !["updatedOn", "inventoryStatus", "product.name", "manufacturer"].includes(sortField)) {
      return res.status(400).json({ IsSuccess: false, ErrorMessage: "Invalid sortField value" });
    }

    next();
  } catch (e: any) {
    return res.status(500).json({ IsSuccess: false, ErrorMessage: e.message });
  }
}

export function inventoryAdjustmentsQueryValidation(
  req: GetInventoryAdjustmentsByProductRequestDTO | GetInventoryAdjustmentsByVariantRequestDTO,
  res: Response<BaseResponseDTO>,
  next: NextFunction,
) {
  try {
    const { orderId, reservationId, createdBy } = req.query;
    if (typeof orderId === "string" && orderId.trim() && !Types.ObjectId.isValid(orderId.trim())) {
      return res.status(400).json({ IsSuccess: false, ErrorMessage: "orderId must be a valid ObjectId" });
    }
    if (typeof reservationId === "string" && reservationId.trim() && !Types.ObjectId.isValid(reservationId.trim())) {
      return res.status(400).json({ IsSuccess: false, ErrorMessage: "reservationId must be a valid ObjectId" });
    }
    if (typeof createdBy === "string" && createdBy.trim() && !Types.ObjectId.isValid(createdBy.trim())) {
      return res.status(400).json({ IsSuccess: false, ErrorMessage: "createdBy must be a valid ObjectId" });
    }
    next();
  } catch (e: any) {
    return res.status(500).json({ IsSuccess: false, ErrorMessage: e.message });
  }
}

export function inventoryReservationsListValidation(
  req: GetInventoryReservationsListRequestDTO,
  res: Response<BaseResponseDTO>,
  next: NextFunction,
) {
  try {
    const { type, sortField, sortOrder, fromDate, toDate, expiresBefore } = req.query;
    const types = Array.isArray(type) ? type : type ? [type] : [];
    const invalidType = types.some(
      (value) => !Object.values(RESERVATION_TYPES).includes(value as RESERVATION_TYPES),
    );
    if (invalidType) {
      return res.status(400).json({ IsSuccess: false, ErrorMessage: "Invalid reservation type filter value" });
    }

    if (sortField && !["createdOn", "expiresAt"].includes(sortField)) {
      return res.status(400).json({ IsSuccess: false, ErrorMessage: "Invalid sortField value" });
    }

    if (sortOrder && !["asc", "desc"].includes(sortOrder)) {
      return res.status(400).json({ IsSuccess: false, ErrorMessage: "Invalid sortOrder value" });
    }

    const parseDate = (value: string | undefined) => {
      if (!value || !value.trim()) return null;
      const parsed = new Date(value);
      if (Number.isNaN(parsed.getTime())) return NaN;
      return parsed.getTime();
    };

    const fromMs = parseDate(fromDate);
    const toMs = parseDate(toDate);
    const expiresBeforeMs = parseDate(expiresBefore);

    if (Number.isNaN(fromMs)) {
      return res.status(400).json({ IsSuccess: false, ErrorMessage: "fromDate must be a valid date-time" });
    }

    if (Number.isNaN(toMs)) {
      return res.status(400).json({ IsSuccess: false, ErrorMessage: "toDate must be a valid date-time" });
    }

    if (Number.isNaN(expiresBeforeMs)) {
      return res
        .status(400)
        .json({ IsSuccess: false, ErrorMessage: "expiresBefore must be a valid date-time" });
    }

    if (typeof fromMs === "number" && typeof toMs === "number" && fromMs > toMs) {
      return res.status(400).json({ IsSuccess: false, ErrorMessage: "fromDate cannot be greater than toDate" });
    }

    next();
  } catch (e: any) {
    return res.status(500).json({ IsSuccess: false, ErrorMessage: e.message });
  }
}
