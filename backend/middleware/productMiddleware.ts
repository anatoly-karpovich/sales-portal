import ProductsService from "../services/products.service.js";
import Product from "../models/product.model.js";
import Order from "../models/order.model.js";
import { Response, NextFunction } from "express";
import { Types } from "mongoose";
import { BaseResponseDTO } from "../data/types/dto/common.dto.js";
import {
  CreateProductVariantsRequestDTO,
  CreateProductRequestDTO,
  DeleteProductRequestDTO,
  DeleteProductVariantRequestDTO,
  GetProductByIdRequestDTO,
  PatchProductStatusRequestDTO,
  PatchProductVariantStatusRequestDTO,
  PatchProductRequestDTO,
  PatchProductVariantRequestDTO,
  ReplaceProductVariantsRequestDTO,
  ReplaceProductRequestDTO,
  ValidateProductVariantsRequestDTO,
} from "../data/types/dto/products.dto.js";
import { PRODUCT_STATUSES } from "../data/enums.js";
import { SettingsService } from "../services/settings.service.js";

const settingsService = new SettingsService();
const MAX_VARIANTS_PER_REQUEST = 200;

const PRODUCT_STATUS_TRANSITIONS: Record<PRODUCT_STATUSES, PRODUCT_STATUSES[]> = {
  [PRODUCT_STATUSES.DRAFT]: [PRODUCT_STATUSES.ACTIVE],
  [PRODUCT_STATUSES.ACTIVE]: [PRODUCT_STATUSES.ARCHIVED],
  [PRODUCT_STATUSES.ARCHIVED]: [PRODUCT_STATUSES.ACTIVE],
};

type MutableVariant = {
  _id?: Types.ObjectId | string;
  price: number;
  status: PRODUCT_STATUSES;
  attributes: Record<string, string>;
  imageUrl?: string;
};

type MutableProduct = {
  name: string;
  manufacturer: string;
  category: string;
  description?: string;
  imageUrl?: string;
  status: PRODUCT_STATUSES;
  attributes: Array<{ key: string; name: string; values: string[] }>;
  variants: MutableVariant[];
};

function toDecimalWithTwoPlaces(value: number) {
  return Number(value.toFixed(2));
}

function isTwoDecimalPrice(value: number) {
  if (typeof value !== "number" || Number.isNaN(value) || value <= 0) {
    return false;
  }
  return Math.abs(value * 100 - Math.round(value * 100)) < 1e-6;
}

function normalizeText(value: string) {
  return value.trim();
}

function normalizeKey(value: string) {
  return normalizeText(value).toLowerCase();
}

function normalizeRecord(record: Record<string, string>): Record<string, string> {
  const normalized: Record<string, string> = {};
  for (const [rawKey, rawValue] of Object.entries(record ?? {})) {
    normalized[normalizeKey(rawKey)] = normalizeText(rawValue);
  }
  return normalized;
}

function normalizeAttributes(attributes: MutableProduct["attributes"]) {
  return attributes.map((attribute) => ({
    key: normalizeKey(attribute.key),
    name: normalizeText(attribute.name),
    values: attribute.values.map((value) => normalizeText(value)),
  }));
}

function normalizeProductPayload(product: MutableProduct): MutableProduct {
  return {
    ...product,
    name: normalizeText(product.name),
    manufacturer: normalizeText(product.manufacturer),
    category: normalizeText(product.category),
    description: product.description ? normalizeText(product.description) : product.description,
    imageUrl: product.imageUrl ? normalizeText(product.imageUrl) : product.imageUrl,
    attributes: normalizeAttributes(product.attributes),
    variants: product.variants.map((variant) => ({
      ...variant,
      price: toDecimalWithTwoPlaces(variant.price),
      imageUrl: variant.imageUrl ? normalizeText(variant.imageUrl) : variant.imageUrl,
      attributes: normalizeRecord(variant.attributes),
    })),
  };
}

