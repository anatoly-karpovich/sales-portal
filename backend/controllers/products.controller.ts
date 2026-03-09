import ProductsService from "../services/products.service.js";
import { Request, Response } from "express";
import { Types } from "mongoose";
import { IProductFilters } from "../data/types/product.type.js";
import { BaseResponseDTO } from "../data/types/dto/common.dto.js";
import {
  CreateProductRequestDTO,
  DeleteProductRequestDTO,
  ExportProductsRequestDTO,
  GetProductRequestWithEntityDTO,
  GetProductsSortedRequestDTO,
  ProductResponseDTO,
  ProductsResponseDTO,
  ProductsSortedResponseDTO,
  UpdateProductRequestDTO,
} from "../data/types/dto/products.dto.js";

const MIN_LIMIT = 10;
const MAX_LIMIT = 100;

class ProductsController {
  private readonly exportableFields = new Set(["_id", "name", "amount", "price", "manufacturer", "createdOn", "notes"]);

  async create(req: CreateProductRequestDTO, res: Response<ProductResponseDTO | BaseResponseDTO>) {
    try {
      const product = await ProductsService.create(req.body);
      res.status(201).json({ Product: product, IsSuccess: true, ErrorMessage: null });
    } catch (e: any) {
      res.status(500).json({ IsSuccess: false, ErrorMessage: e.message });
    }
  }

  async getAllSorted(
    req: GetProductsSortedRequestDTO,
    res: Response<ProductsSortedResponseDTO | BaseResponseDTO>
  ): Promise<Response> {
    try {
      const {
        search = "",
        sortField = "createdOn",
        sortOrder = "desc",
        manufacturer,
        page = "1",
        limit = MIN_LIMIT,
      } = req.query;

      const pageNumber = Math.max(parseInt(page), 1);
      const limitNumber = Math.min(Math.max(+limit, MIN_LIMIT), MAX_LIMIT);
      const skip = (pageNumber - 1) * limitNumber;

      const manufacturers = Array.isArray(manufacturer)
        ? (manufacturer as unknown[]).filter((item): item is string => typeof item === "string")
        : typeof manufacturer === "string"
        ? [manufacturer]
        : [];

      const filters: IProductFilters = {
        manufacturers: manufacturers as string[],
        search,
      };

      const sortOptions = {
        sortField: sortField as "name" | "price" | "manufacturer" | "createdOn",
        sortOrder: sortOrder as "asc" | "desc",
      };

      const { products, total } = await ProductsService.getSorted(filters, sortOptions, {
        skip,
        limit: limitNumber,
      });

      return res.json({
        Products: products,
        total,
        page: pageNumber,
        limit: limitNumber,
        search,
        manufacturer: manufacturers,
        sorting: sortOptions,
        IsSuccess: true,
        ErrorMessage: null,
      });
    } catch (e: any) {
      return res.status(500).json({ IsSuccess: false, ErrorMessage: e.message });
    }
  }

  async getProduct(req: GetProductRequestWithEntityDTO, res: Response<ProductResponseDTO | BaseResponseDTO>) {
    try {
      const product = req.product;
      if (!product) {
        return res.status(404).json({ IsSuccess: false, ErrorMessage: "Product was not found" });
      }
      return res.json({ Product: product, IsSuccess: true, ErrorMessage: null });
    } catch (e: any) {
      res.status(500).json({ IsSuccess: false, ErrorMessage: e.message });
    }
  }

  async getAll(req: Request, res: Response<ProductsResponseDTO | BaseResponseDTO>) {
    try {
      const products = await ProductsService.getAll();
      return res.json({ Products: products, IsSuccess: true, ErrorMessage: null });
    } catch (e: any) {
      res.status(500).json({ IsSuccess: false, ErrorMessage: e.message });
    }
  }

  async update(req: UpdateProductRequestDTO, res: Response<ProductResponseDTO | BaseResponseDTO>) {
    try {
      const id = new Types.ObjectId(req.params.id);
      const updatedProduct = await ProductsService.update({ ...req.body, _id: id });
      return res.json({ Product: updatedProduct, IsSuccess: true, ErrorMessage: null });
    } catch (e: any) {
      res.status(500).json({ IsSuccess: false, ErrorMessage: e.message });
    }
  }

  async delete(req: DeleteProductRequestDTO, res: Response<ProductResponseDTO | BaseResponseDTO>) {
    try {
      const id = new Types.ObjectId(req.params.id);
      const product = await ProductsService.delete(id);
      return res.status(204).json({ Product: product, IsSuccess: true, ErrorMessage: null });
    } catch (e: any) {
      res.status(500).json({ IsSuccess: false, ErrorMessage: e.message });
    }
  }

  async export(req: ExportProductsRequestDTO, res: Response) {
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

      const products = await ProductsService.getForExport({
        manufacturers: filters?.manufacturer ?? [],
        search: filters?.search ?? "",
        sortField: filters?.sortField ?? "createdOn",
        sortOrder: filters?.sortOrder ?? "desc",
      });

      const exportRows = products.map((product) => this.pickFields(product, fields));
      const timestamp = this.getTimestampForFilename();
      const fileName = `products-export-${timestamp}.${format}`;

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

  private pickFields(product: any, fields: string[]) {
    return fields.reduce<Record<string, unknown>>((acc, field) => {
      const value = product[field];
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
          .join(","),
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

export default new ProductsController();

