import CustomerService from "../services/customer.service";
import { Request, Response } from "express";
import { Types } from "mongoose";
import { BaseResponseDTO } from "../data/types/dto/common.dto.js";
import {
  CustomerByIdParamsDTO,
  CustomerCreateOrUpdateRequestDTO,
  CustomerResponseDTO,
  CustomersListResponseDTO,
  GetCustomerByIdRequestDTO,
} from "../data/types/dto/customers.dto.js";

const MIN_LIMIT = 10;
const MAX_LIMIT = 100;

class CustomerController {
  async create(
    req: Request<unknown, unknown, CustomerCreateOrUpdateRequestDTO>,
    res: Response<CustomerResponseDTO | BaseResponseDTO>
  ) {
    try {
      const customer = await CustomerService.create(req.body);
      res.status(201).json({ Customer: customer, IsSuccess: true, ErrorMessage: null });
    } catch (e: any) {
      res.status(500).json({ IsSuccess: false, ErrorMessage: e.message });
    }
  }

  async getAllSorted(req: Request, res: Response<CustomersListResponseDTO | BaseResponseDTO>): Promise<Response> {
    try {
      const {
        search = "",
        sortField = "createdOn",
        sortOrder = "desc",
        country,
        page = "1",
        limit = MIN_LIMIT,
      } = req.query as Record<string, string | undefined>;

      const countries = (Array.isArray(country) ? country : country ? [country] : []) as string[];

      const pageNumber = Math.max(parseInt(page), 1);

      const limitNumber = Math.min(Math.max(+limit, MIN_LIMIT), MAX_LIMIT);
      const skip = (pageNumber - 1) * limitNumber;

      const { customers, total } = await CustomerService.getSorted(
        { search, country: countries },
        { sortField, sortOrder },
        { skip, limit: limitNumber }
      );

      return res.json({
        Customers: customers,
        total,
        page: pageNumber,
        limit: limitNumber,
        search,
        country: countries,
        sorting: { sortField, sortOrder },
        IsSuccess: true,
        ErrorMessage: null,
      });
    } catch (e: any) {
      return res.status(500).json({ IsSuccess: false, ErrorMessage: e.message });
    }
  }

  async getAll(req: Request, res: Response<CustomersListResponseDTO | BaseResponseDTO>) {
    try {
      const customers = await CustomerService.getAll();
      return res.json({ Customers: customers, IsSuccess: true, ErrorMessage: null });
    } catch (e: any) {
      res.status(500).json({ IsSuccess: false, ErrorMessage: e.message });
    }
  }

  async getCustomer(req: GetCustomerByIdRequestDTO, res: Response<CustomerResponseDTO | BaseResponseDTO>) {
    try {
      const customer = req.customer;
      return res.json({ Customer: customer, IsSuccess: true, ErrorMessage: null });
    } catch (e: any) {
      res.status(500).json({ IsSuccess: false, ErrorMessage: e.message });
    }
  }

  async update(
    req: Request<CustomerByIdParamsDTO, unknown, CustomerCreateOrUpdateRequestDTO>,
    res: Response<CustomerResponseDTO | BaseResponseDTO>
  ) {
    try {
      const id = new Types.ObjectId(req.params.id);
      const updatedCustomer = await CustomerService.update({ ...req.body, ...{ _id: id } });
      return res.json({ Customer: updatedCustomer, IsSuccess: true, ErrorMessage: null });
    } catch (e: any) {
      res.status(500).json({ IsSuccess: false, ErrorMessage: e.message });
    }
  }

  async delete(req: Request<CustomerByIdParamsDTO>, res: Response<CustomerResponseDTO | BaseResponseDTO>) {
    try {
      const id = new Types.ObjectId(req.params.id);
      const customer = await CustomerService.delete(id);
      return res.status(204).json({ Customer: customer, IsSuccess: true, ErrorMessage: null });
    } catch (e: any) {
      res.status(500).json({ IsSuccess: false, ErrorMessage: e.message });
    }
  }
}

export default new CustomerController();