function validateProductDefinition(product: MutableProduct, allowedManufacturers: string[]): string | null {
  if (!product.name || !product.manufacturer || !product.category) {
    return "Incorrect request body";
  }

  if (!Object.values(PRODUCT_STATUSES).includes(product.status)) {
    return "Incorrect request body";
  }

  const allowedManufacturerKeys = new Set(allowedManufacturers.map((value) => normalizeKey(value)));
  if (!allowedManufacturerKeys.has(normalizeKey(product.manufacturer))) {
    return "No such manufacturer is defined";
  }

  const attributeKeys = new Set<string>();
  for (const attribute of product.attributes) {
    if (!attribute.key || !attribute.name || attribute.name.length > 100) {
      return "Incorrect request body";
    }
    if (!Array.isArray(attribute.values) || attribute.values.length === 0) {
      return "Incorrect request body";
    }
    if (attributeKeys.has(attribute.key)) {
      return `Duplicate product attribute key '${attribute.key}'`;
    }
    attributeKeys.add(attribute.key);

    const valuesSet = new Set<string>();
    for (const value of attribute.values) {
      if (!value) {
        return "Incorrect request body";
      }
      const normalizedValue = normalizeKey(value);
      if (valuesSet.has(normalizedValue)) {
        return `Duplicate product attribute value '${value}' for key '${attribute.key}'`;
      }
      valuesSet.add(normalizedValue);
    }
  }

  if (!Array.isArray(product.variants) || product.variants.length < 1) {
    return "Product should contain at least one variant";
  }

  const attributeValuesByKey = new Map<string, Set<string>>();
  for (const attribute of product.attributes) {
    attributeValuesByKey.set(attribute.key, new Set(attribute.values.map((value) => normalizeKey(value))));
  }

  const uniqueCombinations = new Set<string>();
  const requiredKeys = [...attributeValuesByKey.keys()].sort();

  for (const variant of product.variants) {
    if (!isTwoDecimalPrice(variant.price)) {
      return "Incorrect request body";
    }
    if (!Object.values(PRODUCT_STATUSES).includes(variant.status)) {
      return "Incorrect request body";
    }

    const variantKeys = Object.keys(variant.attributes).map((key) => normalizeKey(key)).sort();
    if (variantKeys.length !== requiredKeys.length) {
      return "Variant attributes must include all product attribute keys";
    }

    for (let index = 0; index < requiredKeys.length; index += 1) {
      if (variantKeys[index] !== requiredKeys[index]) {
        return "Variant attributes must include all product attribute keys";
      }
    }

    for (const key of requiredKeys) {
      const rawValue = variant.attributes[key];
      const normalizedValue = normalizeKey(rawValue ?? "");
      const allowedValues = attributeValuesByKey.get(key);
      if (!normalizedValue || !allowedValues || !allowedValues.has(normalizedValue)) {
        return `Variant attribute value '${rawValue}' is invalid for key '${key}'`;
      }
      variant.attributes[key] = normalizeText(rawValue);
    }

    const combination = requiredKeys.map((key) => `${key}:${normalizeKey(variant.attributes[key])}`).join("|");
    if (uniqueCombinations.has(combination)) {
      return "Variant attributes combination must be unique";
    }
    uniqueCombinations.add(combination);
  }

  return null;
}

function getProductValidationStatusCode(validationError: string): 400 | 409 {
  if (validationError.startsWith("Duplicate ") || validationError === "Variant attributes combination must be unique") {
    return 409;
  }
  return 400;
}

function normalizeVariantPayload(variant: {
  _id?: Types.ObjectId | string;
  price: number;
  status: PRODUCT_STATUSES;
  attributes: Record<string, string>;
  imageUrl?: string;
}): MutableVariant {
  return {
    ...variant,
    price: toDecimalWithTwoPlaces(variant.price),
    imageUrl: variant.imageUrl ? normalizeText(variant.imageUrl) : variant.imageUrl,
    attributes: normalizeRecord(variant.attributes),
  };
}

async function validateNextProductPayload(
  nextProduct: MutableProduct,
  res: Response<BaseResponseDTO>,
): Promise<Response<BaseResponseDTO> | null> {
  const allowedManufacturers = await getAllowedManufacturers();
  const validationError = validateProductDefinition(nextProduct, allowedManufacturers);
  if (!validationError) {
    return null;
  }
  return res.status(getProductValidationStatusCode(validationError)).json({ IsSuccess: false, ErrorMessage: validationError });
}

