import moment from "moment";
import { DATE_AND_TIME_FORMAT, DATE_FORMAT } from "../data/constants";
import { ORDER_HISTORY_ACTIONS, ROLES } from "../data/enums";
import type { ICustomer, IHistory, IOrder, IOrderCustomerSnapshot, IOrderRequest, IProduct } from "../data/types";
import { IProductInOrder } from "../data/types/order.type";
import ProductsService from "../services/products.service";
import { Request } from "express";
import jsonwebtoken from "jsonwebtoken";
import { IManagerWithRoles } from "../data/types/manager.types";
import { Types } from "mongoose";

export const getTotalPrice = (products: IProductInOrder[]) => {
  return products.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
};

export function buildVariantDisplayName(
  product: Pick<IProduct, "name" | "attributes">,
  variant: Pick<IProduct["variants"][number], "attributes">,
): string {
  const productName = (product?.name ?? "").trim();
  const productAttributes = Array.isArray(product?.attributes) ? product.attributes : [];
  if (productAttributes.length === 0) {
    return productName;
  }

  const variantAttributes = variant?.attributes ?? {};
  const orderedValues = productAttributes
    .map((attribute) => {
      const byExact = variantAttributes?.[attribute.key];
      if (typeof byExact === "string" && byExact.trim().length > 0) {
        return byExact.trim();
      }

      const byLower = variantAttributes?.[attribute.key.toLowerCase()];
      if (typeof byLower === "string" && byLower.trim().length > 0) {
        return byLower.trim();
      }

      return "";
    })
    .filter((value) => value.length > 0);

  if (orderedValues.length === 0) {
    return productName;
  }

  return [productName, ...orderedValues].join(" | ");
}

export const getTodaysDate = (withTime: boolean) => {
  return withTime ? moment(Date.now()).format(DATE_AND_TIME_FORMAT) : moment(Date.now()).format(DATE_FORMAT);
};

type HistorySource = {
  status: IHistory["status"];
  customer: Types.ObjectId | string | { _id?: Types.ObjectId | string } | undefined;
  products: IProductInOrder[];
  delivery: IHistory["delivery"];
  total_price: number;
  assignedManager: IHistory["assignedManager"];
};

export function createHistoryEntry(
  order: HistorySource,
  action: ORDER_HISTORY_ACTIONS,
  performer: IManagerWithRoles,
): IHistory {
  const orderCustomer = order.customer;
  if (orderCustomer instanceof Types.ObjectId) {
    return {
      action,
      status: order.status,
      products: order.products,
      customer: orderCustomer,
      delivery: order.delivery,
      total_price: order.total_price,
      changedOn: getTodaysDate(true),
      performer,
      assignedManager: order.assignedManager,
    };
  }

  const customerValue =
    typeof orderCustomer === "object" && orderCustomer !== null && "_id" in orderCustomer
      ? orderCustomer._id
      : orderCustomer;
  if (!customerValue) {
    throw new Error("Customer id was not provided for history entry");
  }
  const customerId = new Types.ObjectId(customerValue as Types.ObjectId | string);
  return {
    action,
    status: order.status,
    products: order.products,
    customer: customerId,
    delivery: order.delivery,
    total_price: order.total_price,
    changedOn: getTodaysDate(true),
    performer,
    assignedManager: order.assignedManager,
  };
}

export async function productsMapping<T extends Pick<IOrderRequest, "products">>(order: T): Promise<IProductInOrder[]> {
  const products = await Promise.all(
    order.products.map(async (item) => {
      const product = await ProductsService.getProduct(item.productId);
      const variant = product?.variants?.find(
        (productVariant) => productVariant._id?.toString() === item.variantId.toString(),
      );
      if (!variant) {
        throw new Error(`Variant with id '${item.variantId}' was not found in product '${item.productId}'`);
      }
      const imageUrl = variant.imageUrl ?? product.imageUrl;
      return {
        productId: new Types.ObjectId(item.productId),
        variantId: new Types.ObjectId(item.variantId),
        manufacturer: product.manufacturer,
        unitPrice: variant.price,
        quantity: item.quantity,
        name: product.name,
        displayName: buildVariantDisplayName(product, variant),
        attributes: variant.attributes,
        received: false,
        ...(imageUrl && { imageUrl }),
      };
    }),
  );
  return products;
}

/**
 * Custom sorting function for products, customers or orders.
 * @param products Products to sort.
 * @param sortOptions Sorting options.
 * @returns Sorted products.
 */
export function customSort<T extends IProduct | ICustomer | IOrder<IOrderCustomerSnapshot>>(
  entities: T[],
  sortOptions: { sortField: string; sortOrder: string },
): T[] {
  return [...entities].sort((a, b) => {
    const { sortField, sortOrder } = sortOptions;
    const direction = sortOrder === "asc" ? 1 : -1;

    const createdOnA = moment(a.createdOn, DATE_AND_TIME_FORMAT).valueOf();
    const createdOnB = moment(b.createdOn, DATE_AND_TIME_FORMAT).valueOf();

    if (sortField === "createdOn") {
      return (createdOnA - createdOnB) * direction;
    }

    const primaryFieldA = a[sortField];
    const primaryFieldB = b[sortField];

    let comparison = 0;

    if (typeof primaryFieldA === "number" && typeof primaryFieldB === "number") {
      comparison = primaryFieldA - primaryFieldB;
    } else if (sortField === "assignedManager") {
      if (primaryFieldA === null) {
        comparison = 1;
      } else if (primaryFieldB === null) {
        comparison = -1;
      } else {
        const a = `${primaryFieldA.firstName} ${primaryFieldA.lastName}`;
        const b = `${primaryFieldB.firstName} ${primaryFieldB.lastName}`;
        comparison = a.localeCompare(b);
      }
    } else if (typeof primaryFieldA === "string" && typeof primaryFieldB === "string") {
      comparison = primaryFieldA.localeCompare(primaryFieldB);
    }

    if (comparison !== 0) {
      return comparison * direction;
    }

    return (createdOnA - createdOnB) * direction;
  });
}

export function getTokenFromRequest(req: Request) {
  const token = req.headers.authorization?.split(" ")[1];
  return token;
}

export function getDataDataFromToken(token: string) {
  const decodedData = jsonwebtoken.verify(token, process.env.SECRET_KEY);
  return decodedData as {
    id: string;
    roles: ROLES[];
    iat: number;
    exp: number;
  };
}

export function getManagerFromRequest(req: Request) {
  const token = getTokenFromRequest(req);
  return getDataDataFromToken(token);
}
