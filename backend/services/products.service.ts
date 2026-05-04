import { Types } from "mongoose";
import type { IProduct, IProductFilters, IProductVariant } from "../data/types/product.type";
import { getTodaysDate } from "../utils/utils";
import {
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

type ProductSortField = "name" | "price" | "manufacturer" | "category" | "status" | "createdOn";
type ProductSortOrder = "asc" | "desc";
type ProductVariantWritePayload = ProductVariantCreateRequestDTO & { _id?: Types.ObjectId | string; status?: PRODUCT_STATUSES };

class ProductsService {
  private readonly exportableFields = new Set<string>([
    "_id",
    "name",
    "manufacturer",
    "category",
    "status",
    "variantsCount",
    "priceRange",
    "attributes",
    "variants",
    "createdOn",
    "updatedOn",
  ]);

  async create(product: ProductCreateOrReplaceRequestDTO): Promise<IProduct> {
    const createdOn = getTodaysDate(true);
    const createdProduct = await Product.create({
      ...product,
      status: PRODUCT_STATUSES.DRAFT,
      variants: product.variants.map((variant) => ({ ...variant, status: PRODUCT_STATUSES.DRAFT })),
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

    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      {
        ...payload,
        status: currentProduct.status,
        variants: nextVariants,
        updatedOn: getTodaysDate(true),
      },
      { new: true },
    )
      .lean()
      .exec();
    return this.normalizeProduct(updatedProduct);
  }

  async patch(
    productId: Types.ObjectId,
    payload: Partial<Pick<IProduct, "name" | "manufacturer" | "category" | "description" | "imageUrl">>,
  ): Promise<IProduct> {
    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      { ...payload, updatedOn: getTodaysDate(true) },
      { new: true },
    )
      .lean()
      .exec();
    return this.normalizeProduct(updatedProduct);
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

    const nextVariants = (product.variants ?? []).map((variant: any) => {
      if (variant?._id?.toString() !== variantId.toString()) {
        return variant;
      }
      return {
        ...variant,
        ...payload,
      };
    });

    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      { variants: nextVariants, updatedOn: getTodaysDate(true) },
      { new: true },
    )
      .lean()
      .exec();
    return this.normalizeProduct(updatedProduct);
  }

  async replaceVariants(
    productId: Types.ObjectId,
    payload: ProductVariantsReplaceBodyDTO,
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

    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      {
        variants: nextVariants,
        ...(payload.attributes ? { attributes: payload.attributes } : {}),
        updatedOn: getTodaysDate(true),
      },
      { new: true },
    )
      .lean()
      .exec();

    return this.normalizeProduct(updatedProduct);
  }

  async createVariant(
    productId: Types.ObjectId,
    payload: ProductVariantCreateRequestDTO,
  ): Promise<IProduct> {
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

    return this.normalizeProduct(updatedProduct);
  }

  async createVariants(
    productId: Types.ObjectId,
    payload: ProductVariantCreateRequestDTO[],
  ): Promise<IProduct> {
    const product = await Product.findById(productId).lean().exec();
    if (!product) {
      return undefined;
    }

    const nextVariants = [...(product.variants ?? []), ...payload.map((variant) => ({ ...variant, status: PRODUCT_STATUSES.DRAFT }))];
    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      { variants: nextVariants, updatedOn: getTodaysDate(true) },
      { new: true },
    )
      .lean()
      .exec();

    return this.normalizeProduct(updatedProduct);
  }

  async patchStatus(productId: Types.ObjectId, status: PRODUCT_STATUSES): Promise<IProduct> {
    const product = await Product.findById(productId).lean().exec();
    if (!product) {
      return undefined;
    }

    const nextVariants = status === PRODUCT_STATUSES.ARCHIVED
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

    return this.normalizeProduct(updatedProduct);
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

    return this.normalizeProduct(updatedProduct);
  }

  async previewWithVariants(
    productId: Types.ObjectId,
    payload: ProductVariantsReplaceBodyDTO,
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

    const nextVariants = (product.variants ?? []).filter((variant: any) => variant?._id?.toString() !== variantId.toString());
    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      { variants: nextVariants, updatedOn: getTodaysDate(true) },
      { new: true },
    )
      .lean()
      .exec();

    return this.normalizeProduct(updatedProduct);
  }

  async getSorted(
    filters: IProductFilters,
    sortOptions: { sortField: ProductSortField; sortOrder: ProductSortOrder },
    pagination: { skip: number; limit: number },
  ): Promise<{ products: ProductListItemDTO[]; total: number }> {
    const filtered = (await Product.find(this.buildFilter(filters)).lean().exec()).map((product) =>
      this.normalizeProduct(product),
    );
    const sorted = this.sortProducts(filtered, sortOptions);
    const sliced = sorted.slice(pagination.skip, pagination.skip + pagination.limit).map((product) => this.toListItem(product));
    return { products: sliced, total: filtered.length };
  }

  async getForExport(
    filters: {
      manufacturers?: string[];
      statuses?: PRODUCT_STATUSES[];
      search?: string;
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
    });

    const products = (await Product.find(filter).lean().exec()).map((product) => this.normalizeProduct(product));
    const sortedProducts = this.sortProducts(products, {
      sortField: filters.sortField ?? "createdOn",
      sortOrder: filters.sortOrder ?? "desc",
    });

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
      page: filters?.page,
      limit: filters?.limit,
      sortField: filters?.sortField ?? "createdOn",
      sortOrder: filters?.sortOrder ?? "desc",
    });

    const rows = products.map((product) => {
      const normalized = this.normalizeProduct(product);
      const listItem = this.toListItem(normalized);
      return {
        _id: normalized._id?.toString?.() ?? "",
        name: normalized.name,
        manufacturer: normalized.manufacturer,
        category: normalized.category,
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
  ): IProduct[] {
    const sortField = sortOptions.sortField;
    const direction = sortOptions.sortOrder === "asc" ? 1 : -1;

    return [...products].sort((a, b) => {
      if (sortField === "price") {
        const diff = this.getPriceRange(a.variants).min - this.getPriceRange(b.variants).min;
        if (diff !== 0) return diff * direction;
      } else if (sortField === "createdOn") {
        const ad = new Date(a.createdOn).getTime();
        const bd = new Date(b.createdOn).getTime();
        if (ad !== bd) return (ad - bd) * direction;
      } else {
        const av = (a as unknown as Record<string, string>)[sortField] ?? "";
        const bv = (b as unknown as Record<string, string>)[sortField] ?? "";
        const cmp = av.localeCompare(bv, undefined, { sensitivity: "base" });
        if (cmp !== 0) return cmp * direction;
      }

      return a.name.localeCompare(b.name, undefined, { sensitivity: "base" }) * direction;
    });
  }

  private buildFilter(filters: IProductFilters): Record<string, unknown> {
    const { manufacturers, statuses, search } = filters;
    const filter: Record<string, unknown> = {};

    if (manufacturers && manufacturers.length > 0) {
      filter.manufacturer = { $in: manufacturers };
    }

    if (statuses && statuses.length > 0) {
      filter.status = { $in: statuses };
    }

    if (search && search.trim() !== "") {
      const searchRegex = new RegExp(search, "i");
      filter.$or = [{ name: { $regex: searchRegex } }, { manufacturer: { $regex: searchRegex } }, { category: { $regex: searchRegex } }];
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

  private toListItem(product: IProduct): ProductListItemDTO {
    const priceRange = this.getPriceRange(product.variants);
    return {
      _id: product._id?.toString?.() ?? "",
      name: product.name,
      manufacturer: product.manufacturer,
      category: product.category,
      status: product.status,
      variantsCount: product.variants.length,
      priceRange,
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
    return this.normalizeProduct(product);
  }

  async getProductsBulk(ids: Array<Types.ObjectId | string>) {
    return Product.find({ _id: { $in: ids } }).lean().exec();
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