async function ensureRemovedVariantsAreNotAssigned(params: {
  productId: string;
  currentVariants: MutableVariant[];
  nextVariants: MutableVariant[];
  res: Response<BaseResponseDTO>;
}): Promise<Response<BaseResponseDTO> | null> {
  const { productId, currentVariants, nextVariants, res } = params;
  const nextVariantIds = new Set(
    nextVariants
      .map((variant) => (variant._id ? variant._id.toString() : null))
      .filter((value): value is string => Boolean(value)),
  );
  const removedVariantIds = currentVariants
    .map((variant) => (variant._id ? variant._id.toString() : null))
    .filter((value): value is string => Boolean(value) && !nextVariantIds.has(value));

  if (removedVariantIds.length === 0) {
    return null;
  }

  const productIdObject = new Types.ObjectId(productId);
  const removedVariantObjectIds = removedVariantIds.map((id) => new Types.ObjectId(id));
  const isAssignedToOrder = await Order.exists({
    products: {
      $elemMatch: {
        "product._id": productIdObject,
        "variant._id": { $in: removedVariantObjectIds },
      },
    },
  });

  if (isAssignedToOrder) {
    return res.status(409).json({
      IsSuccess: false,
      ErrorMessage: "Not allowed to delete variant, assigned to the order",
    });
  }

  return null;
}

async function getAllowedManufacturers(): Promise<string[]> {
  const settings = await settingsService.get();
  return settings?.catalog?.manufacturers ?? [];
}

export async function uniqueProduct(
  req: CreateProductRequestDTO | ReplaceProductRequestDTO | PatchProductRequestDTO,
  res: Response<BaseResponseDTO>,
  next: NextFunction,
) {
  try {
    if (typeof req.body?.name !== "string") {
      return next();
    }

    const normalizedName = normalizeText(req.body.name);
    if (!normalizedName) {
      return next();
    }

    req.body.name = normalizedName;

    const escapedName = normalizedName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const filter: { name: { $regex: RegExp }; _id?: { $ne: Types.ObjectId } } = {
      name: { $regex: new RegExp(`^${escapedName}$`, "i") },
    };
    if (req.params.productId && Types.ObjectId.isValid(req.params.productId)) {
      filter._id = { $ne: new Types.ObjectId(req.params.productId) };
    }

    const existingProduct = await Product.findOne(filter).select("_id").lean();
    if (existingProduct) {
      return res
        .status(409)
        .json({ IsSuccess: false, ErrorMessage: `Product with name '${normalizedName}' already exists` });
    }
  } catch (e: any) {
    return res.status(500).json({ IsSuccess: false, ErrorMessage: e.message });
  }
  next();
}

export async function productCreateOrReplaceValidations(
  req: CreateProductRequestDTO | ReplaceProductRequestDTO,
  res: Response<BaseResponseDTO>,
  next: NextFunction,
) {
  try {
    const normalizedPayload = normalizeProductPayload(req.body as MutableProduct);
    const validationResponse = await validateNextProductPayload(normalizedPayload, res);
    if (validationResponse) {
      return validationResponse;
    }

    req.body = normalizedPayload as typeof req.body;
    next();
  } catch (e: any) {
    return res.status(500).json({ IsSuccess: false, ErrorMessage: e.message });
  }
}

export async function productPatchValidations(
  req: PatchProductRequestDTO,
  res: Response<BaseResponseDTO>,
  next: NextFunction,
) {
  try {
    const product = req.product as unknown as MutableProduct | undefined;
    if (!product) {
      return res.status(404).json({ IsSuccess: false, ErrorMessage: `Product with id '${req.params.productId}' wasn't found` });
    }

    const nextProduct: MutableProduct = normalizeProductPayload({
      ...product,
      ...req.body,
      attributes: req.body.attributes ?? product.attributes,
      variants: product.variants,
    } as MutableProduct);

    const validationResponse = await validateNextProductPayload(nextProduct, res);
    if (validationResponse) {
      return validationResponse;
    }

    const normalizedPatch = {
      ...req.body,
      name: typeof req.body.name === "string" ? normalizeText(req.body.name) : req.body.name,
      manufacturer:
        typeof req.body.manufacturer === "string" ? normalizeText(req.body.manufacturer) : req.body.manufacturer,
      category: typeof req.body.category === "string" ? normalizeText(req.body.category) : req.body.category,
      description:
        typeof req.body.description === "string" ? normalizeText(req.body.description) : req.body.description,
      imageUrl: typeof req.body.imageUrl === "string" ? normalizeText(req.body.imageUrl) : req.body.imageUrl,
      attributes: req.body.attributes ? normalizeAttributes(req.body.attributes as MutableProduct["attributes"]) : req.body.attributes,
    };

    req.body = normalizedPatch as typeof req.body;
    next();
  } catch (e: any) {
    return res.status(500).json({ IsSuccess: false, ErrorMessage: e.message });
  }
}

