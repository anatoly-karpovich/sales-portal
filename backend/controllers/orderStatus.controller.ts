import { Types } from "mongoose";
import OrderStatusService from "../services/orderStatus.service.js";
import { Request, Response } from "express";
import { getTokenFromRequest, getDataDataFromToken } from "../utils/utils.js";
import { BaseResponseDTO } from "../data/types/dto/common.dto.js";
import { OrderResponseDTO, UpdateOrderStatusRequestDTO } from "../data/types/dto/orders.dto.js";

class OrderStatusController {
  async update(req: UpdateOrderStatusRequestDTO, res: Response<OrderResponseDTO | BaseResponseDTO>) {
    try {
      const token = getTokenFromRequest(req);
      const userData = getDataDataFromToken(token);
      if (!req.order) {
        return res.status(404).json({ IsSuccess: false, ErrorMessage: `Order with id '${req.params.orderId}' wasn't found` });
      }
      const orderId = new Types.ObjectId(req.params.orderId);
      const status = req.body.status;
      const updatedOrder = await OrderStatusService.updateStatus(orderId, status, userData.id, req.order);
      return res.status(200).json({ Order: updatedOrder, IsSuccess: true, ErrorMessage: null });
    } catch (e: any) {
      res.status(500).json({ IsSuccess: false, ErrorMessage: e.message });
    }
  }
}

export default new OrderStatusController();


