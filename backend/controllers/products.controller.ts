import ProductsService from "../services/products.service.js";
import { Response } from "express";
import { Types } from "mongoose";
import { IProductFilters } from "../data/types/product.type.js";
import { BaseResponseDTO } from "../data/types/dto/common.dto.js";
import {
  CreateProductVariantsRequestDTO,
  CreateProductRequestDTO,
  CompleteProductSetupRequestDTO,
  DeleteProductRequestDTO,
  DeleteProductVariantRequestDTO,
  ExportProductsRequestDTO,
  GetProductRequestWithEntityDTO,
  GetProductsSortedRequestDTO,
  PatchProductStatusRequestDTO,
  PatchProductRequestDTO,
  PatchProductVariantStatusRequestDTO,
  PatchProductVariantRequestDTO,
  ProductDetailsDTO,
  ProductResponseDTO,
  ProductsSortedResponseDTO,
  ProductCategoryPathItemDTO,
  ProductSetupInitRequestWithEntityDTO,
  ReorderProductAttributesRequestDTO,
  ReplaceProductSetupSpecRequestDTO,
  ReplaceProductVariantsRequestDTO,
} from "../data/types/dto/products.dto.js";
import { PRODUCT_STATUSES } from "../data/enums.js";
import CategoriesService from "../services/categories.service.js";
import { getDataDataFromToken, getTokenFromRequest } from "../utils/utils.js";

const MIN_LIMIT = 10;
const MAX_LIMIT = 100;

type CategoryLookupItem = {
  _id: string;
  name: string;
  slug: string;
  path: ProductCategoryPathItemDTO[];
};

class ProductsController {
  private parseOptionalPrice(value: unknown): number | undefined {
    if (typeof value !== "string") {
      return undefined;
    }

    const normalized = value.trim();
    if (!normalized) {
      return undefined;
    }

    const parsed = Number(normalized);
    if (!Number.isFinite(parsed)) {
      throw new Error("INVALID_PRICE_FILTER");
    }

    return parsed;
  }

  private async buildCategoryLookup(): Promise<Map<string, CategoryLookupItem>> {
    const categories = await CategoriesService.getFlat();
    return new Map(
      categories.map((category) => [
        category._id,
        {
          _id: category._id,
          name: category.name,
          slug: category.slug,
          path: category.path,
        },
      ]),
    );
  }

  private toDetailsDTO(product: any, categoryLookup: Map<string, CategoryLookupItem>): ProductDetailsDTO {
    const prices = product.variants.map((variant: any) => variant.price);
    const hasPrices = prices.length > 0;
    const categoryId = product.categoryId?.toString?.() ?? "";
    const rootCategoryId = product.rootCategoryId?.toString?.() ?? "";
    const category = categoryLookup.get(categoryId);
    const rootCategory = categoryLookup.get(rootCategoryId);
    const categoryPath = category?.path.map((item) => item.name).join(" / ") ?? "";

    return {
      _id: product._id.toString(),
      name: product.name,
      manufacturer: product.manufacturer,
      categoryId,
      rootCategoryId,
      categoryPath,
      category: category
        ? {
            _id: category._id,
            name: category.name,
            slug: category.slug,
            path: category.path,
          }
        : null,
      rootCategory: rootCategory
        ? {
            _id: rootCategory._id,
            name: rootCategory.name,
            slug: rootCategory.slug,
          }
        : null,
      description: product.description,
      imageUrl: product.imageUrl,
      status: product.status,
      attributes: product.attributes,
      variants: product.variants.map((variant: any) => ({
        ...variant,
        _id: variant._id ? new Types.ObjectId(variant._id) : undefined,
      })),
      priceRange: {
        min: hasPrices ? Math.min(...prices) : 0,
        max: hasPrices ? Math.max(...prices) : 0,
      },
      setup: {
        initCompleted: Boolean(product.setup?.initCompleted),
        specCompleted: Boolean(product.setup?.specCompleted),
        inventoryCompleted: Boolean(product.setup?.inventoryCompleted),
        completed: Boolean(product.setup?.completed),
        completedOn: product.setup?.completedOn,
        completedBy: product.setup?.completedBy?.toString?.(),
      },
      createdOn: product.createdOn,
      updatedOn: product.updatedOn,
    };
  }

  async create(req: CreateProductRequestDTO, res: Response<ProductResponseDTO | BaseResponseDTO>) {
    try {
      const product = await ProductsService.create(req.body);
      const categoryLookup = await this.buildCategoryLookup();
      res.status(201).json({ Product: this.toDetailsDTO(product, categoryLookup), IsSuccess: true, ErrorMessage: null });
    } catch (e: any) {
      res.status(500).json({ IsSuccess: false, ErrorMessage: e.message });
    }
  }

