import { Types } from "mongoose";
import type { IProduct } from "../data/types";
import Product from "../models/product.model";
import { customSort, getTodaysDate } from "../utils/utils";
import { IProductFilters } from "../data/types/product.type";

class ProductsService {
  async create(product: Omit<IProduct, "_id" | "createdOn">): Promise<IProduct> {
    const createdProduct = await Product.create({ ...product, createdOn: getTodaysDate(true) });
    return createdProduct;
  }

  async getSorted(
    filters: IProductFilters,
    sortOptions: { sortField: string; sortOrder: string },
    pagination: { skip: number; limit: number }
  ): Promise<{ products: IProduct[]; total: number }> {
    const { manufacturers, search } = filters;
    const { skip, limit } = pagination;

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

    const all = await Product.find(filter).exec();
    const total = all.length;

    const sorted = customSort(all, sortOptions);
    const paginated = sorted.slice(skip, skip + limit);

    return { products: paginated, total };
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
