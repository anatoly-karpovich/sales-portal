import { Request, Response } from "express";
import OrderService from "../services/order.service";
import customerService from "../services/customer.service";
import { Types } from "mongoose";

class CustomerOrdersController {
  async getOrdersByCustomer(req: Request, res: Response) {
    try {
      const customerId = req.params.customerId;
      const customer = await customerService.getCustomer(new Types.ObjectId(customerId));
      if (!customer) {
        return res.status(404).json({
          IsSuccess: false,
          ErrorMessage: `Not found customer with ID: ${customerId}`,
        });
      }

      const orders = await OrderService.getOrdersByCustomer(customerId);

      if (!orders) {
        return res.status(404).json({
          IsSuccess: false,
          ErrorMessage: `Not found orders for customer with ID: ${customerId}`,
        });
      }

      return res.status(200).json({ Orders: orders, IsSuccess: true, ErrorMessage: null });
    } catch (error: any) {
      return res.status(500).json({
        IsSuccess: false,
        ErrorMessage: error.message,
      });
    }
  }
}

export default new CustomerOrdersController();

