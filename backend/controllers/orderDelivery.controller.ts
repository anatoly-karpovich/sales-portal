import { Types } from "mongoose";
import orderDeliveryService from "../services/orderDelivery.service.js";
import { Request, Response } from "express";
import { getTokenFromRequest, getDataDataFromToken } from "../utils/utils.js";
import { BaseResponseDTO } from "../data/types/dto/common.dto.js";
import { OrderResponseDTO, UpdateOrderDeliveryRequestDTO } from "../data/types/dto/orders.dto.js";

class OrderDeliveryController {
  async update(req: UpdateOrderDeliveryRequestDTO, res: Response<OrderResponseDTO | BaseResponseDTO>) {
    try {
      const token = getTokenFromRequest(req);
      const userData = getDataDataFromToken(token);
      const orderId = new Types.ObjectId(req.params.id);
      const delivery = req.body;
      const updatedOrder = await orderDeliveryService.updateDelivery(orderId, delivery, userData.id);
      return res.status(200).json({ Order: updatedOrder, IsSuccess: true, ErrorMessage: null });
    } catch (e: any) {
      res.status(500).json({ IsSuccess: false, ErrorMessage: e.message });
    }
  }
}

export default new OrderDeliveryController();

