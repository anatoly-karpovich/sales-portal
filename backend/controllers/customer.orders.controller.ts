import { Response } from "express";
import OrderService from "../services/order.service";
import { BaseResponseDTO } from "../data/types/dto/common.dto.js";
import { GetCustomerByIdRequestDTO } from "../data/types/dto/customers.dto.js";
import { IOrder, IOrderCustomerSnapshot } from "../data/types/order.type.js";

type CustomerOrdersResponseDTO = BaseResponseDTO & {
  Orders: IOrder<IOrderCustomerSnapshot>[];
};

class CustomerOrdersController {
  async getOrdersByCustomer(
    req: GetCustomerByIdRequestDTO,
    res: Response<CustomerOrdersResponseDTO | BaseResponseDTO>,
  ) {
    try {
      const customerId = req.params.customerId;
      if (!req.customer) {
        return res.status(404).json({
          IsSuccess: false,
          ErrorMessage: `Not found customer with ID: ${customerId}`,
        });
      }

      const orders = await OrderService.getOrdersByCustomer(customerId);

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

