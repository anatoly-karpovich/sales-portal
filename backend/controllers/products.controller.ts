import ProductsService from "../services/products.service.js";
import { Request, Response } from "express";
import { Types } from "mongoose";
import { IProductFilters } from "../data/types/product.type.js";
import { BaseResponseDTO } from "../data/types/dto/common.dto.js";
import {
  CreateProductVariantsRequestDTO,
  CreateProductRequestDTO,
  DeleteProductRequestDTO,
  DeleteProductVariantRequestDTO,
  ExportProductsRequestDTO,
  GetProductRequestWithEntityDTO,
  GetProductsSortedRequestDTO,
  PatchProductStatusRequestDTO,
  PatchProductRequestDTO,
  PatchProductVariantStatusRequestDTO,
  PatchProductVariantRequestDTO,
  ReplaceProductVariantsRequestDTO,
  ProductDetailsDTO,
  ProductResponseDTO,
  ProductsResponseDTO,
  ProductsSortedResponseDTO,
  ReplaceProductRequestDTO,
  ValidateProductVariantsRequestDTO,
} from "../data/types/dto/products.dto.js";
import { PRODUCT_STATUSES } from "../data/enums.js";

const MIN_LIMIT = 10;
const MAX_LIMIT = 100;

class ProductsController {
  private toDetailsDTO(product: any): ProductDetailsDTO {
    const prices = product.variants.map((variant: any) => variant.price);
    return {
      _id: product._id.toString(),
      name: product.name,
      manufacturer: product.manufacturer,
      category: product.category,
      description: product.description,
      imageUrl: product.imageUrl,
      status: product.status,
      attributes: product.attributes,
      variants: product.variants.map((variant: any) => ({
        ...variant,
        _id: variant._id ? new Types.ObjectId(variant._id) : undefined,
      })),
      priceRange: {
        min: Math.min(...prices),
        max: Math.max(...prices),
      },
      createdOn: product.createdOn,
      updatedOn: product.updatedOn,
    };
  }

