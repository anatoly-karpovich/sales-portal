import OrderService from "../services/order.service.js";
import { Request, Response } from "express";
import mongoose from "mongoose";
import { getDataDataFromToken, getTokenFromRequest } from "../utils/utils.js";
import { GetOrderByIdRequestDTO } from "../data/types/dto/orders.dto.js";

const MIN_LIMIT = 10;
const MAX_LIMIT = 100;

class OrderController {
  async create(req: Request, res: Response) {
    try {
      const token = getTokenFromRequest(req);
      const userData = getDataDataFromToken(token);
      const order = await OrderService.create(req.body, userData.id);
      res.status(201).json({ Order: order, IsSuccess: true, ErrorMessage: null });
    } catch (e: any) {
      console.log(e);
      res.status(500).json({ IsSuccess: false, ErrorMessage: e.message });
    }
  }

  async getAll(req: Request, res: Response): Promise<Response> {
    try {
      const {
        search = "",
        sortField = "createdOn",
        sortOrder = "asc",
        page = "1",
        limit = MIN_LIMIT,
      } = req.query as Record<string, string | undefined>;

      const pageNumber = Math.max(parseInt(page), 1);
      const limitNumber = Math.min(Math.max(+limit, MIN_LIMIT), MAX_LIMIT);
      const skip = (pageNumber - 1) * limitNumber;

      const statuses = (
        Array.isArray(req.query.status) ? req.query.status : req.query.status ? [req.query.status] : []
      ) as string[];

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

  async getOrder(req: GetOrderByIdRequestDTO, res: Response) {
    try {
      const id = new mongoose.Types.ObjectId(req.params.id);
      const order = req.body.order ? req.order : await OrderService.getOrder(id);
      res.status(200).json({ Order: order, IsSuccess: true, ErrorMessage: null });
    } catch (e: any) {
      console.log(e);
      res.status(500).json({ IsSuccess: false, ErrorMessage: e.message });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const token = getTokenFromRequest(req);
      const userData = getDataDataFromToken(token);
      const orderId = new mongoose.Types.ObjectId(req.params.id);
      const updatedOrder = await OrderService.update(orderId, req.body, userData.id);
      return res.status(200).json({ Order: updatedOrder, IsSuccess: true, ErrorMessage: null });
    } catch (e: any) {
      console.log(e);
      res.status(500).json({ IsSuccess: false, ErrorMessage: e.message });
    }
  }

  async delete(req: Request, res: Response): Promise<Response<any, Record<string, any>>> {
    try {
      const id = new mongoose.Types.ObjectId(req.params.id);
      const order = await OrderService.delete(id);
      return res.status(204).json({ Order: order, IsSuccess: false, ErrorMessage: null });
    } catch (e: any) {
      console.log(e);
      res.status(500).json({ IsSuccess: false, ErrorMessage: e.message });
    }
  }

  async assignManager(req: Request, res: Response) {
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

  async unassignManager(req: Request, res: Response) {
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
