import { Types } from "mongoose";
import OrderStatusService from "../services/orderStatus.service.js";
import { Request, Response } from "express";
import { getTokenFromRequest, getDataDataFromToken } from "../utils/utils.js";

class OrderStatusController {
  async update(req: Request, res: Response) {
    try {
      const token = getTokenFromRequest(req);
      const userData = getDataDataFromToken(token);
      const orderId = new Types.ObjectId(req.params.id);
      const status = req.body.status;
      const updatedOrder = await OrderStatusService.updateStatus(orderId, status, userData.id);
      return res.status(200).json({ Order: updatedOrder, IsSuccess: true, ErrorMessage: null });
    } catch (e: any) {
      res.status(500).json({ IsSuccess: false, ErrorMessage: e.message });
    }
  }
}

export default new OrderStatusController();

