import * as dotenv from "dotenv";
import mongoose, { Types } from "mongoose";
import OrderModel from "../../models/order.model";
import ProductModel from "../../models/product.model";
import { getDbUrl } from "../url";

dotenv.config();

type SnapshotLine = {
  productId?: Types.ObjectId | string;
  name?: string;
  displayName?: string;
  attributes?: unknown;
};

function normalizeAttributesRecord(value: unknown): Record<string, string> {
  if (value instanceof Map) {
    return Object.fromEntries(value.entries());
  }
  if (!value || typeof value !== "object") {
    return {};
  }
  return Object.entries(value as Record<string, unknown>).reduce<Record<string, string>>((acc, [key, rawValue]) => {
    if (typeof rawValue === "string") {
      acc[key] = rawValue;
    }
    return acc;
  }, {});
}

function buildDisplayName(params: {
  productName: string;
  variantAttributes: Record<string, string>;
  attributeOrder: string[];
}): string {
  const { productName, variantAttributes, attributeOrder } = params;
  const baseName = (productName ?? "").trim();
  if (!baseName) {
    return "";
  }

  if (!Array.isArray(attributeOrder) || attributeOrder.length === 0) {
    return baseName;
  }

  const values = attributeOrder
    .map((attributeKey) => {
      const byExact = variantAttributes[attributeKey];
      if (typeof byExact === "string" && byExact.trim().length > 0) {
        return byExact.trim();
      }

      const byLower = variantAttributes[attributeKey.toLowerCase()];
      if (typeof byLower === "string" && byLower.trim().length > 0) {
        return byLower.trim();
      }

      return "";
    })
    .filter((value) => value.length > 0);

  if (values.length === 0) {
    return baseName;
  }

  return [baseName, ...values].join(" | ");
}

function toProductIdString(value: Types.ObjectId | string | undefined): string {
  if (!value) {
    return "";
  }
  return value.toString();
}

async function runMigration() {
  const dbUrl = getDbUrl();
  await mongoose.connect(dbUrl, {});

  const products = await ProductModel.find({}, { _id: 1, attributes: 1 }).lean().exec();
  const productAttributeOrderById = new Map<string, string[]>();
  for (const product of products as Array<{ _id: Types.ObjectId; attributes?: Array<{ key?: string }> }>) {
    const orderedKeys = Array.isArray(product.attributes)
      ? product.attributes
          .map((attribute) => (typeof attribute?.key === "string" ? attribute.key.trim() : ""))
          .filter((key) => key.length > 0)
      : [];
    productAttributeOrderById.set(product._id.toString(), orderedKeys);
  }

  const orders = await OrderModel.find({}, { products: 1, history: 1 }).lean().exec();
  let updatedOrdersCount = 0;

  for (const order of orders as Array<{
    _id: Types.ObjectId;
    products?: SnapshotLine[];
    history?: Array<{ products?: SnapshotLine[] }>;
  }>) {
    let changed = false;

    const nextProducts = (order.products ?? []).map((line) => {
      const productId = toProductIdString(line.productId);
      const attributeOrder = productAttributeOrderById.get(productId) ?? [];
      const nextDisplayName = buildDisplayName({
        productName: line.name ?? "",
        variantAttributes: normalizeAttributesRecord(line.attributes),
        attributeOrder,
      });
      if ((line.displayName ?? "") !== nextDisplayName) {
        changed = true;
      }
      return {
        ...line,
        displayName: nextDisplayName,
      };
    });

    const nextHistory = (order.history ?? []).map((historyEntry) => {
      const nextHistoryProducts = (historyEntry.products ?? []).map((line) => {
        const productId = toProductIdString(line.productId);
        const attributeOrder = productAttributeOrderById.get(productId) ?? [];
        const nextDisplayName = buildDisplayName({
          productName: line.name ?? "",
          variantAttributes: normalizeAttributesRecord(line.attributes),
          attributeOrder,
        });
        if ((line.displayName ?? "") !== nextDisplayName) {
          changed = true;
        }
        return {
          ...line,
          displayName: nextDisplayName,
        };
      });

      return {
        ...historyEntry,
        products: nextHistoryProducts,
      };
    });

    if (!changed) {
      continue;
    }

    await OrderModel.updateOne(
      { _id: order._id },
      {
        $set: {
          products: nextProducts,
          history: nextHistory,
        },
      },
    );
    updatedOrdersCount += 1;
  }

  if (updatedOrdersCount > 0) {
    console.log(`Order displayName migration completed: updated ${updatedOrdersCount} order(s)`);
    return;
  }

  console.log("Order displayName migration skipped: no documents required update");
}

runMigration()
  .catch((error) => {
    console.error("Order displayName migration failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
