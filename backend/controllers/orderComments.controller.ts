import { Types } from "mongoose";
import OrderCommentsService from "../services/orderComments.service";
import { Request, Response } from "express";
import { BaseResponseDTO } from "../data/types/dto/common.dto.js";
import {
  CreateOrderCommentRequestDTO,
  DeleteOrderCommentRequestDTO,
  OrderResponseDTO,
} from "../data/types/dto/orders.dto.js";

class OrderCommentsController {
  async create(req: CreateOrderCommentRequestDTO, res: Response<OrderResponseDTO | BaseResponseDTO>) {
    try {
      if (!req.order) {
        return res.status(404).json({ IsSuccess: false, ErrorMessage: `Order with id '${req.params.orderId}' wasn't found` });
      }
      const orderId = new Types.ObjectId(req.params.orderId);
      const comment = req.body.comment as string;
      const updatedOrder = await OrderCommentsService.createComment(orderId, comment, req.order);
      return res.status(200).json({ Order: updatedOrder, IsSuccess: true, ErrorMessage: null });
    } catch (e: any) {
      res.status(500).json({ IsSuccess: false, ErrorMessage: e.message });
    }
  }

  async delete(req: DeleteOrderCommentRequestDTO, res: Response<OrderResponseDTO | BaseResponseDTO>) {
    try {
      const orderId = new Types.ObjectId(req.params.orderId);
      const commentId = new Types.ObjectId(req.params.commentId);
      await OrderCommentsService.deleteComment(orderId, commentId);
      return res.status(204).send();
    } catch (e: any) {
      res.status(500).json({ IsSuccess: false, ErrorMessage: e.message });
    }
  }
}

export default new OrderCommentsController();


