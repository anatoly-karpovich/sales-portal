import { Types } from "mongoose";
import orderReceiveService from "../services/orderReceive.service.js";
import { Request, Response } from "express";
import { getTokenFromRequest, getDataDataFromToken } from "../utils/utils.js";

class OrderReceiveController {
  async receiveProducts(req: Request, res: Response) {
    try {
      const token = getTokenFromRequest(req);
      const userData = getDataDataFromToken(token);
      const orderId = new Types.ObjectId(req.params.id);
      const products = req.body.products;
      const updatedOrder = await orderReceiveService.receiveProducts(orderId, products, userData.id);
      return res.status(200).json({ Order: updatedOrder, IsSuccess: true, ErrorMessage: null });
    } catch (e: any) {
      res.status(500).json({ IsSuccess: false, ErrorMessage: e.message });
    }
  }
}

export default new OrderReceiveController();

