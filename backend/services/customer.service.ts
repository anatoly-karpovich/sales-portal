import { Types } from "mongoose";
import type { ICustomer } from "../data/types";
import Customer from "../models/customer.model";
import { getTodaysDate } from "../utils/utils";

class CustomerService {
  async create(customer: Omit<ICustomer, "_id" | "createdOn">): Promise<ICustomer> {
    const createdCustomer = await Customer.create({ ...customer, createdOn: getTodaysDate(true) });
    return createdCustomer;
  }

  async getAll(): Promise<ICustomer[]> {
    const customers = await Customer.find();
    return customers.reverse();
  }

  async getSorted(
    filters: { search: string; country: string[] },
    sortOptions: { sortField: string; sortOrder: string },
    pagination: { skip: number; limit: number }
  ): Promise<{ customers: ICustomer[]; total: number }> {
    const { search, country } = filters;
    const { skip, limit } = pagination;

    const filter: Record<string, any> = {};

    if (country.length > 0) {
      filter.country = { $in: country };
    }

    if (search && search.trim() !== "") {
      const searchRegex = new RegExp(search, "i");
      filter.$or = [
        { email: { $regex: searchRegex } },
        { name: { $regex: searchRegex } },
        { country: { $regex: searchRegex } },
      ];
    }

    const allowedSortFields = new Set(["email", "name", "country", "createdOn"]);
    const sortField = allowedSortFields.has(sortOptions.sortField) ? sortOptions.sortField : "createdOn";
    const sortOrder = sortOptions.sortOrder === "asc" ? 1 : -1;

    const sort: Record<string, 1 | -1> = { [sortField]: sortOrder };
    if (sortField !== "createdOn") {
      sort.createdOn = sortOrder;
    }

    const [customers, total] = await Promise.all([
      Customer.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .collation({ locale: "en", strength: 2 })
        .exec(),
      Customer.countDocuments(filter).exec(),
    ]);

    return { customers, total };
  }

  async getCustomer(id: Types.ObjectId): Promise<ICustomer> {
    if (!id) {
      throw new Error("Id was not provided");
    }
    const customer = await Customer.findById(id);
    return customer;
  }

  async update(customer: Omit<ICustomer, "createdOn"> & { _id: Types.ObjectId }): Promise<ICustomer> {
    if (!customer._id) {
      throw new Error("Id was not provided");
    }
    const updatedCustomer = await Customer.findByIdAndUpdate(customer._id, customer, { new: true });
    return updatedCustomer;
  }

  async delete(id: Types.ObjectId): Promise<ICustomer> {
    if (!id) {
      throw new Error("Id was not provided");
    }
    const customer = await Customer.findByIdAndDelete(id);
    return customer;
  }
}

export default new CustomerService();
