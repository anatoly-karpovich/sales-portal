import Customer from "../models/customer.model";
import type { ICustomer } from "../data/types";
import { Types } from "mongoose";
import { customSort, getTodaysDate } from "../utils/utils";

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

    const searchRegex = new RegExp(search, "i");
    if (search && search.trim() !== "") {
      filter.$or = [
        { email: { $regex: searchRegex } },
        { name: { $regex: searchRegex } },
        { country: { $regex: searchRegex } },
      ];
    }

    const all = await Customer.find(filter).exec(); // без сортировки и лимита
    const total = all.length;

    const sorted = customSort(all, sortOptions);
    const paginated = sorted.slice(skip, skip + limit);

    return { customers: paginated, total };
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
