import { Types } from "mongoose";
import type { IProduct } from "../data/types";
import Product from "../models/product.model";
import { getTodaysDate } from "../utils/utils";
import { IProductFilters } from "../data/types/product.type";
import { ProductExportFormatDTO } from "../data/types/dto/products.dto";
import ExportService from "./export.service";

type ProductSortField = "name" | "price" | "manufacturer" | "createdOn";
type ProductSortOrder = "asc" | "desc";

class ProductsService {
  private readonly exportableFields = new Set<string>(["_id", "name", "amount", "price", "manufacturer", "createdOn", "notes"]);

  async create(product: Omit<IProduct, "_id" | "createdOn">): Promise<IProduct> {
    const createdProduct = await Product.create({ ...product, createdOn: getTodaysDate(true) });
    return createdProduct;
  }

  async getSorted(
    filters: IProductFilters,
    sortOptions: { sortField: ProductSortField; sortOrder: ProductSortOrder },
    pagination: { skip: number; limit: number },
  ): Promise<{ products: IProduct[]; total: number }> {
    const { skip, limit } = pagination;
    const filter = this.buildFilter(filters);
    const sort = this.buildSort(sortOptions);

    const [products, total] = await Promise.all([
      Product.find(filter).sort(sort).skip(skip).limit(limit).collation({ locale: "en", strength: 2 }).exec(),
      Product.countDocuments(filter).exec(),
    ]);

    return { products, total };
  }

  async getForExport(
    filters: {
      manufacturers?: string[];
      search?: string;
      page?: number;
      limit?: number;
      sortField?: ProductSortField;
      sortOrder?: ProductSortOrder;
    } = {},
    fields: string[] = [],
  ): Promise<IProduct[]> {
    const filter = this.buildFilter({ manufacturers: filters.manufacturers ?? [], search: filters.search ?? "" });
    const sort = this.buildSort({
      sortField: filters.sortField ?? "createdOn",
      sortOrder: filters.sortOrder ?? "desc",
    });

    const query = Product.find(filter).sort(sort).collation({ locale: "en", strength: 2 });
    if (fields.length > 0) {
      query.select(fields.join(" "));
    }

    if (typeof filters.page === "number" && typeof filters.limit === "number" && filters.page > 0 && filters.limit > 0) {
      const skip = (filters.page - 1) * filters.limit;
      query.skip(skip).limit(filters.limit);
    }

    return query.exec();
  }

  async exportProducts(params: {
    format: ProductExportFormatDTO;
    fields: string[];
    filters?: {
      manufacturers?: string[];
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

    const products = await this.getForExport(
      {
        manufacturers: filters?.manufacturers ?? [],
        search: filters?.search ?? "",
        page: filters?.page,
        limit: filters?.limit,
        sortField: filters?.sortField ?? "createdOn",
        sortOrder: filters?.sortOrder ?? "desc",
      },
      fields,
    );

    const rows = ExportService.pickFields(products as unknown as Record<string, unknown>[], fields);
    const fileName = ExportService.buildFileName("products-export", format);

    if (format === "json") {
      return {
        fileName,
        contentType: "application/json; charset=utf-8",
        content: JSON.stringify(rows, null, 2),
      };
    }

    return {
      fileName,
      contentType: "text/csv; charset=utf-8",
      content: `\uFEFF${ExportService.toCsv(rows, fields)}`,
    };
  }

  private buildFilter(filters: IProductFilters): Record<string, any> {
    const { manufacturers, search } = filters;

    const filter: Record<string, any> = {};

    if (manufacturers && manufacturers.length > 0) {
      filter.manufacturer = { $in: manufacturers };
    }

    if (search && search.trim() !== "") {
      const searchRegex = new RegExp(search, "i");
      const searchNumber = parseFloat(search);

      if (!isNaN(searchNumber)) {
        filter.$or = [
          { name: { $regex: searchRegex } },
          { manufacturer: { $regex: searchRegex } },
          { price: searchNumber },
        ];
      } else {
        filter.$or = [{ name: { $regex: searchRegex } }, { manufacturer: { $regex: searchRegex } }];
      }
    }

    return filter;
  }

  private buildSort(sortOptions: { sortField: ProductSortField; sortOrder: ProductSortOrder }): Record<string, 1 | -1> {
    const allowedSortFields = new Set<ProductSortField>(["name", "price", "manufacturer", "createdOn"]);
    const sortField: ProductSortField = allowedSortFields.has(sortOptions.sortField) ? sortOptions.sortField : "createdOn";
    const sortOrder: 1 | -1 = sortOptions.sortOrder === "asc" ? 1 : -1;

    const sort: Record<string, 1 | -1> = { [sortField]: sortOrder };
    if (sortField !== "createdOn") {
      sort.createdOn = sortOrder;
    }

    return sort;
  }

  async getAll() {
    const products = await Product.find();
    return products.reverse();
  }

  async getProduct(id: Types.ObjectId): Promise<IProduct> {
    if (!id) {
      throw new Error("Id was not provided");
    }
    const product = await Product.findById(id);
    return product;
  }

  async update(product: Omit<IProduct, "createdOn"> & { _id: Types.ObjectId }): Promise<IProduct> {
    if (!product._id) {
      throw new Error("Id was not provided");
    }
    const updatedProduct = await Product.findByIdAndUpdate(product._id, product, { new: true });
    return updatedProduct;
  }

  async delete(id: Types.ObjectId): Promise<IProduct> {
    if (!id) {
      throw new Error("Id was not provided");
    }
    const product = await Product.findByIdAndDelete(id);
    return product;
  }
}

export default new ProductsService();