export async function productVariantPatchValidations(
  req: PatchProductVariantRequestDTO,
  res: Response<BaseResponseDTO>,
  next: NextFunction,
) {
  try {
    const product = req.product as unknown as MutableProduct | undefined;
    if (!product) {
      return res.status(404).json({ IsSuccess: false, ErrorMessage: `Product with id '${req.params.productId}' wasn't found` });
    }

    const variantId = req.params.variantId;
    if (!variantId || !Types.ObjectId.isValid(variantId)) {
      return res.status(404).json({ IsSuccess: false, ErrorMessage: `Variant with id '${variantId}' wasn't found` });
    }

    const existingVariant = product.variants.find((variant) => variant._id?.toString() === variantId);
    if (!existingVariant) {
      return res.status(404).json({ IsSuccess: false, ErrorMessage: `Variant with id '${variantId}' wasn't found` });
    }

    const normalizedPatch = {
      ...req.body,
      price: req.body.price !== undefined ? toDecimalWithTwoPlaces(req.body.price) : undefined,
      imageUrl: req.body.imageUrl ? normalizeText(req.body.imageUrl) : req.body.imageUrl,
      attributes: req.body.attributes ? normalizeRecord(req.body.attributes) : req.body.attributes,
    };

    const nextVariants = product.variants.map((variant) =>
      variant._id?.toString() === variantId ? { ...variant, ...normalizedPatch } : variant,
    );

    const normalizedProduct: MutableProduct = normalizeProductPayload({
      ...product,
      variants: nextVariants,
    });

    const validationResponse = await validateNextProductPayload(normalizedProduct, res);
    if (validationResponse) {
      return validationResponse;
    }

    req.body = normalizedPatch as typeof req.body;
    next();
  } catch (e: any) {
    return res.status(500).json({ IsSuccess: false, ErrorMessage: e.message });
  }
}

export async function productVariantsCreateValidations(
  req: CreateProductVariantsRequestDTO,
  res: Response<BaseResponseDTO>,
  next: NextFunction,
) {
  try {
    const product = req.product as unknown as MutableProduct | undefined;
    if (!product) {
      return res.status(404).json({ IsSuccess: false, ErrorMessage: `Product with id '${req.params.productId}' wasn't found` });
    }

    if (!Array.isArray(req.body) || req.body.length < 1 || req.body.length > MAX_VARIANTS_PER_REQUEST) {
      return res.status(400).json({ IsSuccess: false, ErrorMessage: "Incorrect request body" });
    }

    const normalizedVariants = req.body.map((variant) => normalizeVariantPayload(variant));

    const normalizedProduct: MutableProduct = normalizeProductPayload({
      ...product,
      variants: [...product.variants, ...normalizedVariants],
    });

    const validationResponse = await validateNextProductPayload(normalizedProduct, res);
    if (validationResponse) {
      return validationResponse;
    }

    req.body = normalizedVariants as typeof req.body;
    next();
  } catch (e: any) {
    return res.status(500).json({ IsSuccess: false, ErrorMessage: e.message });
  }
}

