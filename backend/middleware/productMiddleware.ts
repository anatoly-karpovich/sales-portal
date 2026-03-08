import { isValidInput } from "../utils/validations.js";
import { MANUFACTURERS, VALIDATION_ERROR_MESSAGES } from "../data/enums.js";
import ProductsService from "../services/products.service.js";
import { Response, NextFunction } from "express";
import OrderService from "../services/order.service.js";
import mongoose from "mongoose";
import {
  GetProductByIdRequestDTO,
  ProductCreateOrUpdateRequestDTO,
  ProductRequestWithEntityDTO,
} from "../data/types/dto/products.dto.js";

export async function uniqueProduct(
  req: ProductRequestWithEntityDTO<GetProductByIdRequestDTO["params"], ProductCreateOrUpdateRequestDTO>,
  res: Response,
  next: NextFunction
) {
  try {
    const id = req.params.id;
    const product = (await ProductsService.getAll()).find((c) => {
      return id ? c.name === req.body.name && c._id.toString() !== id : c.name === req.body.name;
    });
    if (product) {
      return res
        .status(409)
        .json({ IsSuccess: false, ErrorMessage: `Product with name '${req.body.name}' already exists` });
    }
  } catch (e: any) {
    console.log(e);
    return res.status(500).json({ IsSuccess: false, ErrorMessage: e.message });
  }
  next();
}

export async function productValidations(
  req: ProductRequestWithEntityDTO<GetProductByIdRequestDTO["params"], ProductCreateOrUpdateRequestDTO>,
  res: Response,
  next: NextFunction
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

export async function productById(req: GetProductByIdRequestDTO, res: Response, next: NextFunction) {
  try {
    const id = req.params.id;
    const product = await ProductsService.getProduct(new mongoose.Types.ObjectId(id));
    if (!product) {
      return res.status(404).json({ IsSuccess: false, ErrorMessage: `Product with id '${id}' wasn't found` });
    }
    req.product = product;
    next();
  } catch (e: any) {
    console.log(e);
    return res.status(500).json({ IsSuccess: false, ErrorMessage: e.message });
  }
}

export async function deleteProduct(
  req: ProductRequestWithEntityDTO<GetProductByIdRequestDTO["params"]>,
  res: Response,
  next: NextFunction
) {
  try {
    const isAssignedToOrder = (await OrderService.getAll()).some((o) =>
      o.products.some((r) => r._id.toString() === req.params.id)
    );
    if (isAssignedToOrder) {
      return res
        .status(400)
        .json({ IsSuccess: false, ErrorMessage: `Not allowed to delete product, assigned to the order` });
    }
    next();
  } catch (e: any) {
    console.log(e);
    return res.status(500).json({ IsSuccess: false, ErrorMessage: e.message });
  }
}
