import OrderService from "../services/order.service.js";
import { Request, Response } from "express";
import { Types } from "mongoose";
import { getDataDataFromToken, getTokenFromRequest } from "../utils/utils.js";
import { BaseResponseDTO } from "../data/types/dto/common.dto.js";
import {
  AssignManagerRequestDTO,
  CreateOrderRequestDTO,
  DeleteOrderRequestDTO,
  GetOrderRequestWithEntityDTO,
  GetOrdersSortedRequestDTO,
  OrderResponseDTO,
  OrdersSortedResponseDTO,
  UnassignManagerRequestDTO,
  UpdateOrderRequestDTO,
} from "../data/types/dto/orders.dto.js";
import { IOrderRequest } from "../data/types/order.type.js";

const MIN_LIMIT = 10;
const MAX_LIMIT = 100;

class OrderController {
  private mapOrderRequestBody(body: CreateOrderRequestDTO["body"] | UpdateOrderRequestDTO["body"]): IOrderRequest {
    return {
      customer: new Types.ObjectId(body.customer),
      products: body.products.map((id) => new Types.ObjectId(id)),
    };
  }

  async create(req: CreateOrderRequestDTO, res: Response<OrderResponseDTO | BaseResponseDTO>) {
    try {
      const token = getTokenFromRequest(req);
      const userData = getDataDataFromToken(token);
      const order = await OrderService.create(this.mapOrderRequestBody(req.body), userData.id);
      res.status(201).json({ Order: order, IsSuccess: true, ErrorMessage: null });
    } catch (e: any) {
      console.log(e);
      res.status(500).json({ IsSuccess: false, ErrorMessage: e.message });
    }
  }

  async getAll(
    req: GetOrdersSortedRequestDTO,
    res: Response<OrdersSortedResponseDTO | BaseResponseDTO>
  ): Promise<Response> {
    try {
      const {
        search = "",
        sortField = "createdOn",
        sortOrder = "asc",
        status,
        page = "1",
        limit = MIN_LIMIT,
      } = req.query;

      const pageNumber = Math.max(parseInt(page), 1);
      const limitNumber = Math.min(Math.max(+limit, MIN_LIMIT), MAX_LIMIT);
      const skip = (pageNumber - 1) * limitNumber;

      const statuses = (Array.isArray(status) ? status : status ? [status] : []) as string[];

      const filters = { search, status: statuses };
      const sortOptions = { sortField, sortOrder };

      const { orders, total } = await OrderService.getSorted(filters, sortOptions, { skip, limit: limitNumber });

      return res.status(200).json({
        Orders: orders,
        total,
        page: pageNumber,
        limit: limitNumber,
        search,
        status: statuses,
        sorting: sortOptions,
        IsSuccess: true,
        ErrorMessage: null,
      });
    } catch (e: any) {
      console.log(e);
      return res.status(500).json({ IsSuccess: false, ErrorMessage: e.message });
    }
  }

  async getOrder(req: GetOrderRequestWithEntityDTO, res: Response<OrderResponseDTO | BaseResponseDTO>) {
    try {
      const order = req.order;
      if (!order) {
        return res.status(404).json({ IsSuccess: false, ErrorMessage: "Order was not found" });
      }
      res.status(200).json({ Order: order, IsSuccess: true, ErrorMessage: null });
    } catch (e: any) {
      console.log(e);
      res.status(500).json({ IsSuccess: false, ErrorMessage: e.message });
    }
  }

  async update(req: UpdateOrderRequestDTO, res: Response<OrderResponseDTO | BaseResponseDTO>) {
    try {
      const token = getTokenFromRequest(req);
      const userData = getDataDataFromToken(token);
      const orderId = new Types.ObjectId(req.params.id);
      const updatedOrder = await OrderService.update(orderId, this.mapOrderRequestBody(req.body), userData.id);
      return res.status(200).json({ Order: updatedOrder, IsSuccess: true, ErrorMessage: null });
    } catch (e: any) {
      console.log(e);
      res.status(500).json({ IsSuccess: false, ErrorMessage: e.message });
    }
  }

  async delete(req: DeleteOrderRequestDTO, res: Response<OrderResponseDTO | BaseResponseDTO>): Promise<Response> {
    try {
      const id = new Types.ObjectId(req.params.id);
      const order = await OrderService.delete(id);
      return res.status(204).json({ Order: order, IsSuccess: true, ErrorMessage: null });
    } catch (e: any) {
      console.log(e);
      res.status(500).json({ IsSuccess: false, ErrorMessage: e.message });
    }
  }

  async assignManager(req: AssignManagerRequestDTO, res: Response<OrderResponseDTO | BaseResponseDTO>) {
    try {
      const token = getTokenFromRequest(req);
      const performerData = getDataDataFromToken(token);
      const { orderId, managerId } = req.params;

      const order = await OrderService.assignManager(orderId, managerId, performerData.id);
      res.status(200).json({ Order: order, IsSuccess: true, ErrorMessage: null });
    } catch (e: any) {
      console.log(e);
      res.status(500).json({ IsSuccess: false, ErrorMessage: e.message });
    }
  }

  async unassignManager(req: UnassignManagerRequestDTO, res: Response<OrderResponseDTO | BaseResponseDTO>) {
    try {
      const token = getTokenFromRequest(req);
      const performerData = getDataDataFromToken(token);
      const { orderId } = req.params;

      const order = await OrderService.unassignManager(orderId, performerData.id);
      res.status(200).json({ Order: order, IsSuccess: true, ErrorMessage: null });
    } catch (e: any) {
      console.log(e);
      res.status(500).json({ IsSuccess: false, ErrorMessage: e.message });
    }
  }
}

export default new OrderController();