  async createSetupInit(req: ProductSetupInitRequestWithEntityDTO, res: Response<ProductResponseDTO | BaseResponseDTO>) {
    try {
      const product = await ProductsService.createSetupInit(req.body);
      const categoryLookup = await this.buildCategoryLookup();
      return res.status(201).json({ Product: this.toDetailsDTO(product, categoryLookup), IsSuccess: true, ErrorMessage: null });
    } catch (e: any) {
      const statusCode = typeof e?.statusCode === "number" ? e.statusCode : 500;
      return res.status(statusCode).json({ IsSuccess: false, ErrorMessage: e.message });
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
        categoryId,
        rootCategoryId,
        minPrice,
        maxPrice,
        page = "1",
        limit = MIN_LIMIT,
      } = req.query;

      if (typeof categoryId === "string" && categoryId.trim() !== "" && !Types.ObjectId.isValid(categoryId.trim())) {
        return res.status(400).json({ IsSuccess: false, ErrorMessage: "categoryId must be a valid ObjectId" });
      }
      if (
        typeof rootCategoryId === "string" &&
        rootCategoryId.trim() !== "" &&
        !Types.ObjectId.isValid(rootCategoryId.trim())
      ) {
        return res.status(400).json({ IsSuccess: false, ErrorMessage: "rootCategoryId must be a valid ObjectId" });
      }

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
      const normalizedCategoryId = typeof categoryId === "string" ? categoryId.trim() : "";
      const normalizedRootCategoryId = typeof rootCategoryId === "string" ? rootCategoryId.trim() : "";
      const parsedMinPrice = this.parseOptionalPrice(minPrice);
      const parsedMaxPrice = this.parseOptionalPrice(maxPrice);

      if (parsedMinPrice !== undefined && parsedMaxPrice !== undefined && parsedMinPrice > parsedMaxPrice) {
        return res.status(400).json({ IsSuccess: false, ErrorMessage: "minPrice cannot be greater than maxPrice" });
      }

      const filters: IProductFilters = {
        manufacturers,
        statuses,
        categoryId: normalizedCategoryId,
        rootCategoryId: normalizedRootCategoryId,
        minPrice: parsedMinPrice,
        maxPrice: parsedMaxPrice,
        search,
      };

      const sortOptions = {
        sortField: sortField as "name" | "price" | "manufacturer" | "category" | "status" | "createdOn" | "variantsCount",
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
        categoryId: normalizedCategoryId,
        rootCategoryId: normalizedRootCategoryId,
        minPrice: parsedMinPrice,
        maxPrice: parsedMaxPrice,
        sorting: sortOptions,
        IsSuccess: true,
        ErrorMessage: null,
      });
    } catch (e: any) {
      if (e?.message === "INVALID_PRICE_FILTER") {
        return res.status(400).json({ IsSuccess: false, ErrorMessage: "minPrice and maxPrice must be valid numbers" });
      }
      return res.status(500).json({ IsSuccess: false, ErrorMessage: e.message });
    }
  }

  async getProduct(req: GetProductRequestWithEntityDTO, res: Response<ProductResponseDTO | BaseResponseDTO>) {
    try {
      const product = req.product;
      if (!product) {
        return res.status(404).json({ IsSuccess: false, ErrorMessage: "Product was not found" });
      }
      const categoryLookup = await this.buildCategoryLookup();
      return res.json({ Product: this.toDetailsDTO(product, categoryLookup), IsSuccess: true, ErrorMessage: null });
    } catch (e: any) {
      res.status(500).json({ IsSuccess: false, ErrorMessage: e.message });
    }
  }

  async patch(req: PatchProductRequestDTO, res: Response<ProductResponseDTO | BaseResponseDTO>) {
    try {
      const id = new Types.ObjectId(req.params.productId);
      const updatedProduct = await ProductsService.patch(id, req.body);
      const categoryLookup = await this.buildCategoryLookup();
      return res.json({ Product: this.toDetailsDTO(updatedProduct, categoryLookup), IsSuccess: true, ErrorMessage: null });
    } catch (e: any) {
      res.status(500).json({ IsSuccess: false, ErrorMessage: e.message });
    }
  }

  async patchVariant(req: PatchProductVariantRequestDTO, res: Response<ProductResponseDTO | BaseResponseDTO>) {
    try {
      const productId = new Types.ObjectId(req.params.productId);
      const variantId = new Types.ObjectId(req.params.variantId);
      const updatedProduct = await ProductsService.patchVariant(productId, variantId, req.body);
      const categoryLookup = await this.buildCategoryLookup();
      return res.json({ Product: this.toDetailsDTO(updatedProduct, categoryLookup), IsSuccess: true, ErrorMessage: null });
    } catch (e: any) {
      res.status(500).json({ IsSuccess: false, ErrorMessage: e.message });
    }
  }

  async replaceVariants(req: ReplaceProductVariantsRequestDTO, res: Response<ProductResponseDTO | BaseResponseDTO>) {
    try {
      const productId = new Types.ObjectId(req.params.productId);
      const updatedProduct = await ProductsService.replaceVariants(productId, req.body);
      const categoryLookup = await this.buildCategoryLookup();
      return res.json({ Product: this.toDetailsDTO(updatedProduct, categoryLookup), IsSuccess: true, ErrorMessage: null });
    } catch (e: any) {
      res.status(500).json({ IsSuccess: false, ErrorMessage: e.message });
    }
  }

  async reorderAttributes(req: ReorderProductAttributesRequestDTO, res: Response<ProductResponseDTO | BaseResponseDTO>) {
    try {
      const id = new Types.ObjectId(req.params.productId);
      const updatedProduct = await ProductsService.reorderAttributes(id, req.body.attributes);
      const categoryLookup = await this.buildCategoryLookup();
      return res.json({ Product: this.toDetailsDTO(updatedProduct, categoryLookup), IsSuccess: true, ErrorMessage: null });
    } catch (e: any) {
      res.status(500).json({ IsSuccess: false, ErrorMessage: e.message });
    }
  }

  async replaceSetupSpec(req: ReplaceProductSetupSpecRequestDTO, res: Response<ProductResponseDTO | BaseResponseDTO>) {
    try {
      const productId = new Types.ObjectId(req.params.productId);
      const updatedProduct = await ProductsService.replaceVariants(productId, req.body, {
        resetDraftSetupInventory: true,
      });
      const categoryLookup = await this.buildCategoryLookup();
      return res.status(200).json({ Product: this.toDetailsDTO(updatedProduct, categoryLookup), IsSuccess: true, ErrorMessage: null });
    } catch (e: any) {
      const statusCode = typeof e?.statusCode === "number" ? e.statusCode : 500;
      return res.status(statusCode).json({ IsSuccess: false, ErrorMessage: e.message });
    }
  }

  async createVariants(req: CreateProductVariantsRequestDTO, res: Response<ProductResponseDTO | BaseResponseDTO>) {
    try {
      const productId = new Types.ObjectId(req.params.productId);
      const updatedProduct = await ProductsService.createVariants(productId, req.body);
      const categoryLookup = await this.buildCategoryLookup();
      return res.status(201).json({ Product: this.toDetailsDTO(updatedProduct, categoryLookup), IsSuccess: true, ErrorMessage: null });
    } catch (e: any) {
      res.status(500).json({ IsSuccess: false, ErrorMessage: e.message });
    }
  }

  async patchStatus(req: PatchProductStatusRequestDTO, res: Response<ProductResponseDTO | BaseResponseDTO>) {
    try {
      const productId = new Types.ObjectId(req.params.productId);
      const updatedProduct = await ProductsService.patchStatus(productId, req.body.status);
      const categoryLookup = await this.buildCategoryLookup();
      return res.status(200).json({ Product: this.toDetailsDTO(updatedProduct, categoryLookup), IsSuccess: true, ErrorMessage: null });
    } catch (e: any) {
      return res.status(500).json({ IsSuccess: false, ErrorMessage: e.message });
    }
  }

  async patchVariantStatus(req: PatchProductVariantStatusRequestDTO, res: Response<ProductResponseDTO | BaseResponseDTO>) {
    try {
      const productId = new Types.ObjectId(req.params.productId);
      const variantId = new Types.ObjectId(req.params.variantId);
      const updatedProduct = await ProductsService.patchVariantStatus(productId, variantId, req.body.status);
      const categoryLookup = await this.buildCategoryLookup();
      return res.status(200).json({ Product: this.toDetailsDTO(updatedProduct, categoryLookup), IsSuccess: true, ErrorMessage: null });
    } catch (e: any) {
      return res.status(500).json({ IsSuccess: false, ErrorMessage: e.message });
    }
  }

  async completeSetup(req: CompleteProductSetupRequestDTO, res: Response<ProductResponseDTO | BaseResponseDTO>) {
    try {
      const productId = new Types.ObjectId(req.params.productId);
      const managerData = getDataDataFromToken(getTokenFromRequest(req as any));
      const updatedProduct = await ProductsService.completeSetup(productId, managerData.id);
      const categoryLookup = await this.buildCategoryLookup();
      return res.status(200).json({ Product: this.toDetailsDTO(updatedProduct, categoryLookup), IsSuccess: true, ErrorMessage: null });
    } catch (e: any) {
      const statusCode = typeof e?.statusCode === "number" ? e.statusCode : 500;
      return res.status(statusCode).json({ IsSuccess: false, ErrorMessage: e.message });
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
      if (filters?.categoryId && !Types.ObjectId.isValid(filters.categoryId)) {
        return res.status(400).json({ IsSuccess: false, ErrorMessage: "categoryId must be a valid ObjectId" });
      }
      if (filters?.rootCategoryId && !Types.ObjectId.isValid(filters.rootCategoryId)) {
        return res.status(400).json({ IsSuccess: false, ErrorMessage: "rootCategoryId must be a valid ObjectId" });
      }

      const exportResult = await ProductsService.exportProducts({
        format,
        fields: (fields ?? []) as string[],
        filters: filters
          ? {
              manufacturers: filters.manufacturer,
              statuses: filters.status,
              search: filters.search,
              categoryId: filters.categoryId,
              rootCategoryId: filters.rootCategoryId,
              minPrice: filters.minPrice,
              maxPrice: filters.maxPrice,
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
