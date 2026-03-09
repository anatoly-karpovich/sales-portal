import CustomerService from "../services/customer.service";
import { Request, Response } from "express";
import { Types } from "mongoose";
import { BaseResponseDTO } from "../data/types/dto/common.dto.js";
import {
  CreateCustomerRequestDTO,
  CustomerResponseDTO,
  CustomersResponseDTO,
  CustomersSortedResponseDTO,
  DeleteCustomerRequestDTO,
  ExportCustomersRequestDTO,
  GetCustomerRequestWithEntityDTO,
  GetCustomersSortedRequestDTO,
  UpdateCustomerRequestDTO,
} from "../data/types/dto/customers.dto.js";

const MIN_LIMIT = 10;
const MAX_LIMIT = 100;

class CustomerController {
  async create(req: CreateCustomerRequestDTO, res: Response<CustomerResponseDTO | BaseResponseDTO>) {
    try {
      const customer = await CustomerService.create(req.body);
      res.status(201).json({ Customer: customer, IsSuccess: true, ErrorMessage: null });
    } catch (e: any) {
      res.status(500).json({ IsSuccess: false, ErrorMessage: e.message });
    }
  }

  async getAllSorted(
    req: GetCustomersSortedRequestDTO,
    res: Response<CustomersSortedResponseDTO | BaseResponseDTO>
  ): Promise<Response> {
    try {
      const {
        search = "",
        sortField = "createdOn",
        sortOrder = "desc",
        country,
        page = "1",
        limit = MIN_LIMIT,
      } = req.query;

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

  async getAll(req: Request, res: Response<CustomersResponseDTO | BaseResponseDTO>) {
    try {
      const customers = await CustomerService.getAll();
      return res.json({ Customers: customers, IsSuccess: true, ErrorMessage: null });
    } catch (e: any) {
      res.status(500).json({ IsSuccess: false, ErrorMessage: e.message });
    }
  }

  async getCustomer(req: GetCustomerRequestWithEntityDTO, res: Response<CustomerResponseDTO | BaseResponseDTO>) {
    try {
      const customer = req.customer;
      if (!customer) {
        return res.status(404).json({ IsSuccess: false, ErrorMessage: "Customer was not found" });
      }
      return res.json({ Customer: customer, IsSuccess: true, ErrorMessage: null });
    } catch (e: any) {
      res.status(500).json({ IsSuccess: false, ErrorMessage: e.message });
    }
  }

  async update(req: UpdateCustomerRequestDTO, res: Response<CustomerResponseDTO | BaseResponseDTO>) {
    try {
      const id = new Types.ObjectId(req.params.customerId);
      const updatedCustomer = await CustomerService.update({ ...req.body, ...{ _id: id } });
      return res.json({ Customer: updatedCustomer, IsSuccess: true, ErrorMessage: null });
    } catch (e: any) {
      res.status(500).json({ IsSuccess: false, ErrorMessage: e.message });
    }
  }

  async delete(req: DeleteCustomerRequestDTO, res: Response<CustomerResponseDTO | BaseResponseDTO>) {
    try {
      const id = new Types.ObjectId(req.params.customerId);
      await CustomerService.delete(id);
      return res.status(204).send();
    } catch (e: any) {
      res.status(500).json({ IsSuccess: false, ErrorMessage: e.message });
    }
  }

  async export(req: ExportCustomersRequestDTO, res: Response) {
    try {
      const { format, fields, filters } = req.body ?? {};
      const exportResult = await CustomerService.exportCustomers({
        format,
        fields: (fields ?? []) as string[],
        filters: filters
          ? {
              country: filters.country,
              search: filters.search,
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

export default new CustomerController();

