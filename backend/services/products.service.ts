import mongoose, { Types } from "mongoose";
import type { IProduct, IProductAttribute, IProductFilters, IProductVariant } from "../data/types/product.type";
import { getTodaysDate } from "../utils/utils";
import {
  ProductSetupInitRequestDTO,
  ProductCreateOrReplaceRequestDTO,
  ProductExportFormatDTO,
  ProductListItemDTO,
  ProductVariantCreateRequestDTO,
  ProductVariantPatchRequestDTO,
  ProductVariantsReplaceBodyDTO,
} from "../data/types/dto/products.dto";
import Product from "../models/product.model";
import ExportService from "./export.service";
import { PRODUCT_STATUSES } from "../data/enums";
import CategoriesService from "./categories.service";
import InventoryService from "./inventory.service";

type ProductSortField = "name" | "price" | "manufacturer" | "category" | "status" | "createdOn" | "variantsCount";
type ProductSortOrder = "asc" | "desc";
type ProductVariantWritePayload = ProductVariantCreateRequestDTO & {
  _id?: Types.ObjectId | string;
  status?: PRODUCT_STATUSES;
};

type CategoryLookupItem = {
  path: string;
};

function createHttpError(message: string, statusCode: number): Error & { statusCode: number } {
  const error = new Error(message) as Error & { statusCode: number };
  error.statusCode = statusCode;
  return error;
}

class ProductsService {
  private readonly exportableFields = new Set<string>([
    "_id",
    "name",
    "manufacturer",
    "categoryId",
    "rootCategoryId",
    "categoryPath",
    "status",
    "variantsCount",
    "priceRange",
    "attributes",
    "variants",
    "createdOn",
    "updatedOn",
  ]);

  private async resolveRootCategoryId(categoryId: string): Promise<string> {
    const rootCategoryId = await CategoriesService.getRootCategoryId(categoryId);
    if (!rootCategoryId) {
      throw new Error("Category was not found");
    }
    return rootCategoryId;
  }

  async create(product: ProductCreateOrReplaceRequestDTO): Promise<IProduct> {
    const createdOn = getTodaysDate(true);
    const rootCategoryId = await this.resolveRootCategoryId(product.categoryId);
    const createdProduct = await Product.create({
      ...product,
      categoryId: new Types.ObjectId(product.categoryId),
      rootCategoryId: new Types.ObjectId(rootCategoryId),
      status: PRODUCT_STATUSES.DRAFT,
      variants: product.variants.map((variant) => ({ ...variant, status: PRODUCT_STATUSES.DRAFT })),
      createdOn,
      updatedOn: createdOn,
    });
    const normalized = this.normalizeProduct(createdProduct.toObject());
    await InventoryService.createForProduct(normalized);
    return normalized;
  }

  async createSetupInit(payload: ProductSetupInitRequestDTO): Promise<IProduct> {
    const createdOn = getTodaysDate(true);
    const rootCategoryId = await this.resolveRootCategoryId(payload.categoryId);
    const createdProduct = await Product.create({
      ...payload,
      categoryId: new Types.ObjectId(payload.categoryId),
      rootCategoryId: new Types.ObjectId(rootCategoryId),
      status: PRODUCT_STATUSES.DRAFT,
      setup: {
        initCompleted: true,
        specCompleted: false,
        inventoryCompleted: false,
        completed: false,
      },
      attributes: [],
      variants: [],
      createdOn,
      updatedOn: createdOn,
    });

    return this.normalizeProduct(createdProduct.toObject());
  }