export async function productVariantsReplaceValidations(
  req: ReplaceProductVariantsRequestDTO,
  res: Response<BaseResponseDTO>,
  next: NextFunction,
) {
  try {
    const product = req.product as unknown as MutableProduct | undefined;
    if (!product) {
      return res.status(404).json({ IsSuccess: false, ErrorMessage: `Product with id '${req.params.productId}' wasn't found` });
    }

    if (!Array.isArray(req.body) || req.body.length < 1 || req.body.length > MAX_VARIANTS_PER_REQUEST) {
      return res.status(400).json({ IsSuccess: false, ErrorMessage: "Incorrect request body" });
    }

    const existingVariantIds = new Set(
      product.variants
        .map((variant) => (variant._id ? variant._id.toString() : null))
        .filter((value): value is string => Boolean(value)),
    );
    const receivedVariantIds = new Set<string>();
    const normalizedVariants: MutableVariant[] = [];

    for (const variant of req.body) {
      if (variant._id !== undefined) {
        const id = variant._id.toString();
        if (!Types.ObjectId.isValid(id) || !existingVariantIds.has(id)) {
          return res.status(404).json({ IsSuccess: false, ErrorMessage: `Variant with id '${id}' wasn't found` });
        }
        if (receivedVariantIds.has(id)) {
          return res.status(409).json({ IsSuccess: false, ErrorMessage: `Duplicate variant id '${id}' is not allowed` });
        }
        receivedVariantIds.add(id);
      }

      normalizedVariants.push(normalizeVariantPayload(variant));
    }

    const removedCheckResponse = await ensureRemovedVariantsAreNotAssigned({
      productId: req.params.productId,
      currentVariants: product.variants,
      nextVariants: normalizedVariants,
      res,
    });
    if (removedCheckResponse) {
      return removedCheckResponse;
    }

    const normalizedProduct: MutableProduct = normalizeProductPayload({
      ...product,
      variants: normalizedVariants,
    });
    const validationResponse = await validateNextProductPayload(normalizedProduct, res);
    if (validationResponse) {
      return validationResponse;
    }

    req.body = normalizedVariants as typeof req.body;
    next();
  } catch (e: any) {
    return res.status(500).json({ IsSuccess: false, ErrorMessage: e.message });
  }
}

export async function productVariantsValidate(
  req: ValidateProductVariantsRequestDTO,
  res: Response<BaseResponseDTO>,
  next: NextFunction,
) {
  try {
    const product = req.product as unknown as MutableProduct | undefined;
    if (!product) {
      return res.status(404).json({ IsSuccess: false, ErrorMessage: `Product with id '${req.params.productId}' wasn't found` });
    }

    if (!Array.isArray(req.body) || req.body.length < 1 || req.body.length > MAX_VARIANTS_PER_REQUEST) {
      return res.status(400).json({ IsSuccess: false, ErrorMessage: "Incorrect request body" });
    }

    const existingVariantIds = new Set(
      product.variants
        .map((variant) => (variant._id ? variant._id.toString() : null))
        .filter((value): value is string => Boolean(value)),
    );
    const receivedVariantIds = new Set<string>();
    const normalizedVariants: MutableVariant[] = [];

    for (const variant of req.body) {
      if (variant._id !== undefined) {
        const id = variant._id.toString();
        if (!Types.ObjectId.isValid(id) || !existingVariantIds.has(id)) {
          return res.status(404).json({ IsSuccess: false, ErrorMessage: `Variant with id '${id}' wasn't found` });
        }
        if (receivedVariantIds.has(id)) {
          return res.status(409).json({ IsSuccess: false, ErrorMessage: `Duplicate variant id '${id}' is not allowed` });
        }
        receivedVariantIds.add(id);
      }

      normalizedVariants.push(normalizeVariantPayload(variant));
    }

    const normalizedProduct: MutableProduct = normalizeProductPayload({
      ...product,
      variants: normalizedVariants,
    });
    const validationResponse = await validateNextProductPayload(normalizedProduct, res);
    if (validationResponse) {
      return validationResponse;
    }

    req.body = normalizedVariants as typeof req.body;
    next();
  } catch (e: any) {
    return res.status(500).json({ IsSuccess: false, ErrorMessage: e.message });
  }
}

export async function productStatusPatchValidations(
  req: PatchProductStatusRequestDTO,
  res: Response<BaseResponseDTO>,
  next: NextFunction,
) {
  try {
    const product = req.product as unknown as MutableProduct | undefined;
    if (!product) {
      return res.status(404).json({ IsSuccess: false, ErrorMessage: `Product with id '${req.params.productId}' wasn't found` });
    }

    const nextStatus = req.body.status;
    if (!Object.values(PRODUCT_STATUSES).includes(nextStatus)) {
      return res.status(400).json({ IsSuccess: false, ErrorMessage: "Incorrect request body" });
    }

    const allowed = PRODUCT_STATUS_TRANSITIONS[product.status] ?? [];
    if (!allowed.includes(nextStatus)) {
      return res.status(400).json({ IsSuccess: false, ErrorMessage: "Invalid product status transition" });
    }

    next();
  } catch (e: any) {
    return res.status(500).json({ IsSuccess: false, ErrorMessage: e.message });
  }
}

