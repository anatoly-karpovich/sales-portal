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
      const id = new Types.ObjectId(req.params.productId);
      const updatedProduct = await ProductsService.update({ ...req.body, _id: id });
      return res.json({ Product: updatedProduct, IsSuccess: true, ErrorMessage: null });
    } catch (e: any) {
      res.status(500).json({ IsSuccess: false, ErrorMessage: e.message });
    }
  }

  async delete(req: DeleteProductRequestDTO, res: Response<ProductResponseDTO | BaseResponseDTO>) {
    try {
      const id = new Types.ObjectId(req.params.productId);
      await ProductsService.delete(id);
      return res.status(204).send();
    } catch (e: any) {
      res.status(500).json({ IsSuccess: false, ErrorMessage: e.message });
    }
  }

  async export(req: ExportProductsRequestDTO, res: Response) {
    try {
      const { format, fields, filters } = req.body ?? {};
      const exportResult = await ProductsService.exportProducts({
        format,
        fields: (fields ?? []) as string[],
        filters: filters
          ? {
              manufacturers: filters.manufacturer,
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

export default new ProductsController();

