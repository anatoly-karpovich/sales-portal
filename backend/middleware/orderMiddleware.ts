import OrderService from "../services/order.service.js";
import CustomerService from "../services/customer.service.js";
import ProductsService from "../services/products.service.js";
import { Request, Response, NextFunction } from "express";
import { ORDER_STATUSES, VALIDATION_ERROR_MESSAGES } from "../data/enums";
import { isValidDate, isValidInput } from "../utils/validations.js";
import mongoose from "mongoose";
import {
  GetOrderByIdRequestDTO,
  OrderCommentParamsDTO,
  OrderDeliveryBodyDTO,
  OrderReceiveBodyDTO,
  OrderRequestWithEntityDTO,
  OrderStatusBodyDTO,
} from "../data/types/dto/orders.dto.js";

export async function orderById(req: GetOrderByIdRequestDTO, res: Response, next: NextFunction) {
  try {
    const id = new mongoose.Types.ObjectId(req.params.id || req.params.orderId);
    const order = await OrderService.getOrder(id);
    if (!order) {
      return res.status(404).json({ IsSuccess: false, ErrorMessage: `Order with id '${id}' wasn't found` });
    }
    req.order = order;
    next();
  } catch (e: any) {
    console.log(e);
    return res.status(500).json({ IsSuccess: false, ErrorMessage: e.message });
  }
}

export async function orderValidations(req: Request, res: Response, next: NextFunction) {
  if (!req.body.customer) {
    return res.status(404).json({ IsSuccess: false, ErrorMessage: `Missing customer` });
  }

  if (!req.body.products || !req.body.products.length) {
    return res.status(404).json({ IsSuccess: false, ErrorMessage: `Missing products` });
  }

  try {
    const customer = await CustomerService.getCustomer(req.body.customer);
    if (!customer) {
      return res
        .status(404)
        .json({ IsSuccess: false, ErrorMessage: `Customer with id '${req.body.customer}' wasn't found` });
    }

    for (const p of req.body.products) {
      const product = await ProductsService.getProduct(p);
      if (!product) {
        return res.status(404).json({ IsSuccess: false, ErrorMessage: `Product with id '${p}' wasn't found` });
      }
    }
    next();
  } catch (e: any) {
    console.log(e);
    return res.status(500).json({ IsSuccess: false, ErrorMessage: e.message });
  }
}

export async function orderStatus(
  req: OrderRequestWithEntityDTO<GetOrderByIdRequestDTO["params"], OrderStatusBodyDTO>,
  res: Response,
  next: NextFunction
) {
  try {
    const status = req.body.status;
    if (!Object.values(ORDER_STATUSES).includes(status)) {
      return res.status(400).json({ IsSuccess: false, ErrorMessage: `Invalid order status` });
    }
    if (status !== ORDER_STATUSES.IN_PROCESS && status !== ORDER_STATUSES.CANCELED && status !== ORDER_STATUSES.DRAFT) {
      return res.status(400).json({ IsSuccess: false, ErrorMessage: `Invalid order status` });
    }
    const order = req.order;
    if (!order) {
      return res.status(404).json({ IsSuccess: false, ErrorMessage: `Order with id '${req.params.id}' wasn't found` });
    }

    if (
      status === ORDER_STATUSES.IN_PROCESS &&
      order.status !== ORDER_STATUSES.DRAFT &&
      order.status !== ORDER_STATUSES.IN_PROCESS
    ) {
      return res.status(400).json({ IsSuccess: false, ErrorMessage: `Invalid order status` });
    }

    if (
      status === ORDER_STATUSES.CANCELED &&
      order.status !== ORDER_STATUSES.DRAFT &&
      order.status !== ORDER_STATUSES.IN_PROCESS
    ) {
      return res.status(400).json({ IsSuccess: false, ErrorMessage: `Invalid order status` });
    }

    if (status === ORDER_STATUSES.IN_PROCESS && !order.delivery) {
      return res.status(400).json({ IsSuccess: false, ErrorMessage: `Can't process order. Please, schedule delivery` });
    }

    if (status === ORDER_STATUSES.DRAFT && order.status !== ORDER_STATUSES.CANCELED) {
      return res.status(400).json({ IsSuccess: false, ErrorMessage: `Can't reopen not canceled order` });
    }
    next();
  } catch (e: any) {
    console.log(e);
    return res.status(500).json({ IsSuccess: false, ErrorMessage: e.message });
  }
}

export async function orderUpdateValidations(req: GetOrderByIdRequestDTO, res: Response, next: NextFunction) {
  try {
    const id = req.params.id;
    const order = req.order;
    if (!order) return res.status(404).json({ IsSuccess: false, ErrorMessage: `Order with id '${id}' wasn't found` });
    if (order.status !== ORDER_STATUSES.DRAFT) {
      return res.status(400).json({ IsSuccess: false, ErrorMessage: `Invalid order status` });
    }
    next();
  } catch (e: any) {
    console.log(e);
    return res.status(500).json({ IsSuccess: false, ErrorMessage: e.message });
  }
}

