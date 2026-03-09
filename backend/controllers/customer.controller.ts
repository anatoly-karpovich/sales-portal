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
  private readonly exportableFields = new Set([
    "_id",
    "email",
    "name",
    "country",
    "city",
    "street",
    "house",
    "flat",
    "phone",
    "createdOn",
    "notes",
  ]);

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
      const id = new Types.ObjectId(req.params.id);
      const updatedCustomer = await CustomerService.update({ ...req.body, ...{ _id: id } });
      return res.json({ Customer: updatedCustomer, IsSuccess: true, ErrorMessage: null });
    } catch (e: any) {
      res.status(500).json({ IsSuccess: false, ErrorMessage: e.message });
    }
  }

  async delete(req: DeleteCustomerRequestDTO, res: Response<CustomerResponseDTO | BaseResponseDTO>) {
    try {
      const id = new Types.ObjectId(req.params.id);
      const customer = await CustomerService.delete(id);
      return res.status(204).json({ Customer: customer, IsSuccess: true, ErrorMessage: null });
    } catch (e: any) {
      res.status(500).json({ IsSuccess: false, ErrorMessage: e.message });
    }
  }

  async export(req: ExportCustomersRequestDTO, res: Response) {
    try {
      const { format, fields, filters } = req.body ?? {};

      if (!format || !["csv", "json"].includes(format)) {
        return res.status(400).json({ IsSuccess: false, ErrorMessage: "Invalid export format" });
      }

      if (!Array.isArray(fields) || fields.length === 0) {
        return res.status(400).json({ IsSuccess: false, ErrorMessage: "Fields are required" });
      }

      const invalidField = fields.find((field) => !this.exportableFields.has(field));
      if (invalidField) {
        return res.status(400).json({ IsSuccess: false, ErrorMessage: `Unsupported field '${invalidField}'` });
      }

      const customers = await CustomerService.getForExport({
        country: filters?.country ?? [],
        search: filters?.search ?? "",
        sortField: filters?.sortField ?? "createdOn",
        sortOrder: filters?.sortOrder ?? "desc",
      });

      const exportRows = customers.map((customer) => this.pickFields(customer, fields));
      const timestamp = this.getTimestampForFilename();
      const fileName = `customers-export-${timestamp}.${format}`;

      if (format === "json") {
        const jsonData = JSON.stringify(exportRows, null, 2);
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
        return res.status(200).send(jsonData);
      }

      const csvData = this.convertToCsv(exportRows, fields);
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
      return res.status(200).send(`\uFEFF${csvData}`);
    } catch (e: any) {
      return res.status(500).json({ IsSuccess: false, ErrorMessage: e.message });
    }
  }

  private pickFields(customer: any, fields: string[]) {
    return fields.reduce<Record<string, unknown>>((acc, field) => {
      const value = customer[field];
      acc[field] = value instanceof Types.ObjectId ? value.toString() : value ?? "";
      return acc;
    }, {});
  }

  private convertToCsv(rows: Record<string, unknown>[], fields: string[]): string {
    const header = fields.map((field) => this.escapeCsvValue(field)).join(",");
    const body = rows
      .map((row) =>
        fields
          .map((field) => {
            const value = row[field];
            return this.escapeCsvValue(value === null || value === undefined ? "" : String(value));
          })
          .join(",")
      )
      .join("\n");

    return `${header}\n${body}`;
  }

  private escapeCsvValue(value: string): string {
    const escaped = value.replace(/"/g, '""');
    return /[",\n]/.test(escaped) ? `"${escaped}"` : escaped;
  }

  private getTimestampForFilename(): string {
    return new Date().toISOString().replace(/[:]/g, "-").slice(0, 19);
  }
}

export default new CustomerController();

