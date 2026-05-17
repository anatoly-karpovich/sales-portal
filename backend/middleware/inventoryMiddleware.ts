import { NextFunction, Response } from "express";
import { Types } from "mongoose";
import { INVENTORY_ADJUSTMENT_TYPES, INVENTORY_STATUSES, PRODUCT_STATUSES } from "../data/enums";
import { BaseResponseDTO } from "../data/types/dto/common.dto";
import {
  CreateInventoryAdjustmentRequestDTO,
  GetInventoryAdjustmentsByProductRequestDTO,
  GetInventoryAdjustmentsByVariantRequestDTO,
  GetInventoryByProductRequestDTO,
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