export async function orderReceiveValidations(
  req: OrderRequestWithEntityDTO<GetOrderByIdRequestDTO["params"], OrderReceiveBodyDTO>,
  res: Response,
  next: NextFunction
) {
  try {
    const order = req.order;
    if (!order) {
      return res.status(404).json({ IsSuccess: false, ErrorMessage: `Order with id '${req.params.id}' wasn't found` });
    }

    if (!req.body.products.length) {
      return res.status(400).json({ IsSuccess: false, ErrorMessage: `Incorrect amount of received products` });
    }

    if (order.status === "Draft" || order.status === "Received") {
      return res.status(400).json({ IsSuccess: false, ErrorMessage: `Invalid order status` });
    }

    if (req.body.products.length > order.products.length) {
      return res.status(400).json({ IsSuccess: false, ErrorMessage: `Incorrect amount of received products` });
    }

    for (const product of req.body.products) {
      if (!order.products.find((el) => el._id.toString() === product)) {
        return res
          .status(400)
          .json({ IsSuccess: false, ErrorMessage: `Product with Id '${product}' is not requested` });
      }
    }
    next();
  } catch (e: any) {
    console.log(e);
    return res.status(500).json({ IsSuccess: false, ErrorMessage: e.message });
  }
}

export async function orderDelivery(
  req: OrderRequestWithEntityDTO<GetOrderByIdRequestDTO["params"], OrderDeliveryBodyDTO>,
  res: Response,
  next: NextFunction
) {
  try {
    const order = req.order;
    if (!order) {
      return res.status(404).json({ IsSuccess: false, ErrorMessage: `Order with id '${req.params.id}' wasn't found` });
    }
    if (order.status !== ORDER_STATUSES.DRAFT) {
      return res.status(400).json({ IsSuccess: false, ErrorMessage: `Invalid order status` });
    }
    if (!isValidDate(req.body.finalDate)) {
      return res.status(400).json({ IsSuccess: false, ErrorMessage: `Invalid final date` });
    }
    if (
      !isValidInput("City", req.body.address.city) ||
      (req.body.address.city && req.body.address.city.trim().length !== req.body.address.city.length)
    ) {
      return res.status(400).json({ IsSuccess: false, ErrorMessage: VALIDATION_ERROR_MESSAGES.DELIVERY });
    }

    if (
      !isValidInput("Street", req.body.address.street) ||
      (req.body.address.street && req.body.address.street.trim().length !== req.body.address.street.length)
    ) {
      return res.status(400).json({ IsSuccess: false, ErrorMessage: VALIDATION_ERROR_MESSAGES.DELIVERY });
    }

    if (!isValidInput("House", req.body.address.house) || req.body.address.house < 1 || req.body.address.house > 999) {
      return res.status(400).json({ IsSuccess: false, ErrorMessage: VALIDATION_ERROR_MESSAGES.DELIVERY });
    }

    if (!isValidInput("Flat", req.body.address.flat) || req.body.address.flat < 1 || req.body.address.flat > 9999) {
      return res.status(400).json({ IsSuccess: false, ErrorMessage: VALIDATION_ERROR_MESSAGES.DELIVERY });
    }
  } catch (e: any) {
    return res.status(500).json({ IsSuccess: false, ErrorMessage: e.message });
  }
  next();
}

export async function orderCommentsCreate(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.params.id) {
      return res.status(400).json({ IsSuccess: false, ErrorMessage: VALIDATION_ERROR_MESSAGES.BODY });
    }

    const replacedText = req.body.comment.replaceAll("\r", "").replaceAll("\n", "");

    if (!req.body.comment.length || replacedText.length > 250) {
      return res.status(400).json({ IsSuccess: false, ErrorMessage: VALIDATION_ERROR_MESSAGES.BODY });
    }
    next();
  } catch (e: any) {
    console.log(e);
    return res.status(500).json({ IsSuccess: false, ErrorMessage: e.message });
  }
}

export async function orderCommentsDelete(
  req: OrderRequestWithEntityDTO<OrderCommentParamsDTO>,
  res: Response,
  next: NextFunction
) {
  try {
    const orderId = req.params.id;
    const commentId = req.params.commentId;
    if (!orderId || !commentId) {
      return res.status(400).json({ IsSuccess: false, ErrorMessage: VALIDATION_ERROR_MESSAGES.BODY });
    }

    const comment = req.order?.comments.find((c) => c._id.toString() === commentId);
    if (!comment) {
      return res.status(400).json({ IsSuccess: false, ErrorMessage: VALIDATION_ERROR_MESSAGES.COMMENT_NOT_FOUND });
    }
    next();
  } catch (e: any) {
    console.log(e);
    return res.status(500).json({ IsSuccess: false, ErrorMessage: e.message });
  }
}