  async create(req: CreateProductRequestDTO, res: Response<ProductResponseDTO | BaseResponseDTO>) {
    try {
      const product = await ProductsService.create(req.body);
      res.status(201).json({ Product: this.toDetailsDTO(product), IsSuccess: true, ErrorMessage: null });
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
        status,
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

      const statuses = Array.isArray(status)
        ? (status as unknown[]).filter((item): item is PRODUCT_STATUSES => Object.values(PRODUCT_STATUSES).includes(item as PRODUCT_STATUSES))
        : typeof status === "string" && Object.values(PRODUCT_STATUSES).includes(status as PRODUCT_STATUSES)
          ? [status as PRODUCT_STATUSES]
          : [];

      const filters: IProductFilters = {
        manufacturers,
        statuses,
        search,
      };

      const sortOptions = {
        sortField: sortField as "name" | "price" | "manufacturer" | "category" | "status" | "createdOn",
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
        status: statuses,
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
      return res.json({ Product: this.toDetailsDTO(product), IsSuccess: true, ErrorMessage: null });
    } catch (e: any) {
      res.status(500).json({ IsSuccess: false, ErrorMessage: e.message });
    }
  }

  async getAll(req: Request, res: Response<ProductsResponseDTO | BaseResponseDTO>) {
    try {
      const products = await ProductsService.getAll();
      return res.json({ Products: products.map((product) => this.toDetailsDTO(product)), IsSuccess: true, ErrorMessage: null });
    } catch (e: any) {
      res.status(500).json({ IsSuccess: false, ErrorMessage: e.message });
    }
  }

  async replace(req: ReplaceProductRequestDTO, res: Response<ProductResponseDTO | BaseResponseDTO>) {
    try {
      const id = new Types.ObjectId(req.params.productId);
      const updatedProduct = await ProductsService.replace(id, req.body);
      return res.json({ Product: this.toDetailsDTO(updatedProduct), IsSuccess: true, ErrorMessage: null });
    } catch (e: any) {
      res.status(500).json({ IsSuccess: false, ErrorMessage: e.message });
    }
  }

  async patch(req: PatchProductRequestDTO, res: Response<ProductResponseDTO | BaseResponseDTO>) {
    try {
      const id = new Types.ObjectId(req.params.productId);
      const updatedProduct = await ProductsService.patch(id, req.body);
      return res.json({ Product: this.toDetailsDTO(updatedProduct), IsSuccess: true, ErrorMessage: null });
    } catch (e: any) {
      res.status(500).json({ IsSuccess: false, ErrorMessage: e.message });
    }
  }

  async patchVariant(req: PatchProductVariantRequestDTO, res: Response<ProductResponseDTO | BaseResponseDTO>) {
    try {
      const productId = new Types.ObjectId(req.params.productId);
      const variantId = new Types.ObjectId(req.params.variantId);
      const updatedProduct = await ProductsService.patchVariant(productId, variantId, req.body);
      return res.json({ Product: this.toDetailsDTO(updatedProduct), IsSuccess: true, ErrorMessage: null });
    } catch (e: any) {
      res.status(500).json({ IsSuccess: false, ErrorMessage: e.message });
    }
  }

  async replaceVariants(req: ReplaceProductVariantsRequestDTO, res: Response<ProductResponseDTO | BaseResponseDTO>) {
    try {
      const productId = new Types.ObjectId(req.params.productId);
      const updatedProduct = await ProductsService.replaceVariants(productId, req.body);
      return res.json({ Product: this.toDetailsDTO(updatedProduct), IsSuccess: true, ErrorMessage: null });
    } catch (e: any) {
      res.status(500).json({ IsSuccess: false, ErrorMessage: e.message });
    }
  }

  async createVariants(req: CreateProductVariantsRequestDTO, res: Response<ProductResponseDTO | BaseResponseDTO>) {
    try {
      const productId = new Types.ObjectId(req.params.productId);
      const updatedProduct = await ProductsService.createVariants(productId, req.body);
      return res.status(201).json({ Product: this.toDetailsDTO(updatedProduct), IsSuccess: true, ErrorMessage: null });
    } catch (e: any) {
      res.status(500).json({ IsSuccess: false, ErrorMessage: e.message });
    }
  }

  async validateVariants(req: ValidateProductVariantsRequestDTO, res: Response<ProductResponseDTO | BaseResponseDTO>) {
    try {
      const productId = new Types.ObjectId(req.params.productId);
      const previewProduct = await ProductsService.previewWithVariants(productId, req.body);
      return res.status(200).json({ Product: this.toDetailsDTO(previewProduct), IsSuccess: true, ErrorMessage: null });
    } catch (e: any) {
      return res.status(500).json({ IsSuccess: false, ErrorMessage: e.message });
    }
  }

  async patchStatus(req: PatchProductStatusRequestDTO, res: Response<ProductResponseDTO | BaseResponseDTO>) {
    try {
      const productId = new Types.ObjectId(req.params.productId);
      const updatedProduct = await ProductsService.patchStatus(productId, req.body.status);
      return res.status(200).json({ Product: this.toDetailsDTO(updatedProduct), IsSuccess: true, ErrorMessage: null });
    } catch (e: any) {
      return res.status(500).json({ IsSuccess: false, ErrorMessage: e.message });
    }
  }

  async patchVariantStatus(req: PatchProductVariantStatusRequestDTO, res: Response<ProductResponseDTO | BaseResponseDTO>) {
    try {
      const productId = new Types.ObjectId(req.params.productId);
      const variantId = new Types.ObjectId(req.params.variantId);
      const updatedProduct = await ProductsService.patchVariantStatus(productId, variantId, req.body.status);
      return res.status(200).json({ Product: this.toDetailsDTO(updatedProduct), IsSuccess: true, ErrorMessage: null });
    } catch (e: any) {
      return res.status(500).json({ IsSuccess: false, ErrorMessage: e.message });
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

  async deleteVariant(req: DeleteProductVariantRequestDTO, res: Response<ProductResponseDTO | BaseResponseDTO>) {
    try {
      const productId = new Types.ObjectId(req.params.productId);
      const variantId = new Types.ObjectId(req.params.variantId);
      await ProductsService.deleteVariant(productId, variantId);
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
              statuses: filters.status,
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
