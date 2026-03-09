import { Types } from "mongoose";
import type { ICustomer } from "../data/types";
import Customer from "../models/customer.model";
import { getTodaysDate } from "../utils/utils";

type CustomerSortField = "email" | "name" | "country" | "createdOn";
type CustomerSortOrder = "asc" | "desc";

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
    sortOptions: { sortField: CustomerSortField; sortOrder: CustomerSortOrder },
    pagination: { skip: number; limit: number }
  ): Promise<{ customers: ICustomer[]; total: number }> {
    const { skip, limit } = pagination;
    const filter = this.buildFilter(filters);
    const sort = this.buildSort(sortOptions);

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

  async getForExport(
    filters: {
      search?: string;
      country?: string[];
      sortField?: CustomerSortField;
      sortOrder?: CustomerSortOrder;
    } = {}
  ): Promise<ICustomer[]> {
    const filter = this.buildFilter({ search: filters.search ?? "", country: filters.country ?? [] });
    const sort = this.buildSort({
      sortField: filters.sortField ?? "createdOn",
      sortOrder: filters.sortOrder ?? "desc",
    });

    return Customer.find(filter).sort(sort).collation({ locale: "en", strength: 2 }).exec();
  }

  private buildFilter(filters: { search: string; country: string[] }): Record<string, any> {
    const { search, country } = filters;
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

    return filter;
  }

  private buildSort(sortOptions: { sortField: CustomerSortField; sortOrder: CustomerSortOrder }): Record<string, 1 | -1> {
    const allowedSortFields = new Set<CustomerSortField>(["email", "name", "country", "createdOn"]);
    const sortField: CustomerSortField = allowedSortFields.has(sortOptions.sortField) ? sortOptions.sortField : "createdOn";
    const sortOrder: 1 | -1 = sortOptions.sortOrder === "asc" ? 1 : -1;

    const sort: Record<string, 1 | -1> = { [sortField]: sortOrder };
    if (sortField !== "createdOn") {
      sort.createdOn = sortOrder;
    }

    return sort;
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
