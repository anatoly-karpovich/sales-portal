import OrderService from "../services/order.service.js";
import CustomerService from "../services/customer.service.js";
import { SettingsService } from "../services/settings.service.js";
import Product from "../models/product.model.js";
import { Request, Response, NextFunction } from "express";
import { DELIVERY_STATUSES, ORDER_STATUSES, VALIDATION_ERROR_MESSAGES } from "../data/enums";
import { isValidInput } from "../utils/validations.js";
import { Types } from "mongoose";
import { BaseResponseDTO } from "../data/types/dto/common.dto.js";
import {
  CreateOrderCommentRequestDTO,
  CreateOrderRequestDTO,
  GetOrderByIdRequestDTO,
  OrderCommentParamsDTO,
  OrderPricingRequestDTO,
  OrderProductRequestItemDTO,
  OrderReceiveRequestDTO,
  OrderRequestWithEntityDTO,
  OrderStatusRequestDTO,
  UpdateOrderPickupRequestDTO,
  UpdateOrderDeliveryRequestDTO,
  UpdateOrderRequestDTO,
} from "../data/types/dto/orders.dto.js";
import { US_STATE_CODES } from "../data/usStates.js";
import type { IPickupLocation } from "../data/types/settings.type.js";

const settingsService = new SettingsService();

function validateDeliveryPayload(
  delivery: UpdateOrderDeliveryRequestDTO["body"],
  res: Response<BaseResponseDTO>,
): Response<BaseResponseDTO> | undefined {
  if (typeof delivery.express !== "boolean") {
    return res.status(400).json({ IsSuccess: false, ErrorMessage: VALIDATION_ERROR_MESSAGES.DELIVERY });
  }

  if (
    !isValidInput("State", delivery.address.state) ||
    !US_STATE_CODES.includes(delivery.address.state as (typeof US_STATE_CODES)[number])
  ) {
    return res.status(400).json({ IsSuccess: false, ErrorMessage: VALIDATION_ERROR_MESSAGES.DELIVERY });
  }

  if (
    !isValidInput("City", delivery.address.city) ||
    (delivery.address.city && delivery.address.city.trim().length !== delivery.address.city.length)
  ) {
    return res.status(400).json({ IsSuccess: false, ErrorMessage: VALIDATION_ERROR_MESSAGES.DELIVERY });
  }

  if (
    !isValidInput("Street", delivery.address.street) ||
    (delivery.address.street && delivery.address.street.trim().length !== delivery.address.street.length)
  ) {
    return res.status(400).json({ IsSuccess: false, ErrorMessage: VALIDATION_ERROR_MESSAGES.DELIVERY });
  }

  if (!isValidInput("House", delivery.address.house) || delivery.address.house < 1 || delivery.address.house > 999) {
    return res.status(400).json({ IsSuccess: false, ErrorMessage: VALIDATION_ERROR_MESSAGES.DELIVERY });
  }

  if (
    delivery.address.apartment !== undefined &&
    (!isValidInput("Apartment", delivery.address.apartment) ||
      delivery.address.apartment < 1 ||
      delivery.address.apartment > 9999)
  ) {
    return res.status(400).json({ IsSuccess: false, ErrorMessage: VALIDATION_ERROR_MESSAGES.DELIVERY });
  }

  if (!isValidInput("ZipCode", delivery.address.zipCode)) {
    return res.status(400).json({ IsSuccess: false, ErrorMessage: VALIDATION_ERROR_MESSAGES.DELIVERY });
  }
}

type PickupLocationMatch = {
  state: (typeof US_STATE_CODES)[number];
  location: IPickupLocation;
};

async function findPickupLocationById(pickupLocationId: string): Promise<PickupLocationMatch | null> {
  const settings = await settingsService.get();
  const locationsByState = settings?.shipping?.pickup?.locations;
  if (!locationsByState) {
    return null;
  }

  for (const state of US_STATE_CODES) {
    const locations = locationsByState[state];
    if (!locations) {
      continue;
    }

    const found = locations.find((location) => location.id === pickupLocationId);
    if (found) {
      return { state, location: found };
    }
  }

  return null;
}