export async function productVariantStatusPatchValidations(
  req: PatchProductVariantStatusRequestDTO,
  res: Response<BaseResponseDTO>,
  next: NextFunction,
) {
  try {
    const product = req.product as unknown as MutableProduct | undefined;
    if (!product) {
      return res.status(404).json({ IsSuccess: false, ErrorMessage: `Product with id '${req.params.productId}' wasn't found` });
    }

    const variantId = req.params.variantId;
    if (!variantId || !Types.ObjectId.isValid(variantId)) {
      return res.status(404).json({ IsSuccess: false, ErrorMessage: `Variant with id '${variantId}' wasn't found` });
    }

    const existingVariant = product.variants.find((variant) => variant._id?.toString() === variantId);
    if (!existingVariant) {
      return res.status(404).json({ IsSuccess: false, ErrorMessage: `Variant with id '${variantId}' wasn't found` });
    }

    const nextStatus = req.body.status;
    if (!Object.values(PRODUCT_STATUSES).includes(nextStatus)) {
      return res.status(400).json({ IsSuccess: false, ErrorMessage: "Incorrect request body" });
    }

    next();
  } catch (e: any) {
    return res.status(500).json({ IsSuccess: false, ErrorMessage: e.message });
  }
}

export async function productById(req: GetProductByIdRequestDTO, res: Response<BaseResponseDTO>, next: NextFunction) {
  try {
    const productId = req.params.productId;
    const product = await ProductsService.getProduct(new Types.ObjectId(productId));
    if (!product) {
      return res.status(404).json({ IsSuccess: false, ErrorMessage: `Product with id '${productId}' wasn't found` });
    }
    req.product = product;
    next();
  } catch (e: any) {
    return res.status(500).json({ IsSuccess: false, ErrorMessage: e.message });
  }
}

export async function deleteProduct(req: DeleteProductRequestDTO, res: Response<BaseResponseDTO>, next: NextFunction) {
  try {
    const productId = new Types.ObjectId(req.params.productId);
    const isAssignedToOrder = await Order.exists({ "products.product._id": productId });
    if (isAssignedToOrder) {
      return res
        .status(409)
        .json({ IsSuccess: false, ErrorMessage: `Not allowed to delete product, assigned to the order` });
    }
    next();
  } catch (e: any) {
    return res.status(500).json({ IsSuccess: false, ErrorMessage: e.message });
  }
}

export async function deleteProductVariant(
  req: DeleteProductVariantRequestDTO,
  res: Response<BaseResponseDTO>,
  next: NextFunction,
) {
  try {
    const product = req.product as unknown as MutableProduct | undefined;
    if (!product) {
      return res.status(404).json({ IsSuccess: false, ErrorMessage: `Product with id '${req.params.productId}' wasn't found` });
    }

    const variantId = req.params.variantId;
    if (!variantId || !Types.ObjectId.isValid(variantId)) {
      return res.status(404).json({ IsSuccess: false, ErrorMessage: `Variant with id '${variantId}' wasn't found` });
    }

    const variantExists = product.variants.some((variant) => variant._id?.toString() === variantId);
    if (!variantExists) {
      return res.status(404).json({ IsSuccess: false, ErrorMessage: `Variant with id '${variantId}' wasn't found` });
    }

    if (product.variants.length <= 1) {
      return res.status(400).json({ IsSuccess: false, ErrorMessage: "Product should contain at least one variant" });
    }

    const productIdObject = new Types.ObjectId(req.params.productId);
    const variantIdObject = new Types.ObjectId(variantId);
    const isAssignedToOrder = await Order.exists({
      products: { $elemMatch: { "product._id": productIdObject, "variant._id": variantIdObject } },
    });
    if (isAssignedToOrder) {
      return res.status(409).json({
        IsSuccess: false,
        ErrorMessage: `Not allowed to delete variant, assigned to the order`,
      });
    }

    next();
  } catch (e: any) {
    return res.status(500).json({ IsSuccess: false, ErrorMessage: e.message });
  }
}
