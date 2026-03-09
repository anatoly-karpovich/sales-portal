import { isValidInput } from "../utils/validations.js";
import { MANUFACTURERS, VALIDATION_ERROR_MESSAGES } from "../data/enums.js";
import ProductsService from "../services/products.service.js";
import Product from "../models/product.model.js";
import Order from "../models/order.model.js";
import { Response, NextFunction } from "express";
import { Types } from "mongoose";
import { BaseResponseDTO } from "../data/types/dto/common.dto.js";
import {
  CreateProductRequestDTO,
  DeleteProductRequestDTO,
  GetProductByIdRequestDTO,
  UpdateProductRequestDTO,
} from "../data/types/dto/products.dto.js";

export async function uniqueProduct(
  req: CreateProductRequestDTO | UpdateProductRequestDTO,
  res: Response<BaseResponseDTO>,
  next: NextFunction,
) {
  try {
    const normalizedName = req.body.name?.trim();
    if (!normalizedName) {
      return next();
    }

    req.body.name = normalizedName;

    const escapedName = normalizedName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const filter: { name: { $regex: RegExp }; _id?: { $ne: Types.ObjectId } } = {
      name: { $regex: new RegExp(`^${escapedName}$`, "i") },
    };
    if (req.params.productId && Types.ObjectId.isValid(req.params.productId)) {
      filter._id = { $ne: new Types.ObjectId(req.params.productId) };
    }

    const existingProduct = await Product.findOne(filter).select("_id").lean();
    if (existingProduct) {
      return res
        .status(409)
        .json({ IsSuccess: false, ErrorMessage: `Product with name '${normalizedName}' already exists` });
    }
  } catch (e: any) {
    console.log(e);
    return res.status(500).json({ IsSuccess: false, ErrorMessage: e.message });
  }
  next();
}

export async function productValidations(
  req: CreateProductRequestDTO | UpdateProductRequestDTO,
  res: Response<BaseResponseDTO>,
  next: NextFunction,
) {
  try {
    if (!isValidInput("Product Name", req.body.name) || req.body.name.trim().length !== req.body.name.length) {
      return res.status(400).json({ IsSuccess: false, ErrorMessage: VALIDATION_ERROR_MESSAGES.BODY });
    }
    if (!isValidInput("Amount", req.body.amount) || req.body.amount < 0 || req.body.amount > 999) {
      return res.status(400).json({ IsSuccess: false, ErrorMessage: VALIDATION_ERROR_MESSAGES.BODY });
    }
    if (!isValidInput("Price", req.body.price) || req.body.price <= 0 || req.body.price > 99999) {
      return res.status(400).json({ IsSuccess: false, ErrorMessage: VALIDATION_ERROR_MESSAGES.BODY });
    }
    if (
      req.body.notes &&
      (!isValidInput("Notes", req.body.notes) ||
        req.body.notes.trim().length !== req.body.notes.length ||
        req.body.notes.trim().replace(/\r/g, "").replace(/\n/g, "").length > 250)
    ) {
      return res.status(400).json({ IsSuccess: false, ErrorMessage: VALIDATION_ERROR_MESSAGES.BODY });
    }
    if (!Object.values(MANUFACTURERS).includes(req.body.manufacturer)) {
      return res.status(400).json({ IsSuccess: false, ErrorMessage: VALIDATION_ERROR_MESSAGES.BODY });
    }
    next();
  } catch (e: any) {
    console.log(e);
    return res.status(500).json({ IsSuccess: false, ErrorMessage: e.message });
  }
}

export async function productById(req: GetProductByIdRequestDTO, res: Response<BaseResponseDTO>, next: NextFunction) {
  try {
    const productId = req.params.productId;
    const product = await ProductsService.getProduct(new Types.ObjectId(productId));
    if (!product) {
      return res.status(404).json({ IsSuccess: false, ErrorMessage: `Product with id '${productId}' wasn't found` });
    }
    req.product = product;
    next();
  } catch (e: any) {
    console.log(e);
    return res.status(500).json({ IsSuccess: false, ErrorMessage: e.message });
  }
}

export async function deleteProduct(req: DeleteProductRequestDTO, res: Response<BaseResponseDTO>, next: NextFunction) {
  try {
    const productId = new Types.ObjectId(req.params.productId);
    const isAssignedToOrder = await Order.exists({ "products._id": productId });
    if (isAssignedToOrder) {
      return res
        .status(409)
        .json({ IsSuccess: false, ErrorMessage: `Not allowed to delete product, assigned to the order` });
    }
    next();
  } catch (e: any) {
    console.log(e);
    return res.status(500).json({ IsSuccess: false, ErrorMessage: e.message });
  }
}