  async replace(productId: Types.ObjectId, payload: ProductCreateOrReplaceRequestDTO): Promise<IProduct> {
    const currentProduct = await Product.findById(productId).lean().exec();
    if (!currentProduct) {
      return undefined;
    }

    const rootCategoryId = await this.resolveRootCategoryId(payload.categoryId);
    const existingVariantsById = new Map(
      (currentProduct.variants ?? [])
        .map((variant: any) => {
          const id = variant?._id?.toString?.();
          return id ? [id, variant] : null;
        })
        .filter((entry): entry is [string, any] => Boolean(entry)),
    );

    const nextVariants = payload.variants.map((variant: ProductVariantWritePayload) => {
      if (variant._id) {
        const existing = existingVariantsById.get(variant._id.toString());
        return {
          ...variant,
          _id: existing?._id ?? variant._id,
          status: existing?.status ?? PRODUCT_STATUSES.DRAFT,
        };
      }

      return {
        ...variant,
        status: PRODUCT_STATUSES.DRAFT,
      };
    });

    const currentVariantIds = new Set(
      (currentProduct.variants ?? []).map((variant: any) => variant?._id?.toString?.()).filter(Boolean),
    );

    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      {
        ...payload,
        categoryId: new Types.ObjectId(payload.categoryId),
        rootCategoryId: new Types.ObjectId(rootCategoryId),
        status: currentProduct.status,
        variants: nextVariants,
        updatedOn: getTodaysDate(true),
      },
      { new: true },
    )
      .lean()
      .exec();
    const normalized = this.normalizeProduct(updatedProduct);
    const nextVariantIds = new Set(
      (normalized.variants ?? []).map((variant) => variant._id?.toString?.()).filter(Boolean),
    );
    const removedVariantIds = [...currentVariantIds].filter((variantId) => !nextVariantIds.has(variantId));
    for (const removedVariantId of removedVariantIds) {
      await InventoryService.deleteVariantData(productId, new Types.ObjectId(removedVariantId));
    }
    await InventoryService.syncWithProductVariants(normalized);
    return normalized;
  }

  async patch(
    productId: Types.ObjectId,
    payload: Partial<Pick<IProduct, "name" | "manufacturer" | "description" | "imageUrl">> & { categoryId?: string },
  ): Promise<IProduct> {
    const updatePayload: Record<string, unknown> = {
      ...payload,
      updatedOn: getTodaysDate(true),
    };

    if (payload.categoryId) {
      const rootCategoryId = await this.resolveRootCategoryId(payload.categoryId);
      updatePayload.categoryId = new Types.ObjectId(payload.categoryId);
      updatePayload.rootCategoryId = new Types.ObjectId(rootCategoryId);
    }

    const updatedProduct = await Product.findByIdAndUpdate(productId, updatePayload, { new: true }).lean().exec();
    const normalized = this.normalizeProduct(updatedProduct);
    await InventoryService.syncWithProductVariants(normalized);
    return normalized;
  }

  async reorderAttributes(productId: Types.ObjectId, attributes: IProductAttribute[]): Promise<IProduct> {
    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      { attributes, updatedOn: getTodaysDate(true) },
      { new: true },
    )
      .lean()
      .exec();
    const normalized = this.normalizeProduct(updatedProduct);
    await InventoryService.syncWithProductVariants(normalized);
    return normalized;
  }

  async patchVariant(
    productId: Types.ObjectId,
    variantId: Types.ObjectId,
    payload: ProductVariantPatchRequestDTO,
  ): Promise<IProduct> {
    const product = await Product.findById(productId).lean().exec();
    if (!product) {
      return undefined;
    }

    const safePatchPayload: ProductVariantPatchRequestDTO = {};
    if (Object.prototype.hasOwnProperty.call(payload ?? {}, "price")) {
      safePatchPayload.price = payload.price;
    }
    if (Object.prototype.hasOwnProperty.call(payload ?? {}, "imageUrl")) {
      safePatchPayload.imageUrl = payload.imageUrl;
    }
    if (Object.prototype.hasOwnProperty.call(payload ?? {}, "attributes")) {
      safePatchPayload.attributes = payload.attributes;
    }

    const nextVariants = (product.variants ?? []).map((variant: any) => {
      if (variant?._id?.toString() !== variantId.toString()) {
        return variant;
      }
      return {
        ...variant,
        ...safePatchPayload,
      };
    });

    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      { variants: nextVariants, updatedOn: getTodaysDate(true) },
      { new: true },
    )
      .lean()
      .exec();
    const normalized = this.normalizeProduct(updatedProduct);
    await InventoryService.syncWithProductVariants(normalized);
    return normalized;
  }

  async replaceVariants(
    productId: Types.ObjectId,
    payload: ProductVariantsReplaceBodyDTO,
    options?: { resetDraftSetupInventory?: boolean },
  ): Promise<IProduct> {
    const product = await Product.findById(productId).lean().exec();
    if (!product) {
      return undefined;
    }

    const existingVariantsById = new Map(
      (product.variants ?? [])
        .map((variant: any) => {
          const id = variant?._id?.toString?.();
          return id ? [id, variant] : null;
        })
        .filter((entry): entry is [string, any] => Boolean(entry)),
    );

    const nextVariants = payload.variants.map((variant: ProductVariantWritePayload) => {
      if (variant._id) {
        const existing = existingVariantsById.get(variant._id.toString());
        return {
          ...variant,
          _id: existing?._id ?? variant._id,
          status: existing?.status ?? PRODUCT_STATUSES.DRAFT,
        };
      }

      return {
        ...variant,
        status: PRODUCT_STATUSES.DRAFT,
      };
    });

    const currentVariantIds = new Set(
      (product.variants ?? []).map((variant: any) => variant?._id?.toString?.()).filter(Boolean),
    );

    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      {
        variants: nextVariants,
        ...(payload.attributes ? { attributes: payload.attributes } : {}),
        ...(options?.resetDraftSetupInventory === true
          ? {
              setup: {
                ...(product as unknown as { setup?: Record<string, unknown> }).setup,
                initCompleted: true,
                specCompleted: true,
                inventoryCompleted: false,
                completed: false,
                completedOn: undefined,
                completedBy: undefined,
              },
            }
          : {}),
        updatedOn: getTodaysDate(true),
      },
      { new: true },
    )
      .lean()
      .exec();

    const normalized = this.normalizeProduct(updatedProduct);
    const shouldResetDraftSetupInventory =
      options?.resetDraftSetupInventory === true &&
      product.status === PRODUCT_STATUSES.DRAFT &&
      (product as unknown as { setup?: { completed?: boolean } })?.setup?.completed !== true;

    if (shouldResetDraftSetupInventory) {
      await InventoryService.resetDraftSetupInventory(productId, normalized);
      return normalized;
    }

    const nextVariantIds = new Set(
      (normalized.variants ?? []).map((variant) => variant._id?.toString?.()).filter(Boolean),
    );
    const removedVariantIds = [...currentVariantIds].filter((variantId) => !nextVariantIds.has(variantId));
    for (const removedVariantId of removedVariantIds) {
      await InventoryService.deleteVariantData(productId, new Types.ObjectId(removedVariantId));
    }
    await InventoryService.syncWithProductVariants(normalized);
    return normalized;
  }

  async createVariant(productId: Types.ObjectId, payload: ProductVariantCreateRequestDTO): Promise<IProduct> {
    const product = await Product.findById(productId).lean().exec();
    if (!product) {
      return undefined;
    }

    const nextVariants = [...(product.variants ?? []), { ...payload, status: PRODUCT_STATUSES.DRAFT }];
    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      { variants: nextVariants, updatedOn: getTodaysDate(true) },
      { new: true },
    )
      .lean()
      .exec();

    const normalized = this.normalizeProduct(updatedProduct);
    await InventoryService.syncWithProductVariants(normalized);
    return normalized;
  }

  async createVariants(productId: Types.ObjectId, payload: ProductVariantCreateRequestDTO[]): Promise<IProduct> {
    const product = await Product.findById(productId).lean().exec();
    if (!product) {
      return undefined;
    }

    const nextVariants = [
      ...(product.variants ?? []),
      ...payload.map((variant) => ({ ...variant, status: PRODUCT_STATUSES.DRAFT })),
    ];
    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      { variants: nextVariants, updatedOn: getTodaysDate(true) },
      { new: true },
    )
      .lean()
      .exec();

    const normalized = this.normalizeProduct(updatedProduct);
    await InventoryService.syncWithProductVariants(normalized);
    return normalized;
  }

  async patchStatus(productId: Types.ObjectId, status: PRODUCT_STATUSES): Promise<IProduct> {
    const product = await Product.findById(productId).lean().exec();
    if (!product) {
      return undefined;
    }

    const nextVariants =
      status === PRODUCT_STATUSES.ARCHIVED
        ? (product.variants ?? []).map((variant: any) => ({
            ...variant,
            status: PRODUCT_STATUSES.ARCHIVED,
          }))
        : product.variants;

    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      {
        status,
        variants: nextVariants,
        updatedOn: getTodaysDate(true),
      },
      { new: true },
    )
      .lean()
      .exec();

    const normalized = this.normalizeProduct(updatedProduct);
    await InventoryService.syncWithProductVariants(normalized);
    return normalized;
  }

  async patchVariantStatus(
    productId: Types.ObjectId,
    variantId: Types.ObjectId,
    status: PRODUCT_STATUSES,
  ): Promise<IProduct> {
    const product = await Product.findById(productId).lean().exec();
    if (!product) {
      return undefined;
    }

    const nextVariants = (product.variants ?? []).map((variant: any) => {
      if (variant?._id?.toString() !== variantId.toString()) {
        return variant;
      }
      return {
        ...variant,
        status,
      };
    });

    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      { variants: nextVariants, updatedOn: getTodaysDate(true) },
      { new: true },
    )
      .lean()
      .exec();

    const normalized = this.normalizeProduct(updatedProduct);
    await InventoryService.syncWithProductVariants(normalized);
    return normalized;
  }

  async completeSetup(productId: Types.ObjectId, managerId: string): Promise<IProduct> {
    const session = await mongoose.startSession();
    let normalized: IProduct | null = null;
    try {
      await session.withTransaction(async () => {
        const product = this.normalizeProduct(await Product.findById(productId).session(session).lean().exec());
        if (!product) {
          throw createHttpError(`Product with id '${productId.toString()}' wasn't found`, 404);
        }

        if (product.setup.completed) {
          throw createHttpError("Product setup has already been completed", 409);
        }

        if (product.status !== PRODUCT_STATUSES.DRAFT) {
          throw createHttpError("Only draft products can complete setup", 409);
        }

        if (!product.variants?.length) {
          throw createHttpError("Product should contain at least one variant", 400);
        }

        await InventoryService.completeSetup(product, managerId, session);

        const now = getTodaysDate(true);
        const updatedProduct = await Product.findByIdAndUpdate(
          productId,
          {
            status: PRODUCT_STATUSES.ACTIVE,
            setup: {
              initCompleted: true,
              specCompleted: true,
              inventoryCompleted: true,
              completed: true,
              completedOn: now,
              completedBy: new Types.ObjectId(managerId),
            },
            updatedOn: now,
          },
          { new: true, session },
        )
          .lean()
          .exec();

        normalized = this.normalizeProduct(updatedProduct);
      });
    } finally {
      await session.endSession();
    }

    if (!normalized) {
      throw createHttpError("Product setup wasn't completed", 500);
    }

    return normalized;
  }

  async previewWithVariants(productId: Types.ObjectId, payload: ProductVariantsReplaceBodyDTO): Promise<IProduct> {
    const product = await Product.findById(productId).lean().exec();
    if (!product) {
      return undefined;
    }

    const existingVariantsById = new Map(
      (product.variants ?? [])
        .map((variant: any) => {
          const id = variant?._id?.toString?.();
          return id ? [id, variant] : null;
        })
        .filter((entry): entry is [string, any] => Boolean(entry)),
    );

    const nextVariants = payload.variants.map((variant: ProductVariantWritePayload) => {
      if (variant._id) {
        const existing = existingVariantsById.get(variant._id.toString());
        return {
          ...variant,
          _id: existing?._id ?? variant._id,
          status: existing?.status ?? PRODUCT_STATUSES.DRAFT,
        };
      }

      return {
        ...variant,
        status: PRODUCT_STATUSES.DRAFT,
      };
    });

    return this.normalizeProduct({
      ...product,
      ...(payload.attributes ? { attributes: payload.attributes } : {}),
      variants: nextVariants,
      updatedOn: getTodaysDate(true),
    });
  }

  async deleteVariant(productId: Types.ObjectId, variantId: Types.ObjectId): Promise<IProduct> {
    const product = await Product.findById(productId).lean().exec();
    if (!product) {
      return undefined;
    }

    const nextVariants = (product.variants ?? []).filter(
      (variant: any) => variant?._id?.toString() !== variantId.toString(),
    );
    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      { variants: nextVariants, updatedOn: getTodaysDate(true) },
      { new: true },
    )
      .lean()
      .exec();
    await InventoryService.deleteVariantData(productId, variantId);
    const normalized = this.normalizeProduct(updatedProduct);
    await InventoryService.syncWithProductVariants(normalized);
    return normalized;
  }

  private async buildCategoryLookup(): Promise<Map<string, CategoryLookupItem>> {
    const categories = await CategoriesService.getFlat();
    return new Map(
      categories.map((category) => [category._id, { path: category.path.map((item) => item.name).join(" / ") }]),
    );
  }

  async getSorted(
    filters: IProductFilters,
    sortOptions: { sortField: ProductSortField; sortOrder: ProductSortOrder },
    pagination: { skip: number; limit: number },
  ): Promise<{ products: ProductListItemDTO[]; total: number }> {
    const filtered = (await Product.find(this.buildFilter(filters)).lean().exec()).map((product) =>
      this.normalizeProduct(product),
    );
    const categoryLookup = await this.buildCategoryLookup();
    const sorted = this.sortProducts(filtered, sortOptions, categoryLookup);
    const sliced = sorted
      .slice(pagination.skip, pagination.skip + pagination.limit)
      .map((product) => this.toListItem(product, categoryLookup));
    return { products: sliced, total: filtered.length };
  }

  async getListItemsByCategoryIds(categoryIds: string[]): Promise<ProductListItemDTO[]> {
    if (!categoryIds.length) {
      return [];
    }
    const objectIds = categoryIds.map((id) => new Types.ObjectId(id));
    const products = (await Product.find({ categoryId: { $in: objectIds } }).lean().exec()).map((product) =>
      this.normalizeProduct(product),
    );
    const categoryLookup = await this.buildCategoryLookup();
    const sorted = this.sortProducts(products, { sortField: "createdOn", sortOrder: "desc" }, categoryLookup);
    return sorted.map((product) => this.toListItem(product, categoryLookup));
  }

  async getForExport(
    filters: {
      manufacturers?: string[];
      statuses?: PRODUCT_STATUSES[];
      search?: string;
      categoryId?: string;
      rootCategoryId?: string;
      minPrice?: number;
      maxPrice?: number;
      page?: number;
      limit?: number;
      sortField?: ProductSortField;
      sortOrder?: ProductSortOrder;
    } = {},
  ): Promise<IProduct[]> {
    const filter = this.buildFilter({
      manufacturers: filters.manufacturers ?? [],
      statuses: filters.statuses ?? [],
      search: filters.search ?? "",
      categoryId: filters.categoryId,
      rootCategoryId: filters.rootCategoryId,
      minPrice: filters.minPrice,
      maxPrice: filters.maxPrice,
    });

    const products = (await Product.find(filter).lean().exec()).map((product) => this.normalizeProduct(product));
    const categoryLookup = await this.buildCategoryLookup();
    const sortedProducts = this.sortProducts(products, {
      sortField: filters.sortField ?? "createdOn",
      sortOrder: filters.sortOrder ?? "desc",
    }, categoryLookup);

    if (
      typeof filters.page === "number" &&
      typeof filters.limit === "number" &&
      filters.page > 0 &&
      filters.limit > 0
    ) {
      const skip = (filters.page - 1) * filters.limit;
      return sortedProducts.slice(skip, skip + filters.limit);
    }

    return sortedProducts;
  }

  async exportProducts(params: {
    format: ProductExportFormatDTO;
    fields: string[];
    filters?: {
      manufacturers?: string[];
      statuses?: PRODUCT_STATUSES[];
      search?: string;
      categoryId?: string;
      rootCategoryId?: string;
      minPrice?: number;
      maxPrice?: number;
      page?: number;
      limit?: number;
      sortField?: ProductSortField;
      sortOrder?: ProductSortOrder;
    } | null;
  }): Promise<{ fileName: string; contentType: string; content: string }> {
    const { format, fields, filters } = params;

    if (!["csv", "json"].includes(format)) {
      throw new Error("EXPORT_VALIDATION:Invalid export format");
    }

    ExportService.assertSelectedFields(fields, this.exportableFields);

    const products = await this.getForExport({
      manufacturers: filters?.manufacturers ?? [],
      statuses: filters?.statuses ?? [],
      search: filters?.search ?? "",
      categoryId: filters?.categoryId,
      rootCategoryId: filters?.rootCategoryId,
      minPrice: filters?.minPrice,
      maxPrice: filters?.maxPrice,
      page: filters?.page,
      limit: filters?.limit,
      sortField: filters?.sortField ?? "createdOn",
      sortOrder: filters?.sortOrder ?? "desc",
    });

    const categoryLookup = await this.buildCategoryLookup();
    const rows = products.map((product) => {
      const normalized = this.normalizeProduct(product);
      const listItem = this.toListItem(normalized, categoryLookup);
      return {
        _id: normalized._id?.toString?.() ?? "",
        name: normalized.name,
        manufacturer: normalized.manufacturer,
        categoryId: normalized.categoryId?.toString?.() ?? "",
        rootCategoryId: normalized.rootCategoryId?.toString?.() ?? "",
        categoryPath: listItem.categoryPath,
        status: normalized.status,
        variantsCount: listItem.variantsCount,
        priceRange: listItem.priceRange,
        attributes: normalized.attributes,
        variants: normalized.variants.map((variant) => ({
          ...variant,
          _id: variant._id?.toString?.() ?? "",
        })),
        createdOn: normalized.createdOn,
        updatedOn: normalized.updatedOn,
      };
    });

    const pickedRows = ExportService.pickFields(rows, fields);
    const fileName = ExportService.buildFileName("products-export", format);

    if (format === "json") {
      return {
        fileName,
        contentType: "application/json; charset=utf-8",
        content: JSON.stringify(pickedRows, null, 2),
      };
    }

    return {
      fileName,
      contentType: "text/csv; charset=utf-8",
      content: `\uFEFF${ExportService.toCsv(pickedRows, fields)}`,
    };
  }

  private sortProducts(
    products: IProduct[],
    sortOptions: { sortField: ProductSortField; sortOrder: ProductSortOrder },
    categoryLookup: Map<string, CategoryLookupItem>,
  ): IProduct[] {
    const sortField = sortOptions.sortField;
    const direction = sortOptions.sortOrder === "asc" ? 1 : -1;

    return [...products].sort((a, b) => {
      let primaryComparison = 0;

      if (sortField === "price") {
        primaryComparison = (this.getPriceRange(a.variants).min - this.getPriceRange(b.variants).min) * direction;
      } else if (sortField === "variantsCount") {
        primaryComparison = (a.variants.length - b.variants.length) * direction;
      } else if (sortField === "createdOn") {
        const ad = new Date(a.createdOn).getTime();
        const bd = new Date(b.createdOn).getTime();
        primaryComparison = (ad - bd) * direction;
      } else if (sortField === "category") {
        const categoryA = categoryLookup.get(a.categoryId?.toString?.() ?? "")?.path ?? "";
        const categoryB = categoryLookup.get(b.categoryId?.toString?.() ?? "")?.path ?? "";
        primaryComparison = categoryA.localeCompare(categoryB, undefined, { sensitivity: "base" }) * direction;
      } else {
        const av = (a as unknown as Record<string, string>)[sortField] ?? "";
        const bv = (b as unknown as Record<string, string>)[sortField] ?? "";
        primaryComparison = av.localeCompare(bv, undefined, { sensitivity: "base" }) * direction;
      }

      if (primaryComparison !== 0) {
        return primaryComparison;
      }

      const createdDiff = new Date(b.createdOn).getTime() - new Date(a.createdOn).getTime();
      if (createdDiff !== 0) {
        return createdDiff;
      }

      return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
    });
  }

  private buildFilter(filters: IProductFilters): Record<string, unknown> {
    const { manufacturers, statuses, search, categoryId, rootCategoryId, minPrice, maxPrice } = filters;
    const filter: Record<string, unknown> = {};

    if (manufacturers && manufacturers.length > 0) {
      filter.manufacturer = { $in: manufacturers };
    }

    if (statuses && statuses.length > 0) {
      filter.status = { $in: statuses };
    }

    if (categoryId && categoryId.trim() !== "") {
      filter.categoryId = new Types.ObjectId(categoryId.trim());
    }

    if (rootCategoryId && rootCategoryId.trim() !== "") {
      filter.rootCategoryId = new Types.ObjectId(rootCategoryId.trim());
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      const priceRange: Record<string, number> = {};
      if (minPrice !== undefined) {
        priceRange.$gte = minPrice;
      }
      if (maxPrice !== undefined) {
        priceRange.$lte = maxPrice;
      }
      filter.variants = { $elemMatch: { price: priceRange } };
    }

    if (search && search.trim() !== "") {
      const searchRegex = new RegExp(search, "i");
      filter.$or = [{ name: { $regex: searchRegex } }, { manufacturer: { $regex: searchRegex } }];
    }

    return filter;
  }

  private getPriceRange(variants: IProductVariant[]) {
    if (!variants || variants.length === 0) {
      return { min: 0, max: 0 };
    }
    const prices = variants.map((variant) => variant.price);
    return {
      min: Math.min(...prices),
      max: Math.max(...prices),
    };
  }

  private toListItem(product: IProduct, categoryLookup: Map<string, CategoryLookupItem>): ProductListItemDTO {
    const priceRange = this.getPriceRange(product.variants);
    const categoryPath = categoryLookup.get(product.categoryId?.toString?.() ?? "")?.path ?? "";
    return {
      _id: product._id?.toString?.() ?? "",
      name: product.name,
      manufacturer: product.manufacturer,
      categoryId: product.categoryId?.toString?.() ?? "",
      rootCategoryId: product.rootCategoryId?.toString?.() ?? "",
      categoryPath,
      status: product.status,
      createdOn: product.createdOn,
      variantsCount: product.variants.length,
      priceRange,
      setup: {
        initCompleted: product.setup?.initCompleted ?? true,
        specCompleted: product.setup?.specCompleted ?? product.variants.length > 0,
        inventoryCompleted: product.setup?.inventoryCompleted ?? false,
        completed: product.setup?.completed ?? false,
        completedOn: product.setup?.completedOn,
        completedBy: product.setup?.completedBy?.toString?.(),
      },
      ...(product.imageUrl && { imageUrl: product.imageUrl }),
    };
  }

  async getAll() {
    const products = await Product.find().lean().exec();
    return products.map((product) => this.normalizeProduct(product)).reverse();
  }

  async getProduct(id: Types.ObjectId): Promise<IProduct> {
    if (!id) {
      throw new Error("Id was not provided");
    }
    const product = await Product.findById(id).lean().exec();
    return this.normalizeProduct(product);
  }

  async delete(id: Types.ObjectId): Promise<IProduct> {
    if (!id) {
      throw new Error("Id was not provided");
    }
    const product = await Product.findByIdAndDelete(id).lean().exec();
    await InventoryService.deleteByProductId(id);
    return this.normalizeProduct(product);
  }

  async getProductsBulk(ids: Array<Types.ObjectId | string>) {
    return Product.find({ _id: { $in: ids } })
      .lean()
      .exec();
  }

  private normalizeAttributesRecord(value: unknown): Record<string, string> {
    if (value instanceof Map) {
      return Object.fromEntries(value.entries());
    }
    if (value && typeof value === "object") {
      return value as Record<string, string>;
    }
    return {};
  }

  private normalizeProduct(doc: any): IProduct {
    if (!doc) {
      return undefined as unknown as IProduct;
    }

    return {
      ...doc,
      categoryId: doc.categoryId ? new Types.ObjectId(doc.categoryId) : undefined,
      rootCategoryId: doc.rootCategoryId ? new Types.ObjectId(doc.rootCategoryId) : undefined,
      setup: doc.setup
        ? {
            initCompleted: typeof doc.setup.initCompleted === "boolean" ? doc.setup.initCompleted : true,
            specCompleted:
              typeof doc.setup.specCompleted === "boolean"
                ? doc.setup.specCompleted
                : Array.isArray(doc.variants) && doc.variants.length > 0,
            inventoryCompleted:
              typeof doc.setup.inventoryCompleted === "boolean"
                ? doc.setup.inventoryCompleted
                : Boolean(doc.setup.completed),
            completed: Boolean(doc.setup.completed),
            completedOn:
              doc.setup.completedOn instanceof Date ? doc.setup.completedOn.toISOString() : doc.setup.completedOn,
            completedBy: doc.setup.completedBy ? new Types.ObjectId(doc.setup.completedBy) : undefined,
          }
        : {
            initCompleted: true,
            specCompleted: Array.isArray(doc.variants) && doc.variants.length > 0,
            inventoryCompleted: doc.status !== PRODUCT_STATUSES.DRAFT,
            completed: doc.status !== PRODUCT_STATUSES.DRAFT,
          },
      attributes: Array.isArray(doc.attributes) ? doc.attributes : [],
      variants: Array.isArray(doc.variants)
        ? doc.variants.map((variant: any) => ({
            _id: variant._id,
            price: variant.price,
            status: variant.status,
            imageUrl: variant.imageUrl,
            attributes: this.normalizeAttributesRecord(variant.attributes),
          }))
        : [],
      createdOn: doc.createdOn instanceof Date ? doc.createdOn.toISOString() : doc.createdOn,
      updatedOn: doc.updatedOn instanceof Date ? doc.updatedOn.toISOString() : doc.updatedOn,
    };
  }
}

export default new ProductsService();
