import { Types } from "mongoose";
import type { ICustomer } from "../data/types";
import Customer from "../models/customer.model";
import Order from "../models/order.model";
import SettingsModel from "../models/settings.model";
import { getTodaysDate } from "../utils/utils";
import { CustomerExportFormatDTO } from "../data/types/dto/customers.dto";
import ExportService from "./export.service";

type CustomerSortField = "email" | "name" | "createdOn";
type CustomerSortOrder = "asc" | "desc";

class CustomerService {
  private readonly exportableFields = new Set<string>([
    "_id",
    "email",
    "name",
    "state",
    "city",
    "street",
    "house",
    "apartment",
    "zipCode",
    "phone",
    "createdOn",
    "notes",
  ]);

  async create(customer: Omit<ICustomer, "_id" | "createdOn">): Promise<ICustomer> {
    const createdCustomer = await Customer.create({ ...customer, createdOn: getTodaysDate(true) });
    return createdCustomer;
  }

  async getAll(): Promise<ICustomer[]> {
    const customers = await Customer.find();
    return customers.reverse();
  }

  async getSorted(
    filters: { search: string; state?: string[]; includeOtherStates?: boolean },
    sortOptions: { sortField: CustomerSortField; sortOrder: CustomerSortOrder },
    pagination: { skip: number; limit: number }
  ): Promise<{ customers: ICustomer[]; total: number }> {
    const { skip, limit } = pagination;
    const filter = await this.buildFilter(filters);
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
      state?: string[];
      includeOtherStates?: boolean;
      page?: number;
      limit?: number;
      sortField?: CustomerSortField;
      sortOrder?: CustomerSortOrder;
    } = {},
    fields: string[] = []
  ): Promise<ICustomer[]> {
    const filter = await this.buildFilter({
      search: filters.search ?? "",
      state: filters.state ?? [],
      includeOtherStates: filters.includeOtherStates ?? false,
    });
    const sort = this.buildSort({
      sortField: filters.sortField ?? "createdOn",
      sortOrder: filters.sortOrder ?? "desc",
    });

    const query = Customer.find(filter).sort(sort).collation({ locale: "en", strength: 2 });
    if (fields.length > 0) {
      query.select(fields.join(" "));
    }

    if (typeof filters.page === "number" && typeof filters.limit === "number" && filters.page > 0 && filters.limit > 0) {
      const skip = (filters.page - 1) * filters.limit;
      query.skip(skip).limit(filters.limit);
    }

    return query.exec();
  }

  async exportCustomers(params: {
    format: CustomerExportFormatDTO;
    fields: string[];
    filters?: {
      search?: string;
      state?: string[];
      includeOtherStates?: boolean;
      page?: number;
      limit?: number;
      sortField?: CustomerSortField;
      sortOrder?: CustomerSortOrder;
    } | null;
  }): Promise<{ fileName: string; contentType: string; content: string }> {
    const { format, fields, filters } = params;

    if (!["csv", "json"].includes(format)) {
      throw new Error("EXPORT_VALIDATION:Invalid export format");
    }

    ExportService.assertSelectedFields(fields, this.exportableFields);

    const customers = await this.getForExport(
      {
        search: filters?.search ?? "",
        state: filters?.state ?? [],
        includeOtherStates: filters?.includeOtherStates ?? false,
        page: filters?.page,
        limit: filters?.limit,
        sortField: filters?.sortField ?? "createdOn",
        sortOrder: filters?.sortOrder ?? "desc",
      },
      fields,
    );

    // TODO(types): make ExportService.pickFields generic and remove array cast.
    const rows = ExportService.pickFields(customers as unknown as Record<string, unknown>[], fields);
    const fileName = ExportService.buildFileName("customers-export", format);

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

  private async buildFilter(filters: {
    search: string;
    state?: string[];
    includeOtherStates?: boolean;
  }): Promise<Record<string, any>> {
    const { search, state = [], includeOtherStates = false } = filters;
    const andFilters: Record<string, unknown>[] = [];

    const normalizedStates = [...new Set(state.map((stateCode) => stateCode.trim()).filter((stateCode) => stateCode.length > 0))];

    if (normalizedStates.length > 0 || includeOtherStates) {
      const defaultStates = await this.getDefaultDeliveryStates();

      if (normalizedStates.length > 0 && includeOtherStates) {
        andFilters.push({
          $or: [
            { state: { $in: normalizedStates } },
            { state: { $nin: defaultStates } },
          ],
        });
      } else if (normalizedStates.length > 0) {
        andFilters.push({ state: { $in: normalizedStates } });
      } else {
        andFilters.push({ state: { $nin: defaultStates } });
      }
    }

    if (search && search.trim() !== "") {
      const searchRegex = new RegExp(search, "i");
      andFilters.push({
        $or: [
        { email: { $regex: searchRegex } },
        { name: { $regex: searchRegex } },
        ],
      });
    }

    if (andFilters.length === 0) {
      return {};
    }

    if (andFilters.length === 1) {
      return andFilters[0] as Record<string, any>;
    }

    return { $and: andFilters };
  }

  private async getDefaultDeliveryStates(): Promise<string[]> {
    const settings = await SettingsModel.findOne().select({ "shipping.pickup.locations": 1, _id: 0 }).lean().exec();
    const pickupLocations = settings?.shipping?.pickup?.locations;
    if (pickupLocations instanceof Map) {
      return [...pickupLocations.keys()];
    }
    if (!pickupLocations || typeof pickupLocations !== "object") {
      return [];
    }
    return Object.keys(pickupLocations);
  }

  private buildSort(sortOptions: { sortField: CustomerSortField; sortOrder: CustomerSortOrder }): Record<string, 1 | -1> {
    const allowedSortFields = new Set<CustomerSortField>(["email", "name", "createdOn"]);
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
    return Customer.findById(id).lean().exec();
  }

  async update(customer: Omit<ICustomer, "createdOn"> & { _id: Types.ObjectId }): Promise<ICustomer> {
    if (!customer._id) {
      throw new Error("Id was not provided");
    }
    const updatedCustomer = await Customer.findByIdAndUpdate(customer._id, customer, { new: true });
    if (updatedCustomer) {
      await Order.updateMany(
        { "customer._id": updatedCustomer._id },
        {
          $set: {
            "customer.email": updatedCustomer.email,
            "customer.name": updatedCustomer.name,
          },
        },
      );
    }
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
