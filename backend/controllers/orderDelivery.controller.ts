import { Types } from "mongoose";
import orderDeliveryService from "../services/orderDelivery.service.js";
import { Response } from "express";
import { getTokenFromRequest, getDataDataFromToken } from "../utils/utils.js";
import { BaseResponseDTO } from "../data/types/dto/common.dto.js";
import { OrderResponseDTO, UpdateOrderDeliveryRequestDTO, UpdateOrderPickupRequestDTO } from "../data/types/dto/orders.dto.js";

class OrderDeliveryController {
  async updateDelivery(req: UpdateOrderDeliveryRequestDTO, res: Response<OrderResponseDTO | BaseResponseDTO>) {
    try {
      const token = getTokenFromRequest(req);
      const managerData = getDataDataFromToken(token);
      if (!req.order) {
        return res.status(404).json({ IsSuccess: false, ErrorMessage: `Order with id '${req.params.orderId}' wasn't found` });
      }
      const orderId = new Types.ObjectId(req.params.orderId);
      const delivery = req.body;
      const updatedOrder = await orderDeliveryService.updateDelivery(orderId, delivery, managerData.id, req.order);
      return res.status(200).json({ Order: updatedOrder, IsSuccess: true, ErrorMessage: null });
    } catch (e: any) {
      const statusCode = typeof e?.statusCode === "number" ? e.statusCode : 500;
      res.status(statusCode).json({ IsSuccess: false, ErrorMessage: e.message });
    }
  }

  async updatePickup(req: UpdateOrderPickupRequestDTO, res: Response<OrderResponseDTO | BaseResponseDTO>) {
    try {
      const token = getTokenFromRequest(req);
      const managerData = getDataDataFromToken(token);
      if (!req.order) {
        return res.status(404).json({ IsSuccess: false, ErrorMessage: `Order with id '${req.params.orderId}' wasn't found` });
      }
      const orderId = new Types.ObjectId(req.params.orderId);
      const pickup = req.body;
      const updatedOrder = await orderDeliveryService.updatePickup(orderId, pickup, managerData.id, req.order);
      return res.status(200).json({ Order: updatedOrder, IsSuccess: true, ErrorMessage: null });
    } catch (e: any) {
      const statusCode = typeof e?.statusCode === "number" ? e.statusCode : 500;
      res.status(statusCode).json({ IsSuccess: false, ErrorMessage: e.message });
    }
  }
}

export default new OrderDeliveryController();


