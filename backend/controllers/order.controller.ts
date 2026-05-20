import OrderService from "../services/order.service.js";
import { Request, Response } from "express";
import { Types } from "mongoose";
import { getDataDataFromToken, getTokenFromRequest } from "../utils/utils.js";
import { BaseResponseDTO } from "../data/types/dto/common.dto.js";
import {
  AddOrderProductRequestDTO,
  AssignManagerRequestDTO,
  CreateOrderRequestDTO,
  DeleteOrderProductRequestDTO,
  DeleteOrderRequestDTO,
  ExportOrdersRequestDTO,
  GetOrderRequestWithEntityDTO,
  GetOrdersSortedRequestDTO,
  OrderResponseDTO,
  OrdersSortedResponseDTO,
  ReplaceOrderCustomerRequestDTO,
  ReplaceOrderProductRequestDTO,
  UnassignManagerRequestDTO,
  UpdateOrderRequestDTO,
} from "../data/types/dto/orders.dto.js";
import { IOrderRequest, IOrderUpdateRequest } from "../data/types/order.type.js";

const MIN_LIMIT = 10;
const MAX_LIMIT = 100;

class OrderController {
  private mapOrderProductRequestItem(item: { productId: string; variantId: string; quantity: number }) {
    return {
      productId: new Types.ObjectId(item.productId),
      variantId: new Types.ObjectId(item.variantId),
      quantity: item.quantity,
    };
  }

  private mapCreateOrderRequestBody(body: CreateOrderRequestDTO["body"]): IOrderRequest {
    return {
      customer: new Types.ObjectId(body.customer),
      products: body.products.map((item) => this.mapOrderProductRequestItem(item)),
    };
  }

  private mapUpdateOrderRequestBody(body: UpdateOrderRequestDTO["body"]): IOrderUpdateRequest {
    const updatePayload: IOrderUpdateRequest = {};

    if (typeof body.customer === "string") {
      updatePayload.customer = new Types.ObjectId(body.customer);
    }

    if (Array.isArray(body.products)) {
      updatePayload.products = body.products.map((item) => this.mapOrderProductRequestItem(item));
    }

    return updatePayload;
  }

  async create(req: CreateOrderRequestDTO, res: Response<OrderResponseDTO | BaseResponseDTO>) {
    try {
      const token = getTokenFromRequest(req);
      const managerData = getDataDataFromToken(token);
      const order = await OrderService.create(this.mapCreateOrderRequestBody(req.body), managerData.id);
      res.status(201).json({ Order: order, IsSuccess: true, ErrorMessage: null });
    } catch (e: any) {
      const statusCode = typeof e?.statusCode === "number" ? e.statusCode : 500;
      res.status(statusCode).json({ IsSuccess: false, ErrorMessage: e.message });
    }
  }