async function validatePickupPayload(
  pickup: UpdateOrderPickupRequestDTO["body"],
  res: Response<BaseResponseDTO>,
): Promise<Response<BaseResponseDTO> | undefined> {
  if (!pickup?.pickupLocationId || typeof pickup.pickupLocationId !== "string") {
    return res.status(400).json({ IsSuccess: false, ErrorMessage: VALIDATION_ERROR_MESSAGES.DELIVERY });
  }

  const pickupLocationId = pickup.pickupLocationId.trim();
  if (!pickupLocationId) {
    return res.status(400).json({ IsSuccess: false, ErrorMessage: VALIDATION_ERROR_MESSAGES.DELIVERY });
  }

  const match = await findPickupLocationById(pickupLocationId);
  if (!match) {
    return res
      .status(404)
      .json({ IsSuccess: false, ErrorMessage: `Pickup location with id '${pickupLocationId}' wasn't found` });
  }

  if (!match.location.isActive) {
    return res
      .status(404)
      .json({ IsSuccess: false, ErrorMessage: `Pickup location with id '${pickupLocationId}' is inactive` });
  }
}

export async function orderById(req: GetOrderByIdRequestDTO, res: Response<BaseResponseDTO>, next: NextFunction) {
  try {
    const id = new Types.ObjectId(req.params.orderId);
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

export async function orderValidations(
  req: CreateOrderRequestDTO | UpdateOrderRequestDTO,
  res: Response<BaseResponseDTO>,
  next: NextFunction,
) {
  try {
    const hasCustomer = typeof req.body.customer === "string";
    const hasProducts = Array.isArray(req.body.products);

    if (!hasCustomer && !hasProducts) {
      return res.status(400).json({ IsSuccess: false, ErrorMessage: VALIDATION_ERROR_MESSAGES.BODY });
    }

    if (hasCustomer) {
      const customer = await CustomerService.getCustomer(new Types.ObjectId(req.body.customer));
      if (!customer) {
        return res
          .status(404)
          .json({ IsSuccess: false, ErrorMessage: `Customer with id '${req.body.customer}' wasn't found` });
      }
    }

    if (hasProducts) {
      const requestedProducts = req.body.products as OrderProductRequestItemDTO[];

      if (!requestedProducts.length) {
        return res.status(404).json({ IsSuccess: false, ErrorMessage: `Missing products` });
      }

      const requestedIds = requestedProducts.map((item) => item.id);
      const uniqueProductIds = new Set(requestedIds);
      if (uniqueProductIds.size !== requestedIds.length) {
        return res
          .status(400)
          .json({ IsSuccess: false, ErrorMessage: `Duplicate product ids are not allowed` });
      }

      const productObjectIds = [...uniqueProductIds].map((productId) => new Types.ObjectId(productId));
      const existingProducts = await Product.find({ _id: { $in: productObjectIds } }).select("_id").lean();
      const existingProductIds = new Set(existingProducts.map((product) => product._id.toString()));

      const missingProductId = [...uniqueProductIds].find((productId) => !existingProductIds.has(productId));
      if (missingProductId) {
        return res
          .status(404)
          .json({ IsSuccess: false, ErrorMessage: `Product with id '${missingProductId}' wasn't found` });
      }

      const settings = await settingsService.get();
      const maxQuantity = settings?.order?.maxProductQuantityInOrder;
      if (typeof maxQuantity !== "number" || maxQuantity < 1) {
        return res
          .status(500)
          .json({ IsSuccess: false, ErrorMessage: `Order quantity limit is not configured` });
      }

      const overLimit = requestedProducts.find((item) => item.quantity < 1 || item.quantity > maxQuantity);
      if (overLimit) {
        return res.status(400).json({
          IsSuccess: false,
          ErrorMessage: `Product '${overLimit.id}' quantity must be between 1 and ${maxQuantity}`,
        });
      }
    }

    next();
  } catch (e: any) {
    console.log(e);
    return res.status(500).json({ IsSuccess: false, ErrorMessage: e.message });
  }
}

export async function orderStatus(
  req: OrderRequestWithEntityDTO<GetOrderByIdRequestDTO["params"], OrderStatusRequestDTO>,
  res: Response<BaseResponseDTO>,
  next: NextFunction,
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
      return res.status(404).json({ IsSuccess: false, ErrorMessage: `Order with id '${req.params.orderId}' wasn't found` });
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
    if (
      status === ORDER_STATUSES.IN_PROCESS &&
      order.delivery.status !== DELIVERY_STATUSES.DELIVERY_SCHEDULED &&
      order.delivery.status !== DELIVERY_STATUSES.PICKUP_SCHEDULED
    ) {
      return res.status(400).json({ IsSuccess: false, ErrorMessage: `Can't process order. Please, schedule delivery` });
    }

    if (
      status === ORDER_STATUSES.CANCELED &&
      order.delivery.status !== DELIVERY_STATUSES.DRAFT &&
      order.delivery.status !== DELIVERY_STATUSES.DELIVERY_SCHEDULED &&
      order.delivery.status !== DELIVERY_STATUSES.PICKUP_SCHEDULED
    ) {
      return res.status(400).json({ IsSuccess: false, ErrorMessage: `Invalid order status` });
    }

    if (status === ORDER_STATUSES.CANCELED && order.products.some((product) => product.received)) {
      return res.status(400).json({ IsSuccess: false, ErrorMessage: `Invalid order status` });
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

export async function orderUpdateValidations(
  req: UpdateOrderRequestDTO,
  res: Response<BaseResponseDTO>,
  next: NextFunction,
) {
  try {
    const id = req.params.orderId;
    const order = req.order;
    if (!order) return res.status(404).json({ IsSuccess: false, ErrorMessage: `Order with id '${id}' wasn't found` });
    if (order.status !== ORDER_STATUSES.DRAFT) {
      return res.status(400).json({ IsSuccess: false, ErrorMessage: `Invalid order status` });
    }

    const hasCustomer = typeof req.body?.customer === "string";
    const hasProducts = Array.isArray(req.body?.products);

    if (!hasCustomer && !hasProducts) {
      return res.status(400).json({ IsSuccess: false, ErrorMessage: VALIDATION_ERROR_MESSAGES.BODY });
    }

    next();
  } catch (e: any) {
    console.log(e);
    return res.status(500).json({ IsSuccess: false, ErrorMessage: e.message });
  }
}

export async function orderReceiveValidations(
  req: OrderRequestWithEntityDTO<GetOrderByIdRequestDTO["params"], OrderReceiveRequestDTO>,
  res: Response<BaseResponseDTO>,
  next: NextFunction,
) {
  try {
    const order = req.order;
    if (!order) {
      return res.status(404).json({ IsSuccess: false, ErrorMessage: `Order with id '${req.params.orderId}' wasn't found` });
    }

    if (!req.body.products.length) {
      return res.status(400).json({ IsSuccess: false, ErrorMessage: `Incorrect amount of received products` });
    }

    if (order.status !== ORDER_STATUSES.IN_PROCESS) {
      return res.status(400).json({ IsSuccess: false, ErrorMessage: `Invalid order status` });
    }

    if (
      order.delivery.status !== DELIVERY_STATUSES.DELIVERY_SCHEDULED &&
      order.delivery.status !== DELIVERY_STATUSES.PICKUP_SCHEDULED &&
      order.delivery.status !== DELIVERY_STATUSES.PARTIALLY_DELIVERED
    ) {
      return res.status(400).json({ IsSuccess: false, ErrorMessage: `Invalid order status` });
    }

    const requestedIds = req.body.products;
    if (new Set(requestedIds).size !== requestedIds.length) {
      return res
        .status(400)
        .json({ IsSuccess: false, ErrorMessage: `Duplicate product ids are not allowed` });
    }

    if (requestedIds.length > order.products.length) {
      return res.status(400).json({ IsSuccess: false, ErrorMessage: `Incorrect amount of received products` });
    }

    for (const productId of requestedIds) {
      const position = order.products.find((el) => el.product?._id?.toString() === productId);
      if (!position) {
        return res
          .status(400)
          .json({ IsSuccess: false, ErrorMessage: `Product with Id '${productId}' is not requested` });
      }
      if (position.received) {
        return res
          .status(400)
          .json({ IsSuccess: false, ErrorMessage: `Product with Id '${productId}' is already received` });
      }
    }
    next();
  } catch (e: any) {
    console.log(e);
    return res.status(500).json({ IsSuccess: false, ErrorMessage: e.message });
  }
}

export async function orderDeliveryValidation(
  req: OrderRequestWithEntityDTO<GetOrderByIdRequestDTO["params"], UpdateOrderDeliveryRequestDTO["body"]>,
  res: Response<BaseResponseDTO>,
  next: NextFunction,
) {
  try {
    const order = req.order;
    if (!order) {
      return res.status(404).json({ IsSuccess: false, ErrorMessage: `Order with id '${req.params.orderId}' wasn't found` });
    }
    if (order.status !== ORDER_STATUSES.DRAFT) {
      return res.status(400).json({ IsSuccess: false, ErrorMessage: `Invalid order status` });
    }
    const validationError = validateDeliveryPayload(req.body, res);
    if (validationError) {
      return validationError;
    }
  } catch (e: any) {
    return res.status(500).json({ IsSuccess: false, ErrorMessage: e.message });
  }
  next();
}

export async function orderPickupValidation(
  req: OrderRequestWithEntityDTO<GetOrderByIdRequestDTO["params"], UpdateOrderPickupRequestDTO["body"]>,
  res: Response<BaseResponseDTO>,
  next: NextFunction,
) {
  try {
    const order = req.order;
    if (!order) {
      return res.status(404).json({ IsSuccess: false, ErrorMessage: `Order with id '${req.params.orderId}' wasn't found` });
    }
    if (order.status !== ORDER_STATUSES.DRAFT) {
      return res.status(400).json({ IsSuccess: false, ErrorMessage: `Invalid order status` });
    }

    const validationError = await validatePickupPayload(req.body, res);
    if (validationError) {
      return validationError;
    }
  } catch (e: any) {
    return res.status(500).json({ IsSuccess: false, ErrorMessage: e.message });
  }
  next();
}

export async function orderPricingDeliveryValidation(
  req: Request<
    unknown,
    unknown,
    { delivery?: UpdateOrderDeliveryRequestDTO["body"]; pickup?: UpdateOrderPickupRequestDTO["body"] }
  >,
  res: Response<BaseResponseDTO>,
  next: NextFunction,
) {
  try {
    if (req.body.delivery && req.body.pickup) {
      return res.status(400).json({ IsSuccess: false, ErrorMessage: VALIDATION_ERROR_MESSAGES.DELIVERY });
    }

    if (req.body.delivery) {
      const validationError = validateDeliveryPayload(req.body.delivery, res);
      if (validationError) {
        return validationError;
      }
      return next();
    }

    if (req.body.pickup) {
      const validationError = await validatePickupPayload(req.body.pickup, res);
      if (validationError) {
        return validationError;
      }
    }

    next();
  } catch (e: any) {
    return res.status(500).json({ IsSuccess: false, ErrorMessage: e.message });
  }
}

export async function orderPricingValidations(
  req: OrderPricingRequestDTO,
  res: Response<BaseResponseDTO>,
  next: NextFunction,
) {
  return orderValidations(req as unknown as CreateOrderRequestDTO, res, next);
}

export async function orderCommentsCreate(
  req: CreateOrderCommentRequestDTO,
  res: Response<BaseResponseDTO>,
  next: NextFunction,
) {
  try {
    if (!req.params.orderId) {
      return res.status(400).json({ IsSuccess: false, ErrorMessage: VALIDATION_ERROR_MESSAGES.BODY });
    }

    const replacedText = req.body.comment.replace(/\r/g, "").replace(/\n/g, "");

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
  res: Response<BaseResponseDTO>,
  next: NextFunction,
) {
  try {
    const orderId = req.params.orderId;
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