  async getAll(
    req: GetOrdersSortedRequestDTO,
    res: Response<OrdersSortedResponseDTO | BaseResponseDTO>,
  ): Promise<Response> {
    try {
      const {
        search = "",
        sortField = "createdOn",
        sortOrder = "asc",
        status,
        deliveryStatus,
        page = "1",
        limit = MIN_LIMIT,
      } = req.query;

      const pageNumber = Math.max(parseInt(page), 1);
      const limitNumber = Math.min(Math.max(+limit, MIN_LIMIT), MAX_LIMIT);
      const skip = (pageNumber - 1) * limitNumber;

      const statuses = (Array.isArray(status) ? status : status ? [status] : []) as string[];
      const deliveryStatuses = (
        Array.isArray(deliveryStatus) ? deliveryStatus : deliveryStatus ? [deliveryStatus] : []
      ) as string[];

      const filters = { search, status: statuses, deliveryStatus: deliveryStatuses };
      const sortOptions = { sortField, sortOrder };

      const { orders, total } = await OrderService.getSorted(filters, sortOptions, { skip, limit: limitNumber });

      return res.status(200).json({
        Orders: orders,
        total,
        page: pageNumber,
        limit: limitNumber,
        search,
        status: statuses,
        deliveryStatus: deliveryStatuses,
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
      const managerData = getDataDataFromToken(token);
      if (!req.order) {
        return res.status(404).json({ IsSuccess: false, ErrorMessage: `Order with id '${req.params.orderId}' wasn't found` });
      }
      const orderId = new Types.ObjectId(req.params.orderId);
      const updatedOrder = await OrderService.update(
        orderId,
        this.mapUpdateOrderRequestBody(req.body),
        managerData.id,
        req.order,
      );
      return res.status(200).json({ Order: updatedOrder, IsSuccess: true, ErrorMessage: null });
    } catch (e: any) {
      const statusCode = typeof e?.statusCode === "number" ? e.statusCode : 500;
      res.status(statusCode).json({ IsSuccess: false, ErrorMessage: e.message });
    }
  }

  async addProduct(req: AddOrderProductRequestDTO, res: Response<OrderResponseDTO | BaseResponseDTO>) {
    try {
      const token = getTokenFromRequest(req);
      const managerData = getDataDataFromToken(token);
      if (!req.order) {
        return res.status(404).json({ IsSuccess: false, ErrorMessage: `Order with id '${req.params.orderId}' wasn't found` });
      }

      const orderId = new Types.ObjectId(req.params.orderId);
      const updatedOrder = await OrderService.addProduct(
        orderId,
        this.mapOrderProductRequestItem(req.body),
        managerData.id,
        req.order,
      );

      return res.status(200).json({ Order: updatedOrder, IsSuccess: true, ErrorMessage: null });
    } catch (e: any) {
      const statusCode = typeof e?.statusCode === "number" ? e.statusCode : 500;
      return res.status(statusCode).json({ IsSuccess: false, ErrorMessage: e.message });
    }
  }

  async replaceProduct(req: ReplaceOrderProductRequestDTO, res: Response<OrderResponseDTO | BaseResponseDTO>) {
    try {
      const token = getTokenFromRequest(req);
      const managerData = getDataDataFromToken(token);
      if (!req.order) {
        return res.status(404).json({ IsSuccess: false, ErrorMessage: `Order with id '${req.params.orderId}' wasn't found` });
      }

      const orderId = new Types.ObjectId(req.params.orderId);
      const updatedOrder = await OrderService.replaceProduct(
        orderId,
        {
          productId: new Types.ObjectId(req.body.from.productId),
          variantId: new Types.ObjectId(req.body.from.variantId),
        },
        this.mapOrderProductRequestItem(req.body.to),
        managerData.id,
        req.order,
      );

      return res.status(200).json({ Order: updatedOrder, IsSuccess: true, ErrorMessage: null });
    } catch (e: any) {
      const statusCode = typeof e?.statusCode === "number" ? e.statusCode : 500;
      return res.status(statusCode).json({ IsSuccess: false, ErrorMessage: e.message });
    }
  }

  async deleteProduct(req: DeleteOrderProductRequestDTO, res: Response<OrderResponseDTO | BaseResponseDTO>) {
    try {
      const token = getTokenFromRequest(req);
      const managerData = getDataDataFromToken(token);
      if (!req.order) {
        return res.status(404).json({ IsSuccess: false, ErrorMessage: `Order with id '${req.params.orderId}' wasn't found` });
      }

      const orderId = new Types.ObjectId(req.params.orderId);
      const updatedOrder = await OrderService.deleteProduct(
        orderId,
        {
          productId: new Types.ObjectId(req.body.productId),
          variantId: new Types.ObjectId(req.body.variantId),
        },
        managerData.id,
        req.order,
      );

      return res.status(200).json({ Order: updatedOrder, IsSuccess: true, ErrorMessage: null });
    } catch (e: any) {
      const statusCode = typeof e?.statusCode === "number" ? e.statusCode : 500;
      return res.status(statusCode).json({ IsSuccess: false, ErrorMessage: e.message });
    }
  }

  async replaceCustomer(req: ReplaceOrderCustomerRequestDTO, res: Response<OrderResponseDTO | BaseResponseDTO>) {
    try {
      const token = getTokenFromRequest(req);
      const managerData = getDataDataFromToken(token);
      if (!req.order) {
        return res.status(404).json({ IsSuccess: false, ErrorMessage: `Order with id '${req.params.orderId}' wasn't found` });
      }

      const orderId = new Types.ObjectId(req.params.orderId);
      const customerId = new Types.ObjectId(req.params.customerId);
      const updatedOrder = await OrderService.replaceCustomer(orderId, customerId, managerData.id, req.order);
      return res.status(200).json({ Order: updatedOrder, IsSuccess: true, ErrorMessage: null });
    } catch (e: any) {
      const statusCode = typeof e?.statusCode === "number" ? e.statusCode : 500;
      return res.status(statusCode).json({ IsSuccess: false, ErrorMessage: e.message });
    }
  }

  async delete(req: DeleteOrderRequestDTO, res: Response<OrderResponseDTO | BaseResponseDTO>): Promise<Response> {
    try {
      const token = getTokenFromRequest(req);
      const managerData = getDataDataFromToken(token);
      const id = new Types.ObjectId(req.params.orderId);
      await OrderService.delete(id, managerData.id);
      return res.status(204).send();
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
      if (!req.order) {
        return res.status(404).json({ IsSuccess: false, ErrorMessage: `Order with id '${orderId}' wasn't found` });
      }

      const order = await OrderService.assignManager(orderId, managerId, performerData.id, req.order);
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
      if (!req.order) {
        return res.status(404).json({ IsSuccess: false, ErrorMessage: `Order with id '${orderId}' wasn't found` });
      }

      const order = await OrderService.unassignManager(orderId, performerData.id, req.order);
      res.status(200).json({ Order: order, IsSuccess: true, ErrorMessage: null });
    } catch (e: any) {
      console.log(e);
      res.status(500).json({ IsSuccess: false, ErrorMessage: e.message });
    }
  }

  async export(req: ExportOrdersRequestDTO, res: Response) {
    try {
      const { format, fields, filters } = req.body ?? {};
      const exportResult = await OrderService.exportOrders({
        format,
        fields: (fields ?? []) as string[],
        filters: filters
          ? {
              search: filters.search,
              status: filters.status,
              deliveryStatus: filters.deliveryStatus,
              page: filters.page,
              limit: filters.limit,
              sortField: filters.sortField,
              sortOrder: filters.sortOrder,
            }
          : null,
      });

      res.setHeader("Content-Type", exportResult.contentType);
      res.setHeader("Content-Disposition", `attachment; filename="${exportResult.fileName}"`);
      return res.status(200).send(exportResult.content);
    } catch (e: any) {
      if (typeof e?.message === "string" && e.message.startsWith("EXPORT_VALIDATION:")) {
        return res.status(400).json({ IsSuccess: false, ErrorMessage: e.message.replace("EXPORT_VALIDATION:", "") });
      }
      return res.status(500).json({ IsSuccess: false, ErrorMessage: e.message });
    }
  }
}

export default new OrderController();

