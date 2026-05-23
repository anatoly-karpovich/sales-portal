import ProductsService from "../services/products.service.js";
import Product from "../models/product.model.js";
import Order from "../models/order.model.js";
import { Response, NextFunction } from "express";
import { Types } from "mongoose";
import { BaseResponseDTO } from "../data/types/dto/common.dto.js";
import {
  CompleteProductSetupRequestDTO,
  CreateProductVariantsRequestDTO,
  CreateProductRequestDTO,
  DeleteProductRequestDTO,
  DeleteProductVariantRequestDTO,
  GetProductByIdRequestDTO,
  ProductSetupInitRequestWithEntityDTO,
  PatchProductStatusRequestDTO,
  PatchProductVariantStatusRequestDTO,
  PatchProductRequestDTO,
  ReorderProductAttributesRequestDTO,
  PatchProductVariantRequestDTO,
  ReplaceProductSetupSpecRequestDTO,
  ReplaceProductVariantsRequestDTO,
  ReplaceProductRequestDTO,
  ValidateProductVariantsRequestDTO,
} from "../data/types/dto/products.dto.js";
import { PRODUCT_STATUSES } from "../data/enums.js";
import { SettingsService } from "../services/settings.service.js";
import CategoriesService from "../services/categories.service.js";

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

type VariantPayloadWithoutStatus = {
  _id?: Types.ObjectId | string;
  price: number;
  attributes: Record<string, string>;
  imageUrl?: string;
};

type MutableProduct = {
  name: string;
  manufacturer: string;
  categoryId: string | Types.ObjectId;
  rootCategoryId?: string | Types.ObjectId;
  description?: string;
  imageUrl?: string;
  status: PRODUCT_STATUSES;
  attributes: Array<{ key: string; name: string; values: string[] }>;
  variants: MutableVariant[];
};

type ProductSetupState = MutableProduct & {
  setup?: { completed?: boolean };
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

function areSameAttributeDefinitions(
  currentAttributes: MutableProduct["attributes"],
  nextAttributes: MutableProduct["attributes"],
): boolean {
  if (currentAttributes.length !== nextAttributes.length) {
    return false;
  }

  const currentByKey = new Map(currentAttributes.map((attribute) => [attribute.key, attribute]));
  if (currentByKey.size !== currentAttributes.length) {
    return false;
  }

  const visitedKeys = new Set<string>();
  for (const attribute of nextAttributes) {
    const current = currentByKey.get(attribute.key);
    if (!current) {
      return false;
    }
    if (visitedKeys.has(attribute.key)) {
      return false;
    }
    visitedKeys.add(attribute.key);

    if (current.name !== attribute.name) {
      return false;
    }

    if (current.values.length !== attribute.values.length) {
      return false;
    }

    for (let index = 0; index < current.values.length; index += 1) {
      if (current.values[index] !== attribute.values[index]) {
        return false;
      }
    }
  }

  return visitedKeys.size === currentByKey.size;
}

function normalizeCategoryId(value: string | Types.ObjectId) {
  if (typeof value === "string") {
    return normalizeText(value);
  }
  return value?.toString?.() ?? "";
}

function normalizeProductPayload(product: MutableProduct): MutableProduct {
  return {
    ...product,
    name: normalizeText(product.name),
    manufacturer: normalizeText(product.manufacturer),
    categoryId: normalizeCategoryId(product.categoryId),
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
  if (!product.name || !product.manufacturer || !product.categoryId) {
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
  attributes: Record<string, string>;
  imageUrl?: string;
}, status: PRODUCT_STATUSES): MutableVariant {
  return {
    ...variant,
    status,
    price: toDecimalWithTwoPlaces(variant.price),
    imageUrl: variant.imageUrl ? normalizeText(variant.imageUrl) : variant.imageUrl,
    attributes: normalizeRecord(variant.attributes),
  };
}

function normalizeVariantsForReplace(params: {
  currentVariants: MutableVariant[];
  variantsPayload: VariantPayloadWithoutStatus[];
  res: Response<BaseResponseDTO>;
}): { normalizedVariants: MutableVariant[] } | { errorResponse: Response<BaseResponseDTO> } {
  const { currentVariants, variantsPayload, res } = params;
  const existingVariantsById = new Map(
    currentVariants
      .map((variant) => {
        const id = variant._id?.toString();
        return id ? [id, variant] : null;
      })
      .filter((entry): entry is [string, MutableVariant] => Boolean(entry)),
  );

  const receivedVariantIds = new Set<string>();
  const normalizedVariants: MutableVariant[] = [];

  for (const variant of variantsPayload) {
    if (variant._id !== undefined) {
      const id = variant._id.toString();
      const existingVariant = existingVariantsById.get(id);
      if (!Types.ObjectId.isValid(id) || !existingVariant) {
        return { errorResponse: res.status(404).json({ IsSuccess: false, ErrorMessage: `Variant with id '${id}' wasn't found` }) };
      }
      if (receivedVariantIds.has(id)) {
        return { errorResponse: res.status(409).json({ IsSuccess: false, ErrorMessage: `Duplicate variant id '${id}' is not allowed` }) };
      }
      receivedVariantIds.add(id);
      normalizedVariants.push(normalizeVariantPayload({ ...variant, _id: existingVariant._id }, existingVariant.status));
      continue;
    }

    normalizedVariants.push(normalizeVariantPayload(variant, PRODUCT_STATUSES.DRAFT));
  }

  return { normalizedVariants };
}

async function validateNextProductPayload(
  nextProduct: MutableProduct,
  res: Response<BaseResponseDTO>,
  options: { validateCategoryExists: boolean },
): Promise<Response<BaseResponseDTO> | null> {
  if (!Types.ObjectId.isValid(nextProduct.categoryId.toString())) {
    return res.status(400).json({ IsSuccess: false, ErrorMessage: "Incorrect request body" });
  }

  if (options.validateCategoryExists) {
    const categoryValidation = await CategoriesService.validateCategoryExists(nextProduct.categoryId.toString());
    if (categoryValidation.isValid === false) {
      return res.status(400).json({ IsSuccess: false, ErrorMessage: categoryValidation.error });
    }
  }

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
        productId: productIdObject,
        variantId: { $in: removedVariantObjectIds },
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
  req:
    | CreateProductRequestDTO
    | ReplaceProductRequestDTO
    | PatchProductRequestDTO
    | ProductSetupInitRequestWithEntityDTO,
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

function isDraftSetupProduct(product: ProductSetupState): boolean {
  return product.status === PRODUCT_STATUSES.DRAFT && product.setup?.completed !== true;
}

function isNonDraftProduct(product: ProductSetupState): boolean {
  return product.status !== PRODUCT_STATUSES.DRAFT;
}

export async function productSetupInitValidations(
  req: ProductSetupInitRequestWithEntityDTO,
  res: Response<BaseResponseDTO>,
  next: NextFunction,
) {
  try {
    const normalizedName = normalizeText(req.body.name);
    const normalizedManufacturer = normalizeText(req.body.manufacturer);
    const normalizedCategoryId = normalizeText(req.body.categoryId);
    const normalizedDescription = typeof req.body.description === "string" ? normalizeText(req.body.description) : undefined;
    const normalizedImageUrl = typeof req.body.imageUrl === "string" ? normalizeText(req.body.imageUrl) : undefined;

    if (!normalizedName || !normalizedManufacturer || !normalizedCategoryId || !Types.ObjectId.isValid(normalizedCategoryId)) {
      return res.status(400).json({ IsSuccess: false, ErrorMessage: "Incorrect request body" });
    }

    const categoryValidation = await CategoriesService.validateCategoryExists(normalizedCategoryId);
    if (categoryValidation.isValid === false) {
      return res.status(400).json({ IsSuccess: false, ErrorMessage: categoryValidation.error });
    }

    const allowedManufacturers = await getAllowedManufacturers();
    const allowedManufacturerKeys = new Set(allowedManufacturers.map((value) => normalizeKey(value)));
    if (!allowedManufacturerKeys.has(normalizeKey(normalizedManufacturer))) {
      return res.status(400).json({ IsSuccess: false, ErrorMessage: "No such manufacturer is defined" });
    }

    req.body = {
      name: normalizedName,
      manufacturer: normalizedManufacturer,
      categoryId: normalizedCategoryId,
      description: normalizedDescription,
      imageUrl: normalizedImageUrl,
    };

    next();
  } catch (e: any) {
    return res.status(500).json({ IsSuccess: false, ErrorMessage: e.message });
  }
}

export async function productCreateOrReplaceValidations(
  req: CreateProductRequestDTO | ReplaceProductRequestDTO,
  res: Response<BaseResponseDTO>,
  next: NextFunction,
) {
  try {
    const existingProduct = (req as ReplaceProductRequestDTO).product as unknown as MutableProduct | undefined;
    if (existingProduct && isNonDraftProduct(existingProduct as ProductSetupState)) {
      return res.status(409).json({
        IsSuccess: false,
        ErrorMessage: "Only draft products can update attributes and variants structure",
      });
    }

    const requestBody = req.body as ReplaceProductRequestDTO["body"];

    let normalizedVariants: MutableVariant[] = [];

    if (existingProduct) {
      const normalizedReplaceResult = normalizeVariantsForReplace({
        currentVariants: existingProduct.variants,
        variantsPayload: requestBody.variants,
        res,
      });
      if ("errorResponse" in normalizedReplaceResult) {
        return normalizedReplaceResult.errorResponse;
      }

      const removedCheckResponse = await ensureRemovedVariantsAreNotAssigned({
        productId: req.params.productId,
        currentVariants: existingProduct.variants,
        nextVariants: normalizedReplaceResult.normalizedVariants,
        res,
      });
      if (removedCheckResponse) {
        return removedCheckResponse;
      }

      normalizedVariants = normalizedReplaceResult.normalizedVariants;
    } else {
      normalizedVariants = requestBody.variants.map((variant) => normalizeVariantPayload(variant, PRODUCT_STATUSES.DRAFT));
    }

    const normalizedPayload = normalizeProductPayload({
      ...requestBody,
      status: existingProduct?.status ?? PRODUCT_STATUSES.DRAFT,
      variants: normalizedVariants,
    } as MutableProduct);

    const validationResponse = await validateNextProductPayload(normalizedPayload, res, {
      validateCategoryExists: true,
    });
    if (validationResponse) {
      return validationResponse;
    }

    req.body = {
      ...req.body,
      name: normalizedPayload.name,
      manufacturer: normalizedPayload.manufacturer,
      categoryId: normalizedPayload.categoryId as string,
      description: normalizedPayload.description,
      imageUrl: normalizedPayload.imageUrl,
      attributes: normalizedPayload.attributes,
      variants: normalizedPayload.variants,
    } as typeof req.body;
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
    const normalizedPatch = {
      ...req.body,
      name: typeof req.body.name === "string" ? normalizeText(req.body.name) : req.body.name,
      manufacturer:
        typeof req.body.manufacturer === "string" ? normalizeText(req.body.manufacturer) : req.body.manufacturer,
      categoryId:
        typeof req.body.categoryId === "string" ? normalizeText(req.body.categoryId) : req.body.categoryId,
      description:
        typeof req.body.description === "string" ? normalizeText(req.body.description) : req.body.description,
      imageUrl: typeof req.body.imageUrl === "string" ? normalizeText(req.body.imageUrl) : req.body.imageUrl,
    };

    const draftSetupProduct = isDraftSetupProduct(product as ProductSetupState);

    if (draftSetupProduct) {
      if (typeof normalizedPatch.name === "string" && !normalizedPatch.name) {
        return res.status(400).json({ IsSuccess: false, ErrorMessage: "Incorrect request body" });
      }

      if (typeof normalizedPatch.categoryId === "string") {
        if (!normalizedPatch.categoryId || !Types.ObjectId.isValid(normalizedPatch.categoryId)) {
          return res.status(400).json({ IsSuccess: false, ErrorMessage: "Incorrect request body" });
        }

        const categoryValidation = await CategoriesService.validateCategoryExists(normalizedPatch.categoryId);
        if (categoryValidation.isValid === false) {
          return res.status(400).json({ IsSuccess: false, ErrorMessage: categoryValidation.error });
        }
      }

      if (typeof normalizedPatch.manufacturer === "string") {
        if (!normalizedPatch.manufacturer) {
          return res.status(400).json({ IsSuccess: false, ErrorMessage: "Incorrect request body" });
        }

        const allowedManufacturers = await getAllowedManufacturers();
        const allowedManufacturerKeys = new Set(allowedManufacturers.map((value) => normalizeKey(value)));
        if (!allowedManufacturerKeys.has(normalizeKey(normalizedPatch.manufacturer))) {
          return res.status(400).json({ IsSuccess: false, ErrorMessage: "No such manufacturer is defined" });
        }
      }

      req.body = normalizedPatch as typeof req.body;
      return next();
    }

    const nonDraftPatchKeys = Object.keys(req.body ?? {});
    const forbiddenNonDraftPatchKeys = nonDraftPatchKeys.filter(
      (key) => !["categoryId", "description", "imageUrl"].includes(key),
    );
    if (forbiddenNonDraftPatchKeys.length > 0) {
      return res.status(409).json({
        IsSuccess: false,
        ErrorMessage: "For active/archived products only category, description and imageUrl can be changed",
      });
    }

    const nextProduct: MutableProduct = normalizeProductPayload({
      ...product,
      ...normalizedPatch,
      attributes: product.attributes,
      variants: product.variants,
    } as MutableProduct);

    const validationResponse = await validateNextProductPayload(nextProduct, res, {
      validateCategoryExists: typeof normalizedPatch.categoryId === "string",
    });
    if (validationResponse) {
      return validationResponse;
    }

    req.body = normalizedPatch as typeof req.body;
    next();
  } catch (e: any) {
    return res.status(500).json({ IsSuccess: false, ErrorMessage: e.message });
  }
}

export async function productAttributesReorderValidations(
  req: ReorderProductAttributesRequestDTO,
  res: Response<BaseResponseDTO>,
  next: NextFunction,
) {
  try {
    const product = req.product as unknown as MutableProduct | undefined;
    if (!product) {
      return res.status(404).json({ IsSuccess: false, ErrorMessage: `Product with id '${req.params.productId}' wasn't found` });
    }

    if (!isNonDraftProduct(product as ProductSetupState)) {
      return res.status(409).json({
        IsSuccess: false,
        ErrorMessage: "Attributes reorder endpoint is available only for active/archived products",
      });
    }

    const incomingAttributes = normalizeAttributes((req.body?.attributes ?? []) as MutableProduct["attributes"]);
    const currentAttributes = normalizeAttributes(product.attributes ?? []);

    if (!areSameAttributeDefinitions(currentAttributes, incomingAttributes)) {
      return res.status(409).json({
        IsSuccess: false,
        ErrorMessage: "Only attributes order can be changed. Attribute keys, names and values must stay unchanged",
      });
    }

    req.body = {
      attributes: incomingAttributes,
    };
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

    if (
      isNonDraftProduct(product as ProductSetupState) &&
      Object.prototype.hasOwnProperty.call(req.body ?? {}, "attributes")
    ) {
      return res.status(409).json({
        IsSuccess: false,
        ErrorMessage: "For active/archived products variant attributes are read-only",
      });
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

    const validationResponse = await validateNextProductPayload(normalizedProduct, res, {
      validateCategoryExists: false,
    });
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
    if (isNonDraftProduct(product as ProductSetupState)) {
      return res.status(409).json({
        IsSuccess: false,
        ErrorMessage: "Only draft products can update attributes and variants structure",
      });
    }

    if (!Array.isArray(req.body) || req.body.length < 1 || req.body.length > MAX_VARIANTS_PER_REQUEST) {
      return res.status(400).json({ IsSuccess: false, ErrorMessage: "Incorrect request body" });
    }

    const normalizedVariants = req.body.map((variant) => normalizeVariantPayload(variant, PRODUCT_STATUSES.DRAFT));

    const normalizedProduct: MutableProduct = normalizeProductPayload({
      ...product,
      variants: [...product.variants, ...normalizedVariants],
    });

    const validationResponse = await validateNextProductPayload(normalizedProduct, res, {
      validateCategoryExists: false,
    });
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
    if (isNonDraftProduct(product as ProductSetupState)) {
      return res.status(409).json({
        IsSuccess: false,
        ErrorMessage: "Only draft products can update attributes and variants structure",
      });
    }

    if (!Array.isArray(req.body?.variants) || req.body.variants.length < 1 || req.body.variants.length > MAX_VARIANTS_PER_REQUEST) {
      return res.status(400).json({ IsSuccess: false, ErrorMessage: "Incorrect request body" });
    }

    const normalizedReplaceResult = normalizeVariantsForReplace({
      currentVariants: product.variants,
      variantsPayload: req.body.variants,
      res,
    });
    if ("errorResponse" in normalizedReplaceResult) {
      return normalizedReplaceResult.errorResponse;
    }
    const normalizedVariants = normalizedReplaceResult.normalizedVariants;

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
      attributes: req.body.attributes ? normalizeAttributes(req.body.attributes as MutableProduct["attributes"]) : product.attributes,
      variants: normalizedVariants,
    });
    const validationResponse = await validateNextProductPayload(normalizedProduct, res, {
      validateCategoryExists: false,
    });
    if (validationResponse) {
      return validationResponse;
    }

    req.body = {
      attributes: req.body.attributes ? normalizedProduct.attributes : undefined,
      variants: normalizedVariants,
    } as typeof req.body;
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
    if (isNonDraftProduct(product as ProductSetupState)) {
      return res.status(409).json({
        IsSuccess: false,
        ErrorMessage: "Only draft products can update attributes and variants structure",
      });
    }

    if (!Array.isArray(req.body?.variants) || req.body.variants.length < 1 || req.body.variants.length > MAX_VARIANTS_PER_REQUEST) {
      return res.status(400).json({ IsSuccess: false, ErrorMessage: "Incorrect request body" });
    }

    const normalizedReplaceResult = normalizeVariantsForReplace({
      currentVariants: product.variants,
      variantsPayload: req.body.variants,
      res,
    });
    if ("errorResponse" in normalizedReplaceResult) {
      return normalizedReplaceResult.errorResponse;
    }
    const normalizedVariants = normalizedReplaceResult.normalizedVariants;

    const normalizedProduct: MutableProduct = normalizeProductPayload({
      ...product,
      attributes: req.body.attributes ? normalizeAttributes(req.body.attributes as MutableProduct["attributes"]) : product.attributes,
      variants: normalizedVariants,
    });
    const validationResponse = await validateNextProductPayload(normalizedProduct, res, {
      validateCategoryExists: false,
    });
    if (validationResponse) {
      return validationResponse;
    }

    req.body = {
      attributes: req.body.attributes ? normalizedProduct.attributes : undefined,
      variants: normalizedVariants,
    } as typeof req.body;
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
    const product = req.product as unknown as (MutableProduct & { setup?: { completed?: boolean } }) | undefined;
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

    if (
      product.status === PRODUCT_STATUSES.DRAFT &&
      nextStatus === PRODUCT_STATUSES.ACTIVE &&
      !product.setup?.completed
    ) {
      return res.status(409).json({
        IsSuccess: false,
        ErrorMessage: "Use complete setup endpoint to activate draft product",
      });
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

export async function productSetupWritable(
  req: ReplaceProductSetupSpecRequestDTO | CompleteProductSetupRequestDTO,
  res: Response<BaseResponseDTO>,
  next: NextFunction,
) {
  try {
    const product = req.product as unknown as MutableProduct & { setup?: { completed?: boolean } } | undefined;
    if (!product) {
      return res.status(404).json({ IsSuccess: false, ErrorMessage: `Product with id '${req.params.productId}' wasn't found` });
    }

    if (product.setup?.completed) {
      return res.status(409).json({ IsSuccess: false, ErrorMessage: "Product setup has already been completed" });
    }

    if (product.status !== PRODUCT_STATUSES.DRAFT) {
      return res.status(409).json({ IsSuccess: false, ErrorMessage: "Only draft products can be changed in setup flow" });
    }

    next();
  } catch (e: any) {
    return res.status(500).json({ IsSuccess: false, ErrorMessage: e.message });
  }
}

export async function deleteProduct(req: DeleteProductRequestDTO, res: Response<BaseResponseDTO>, next: NextFunction) {
  try {
    const productId = new Types.ObjectId(req.params.productId);
    const isAssignedToOrder = await Order.exists({ "products.productId": productId });
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
    if (isNonDraftProduct(product as ProductSetupState)) {
      return res.status(409).json({
        IsSuccess: false,
        ErrorMessage: "Only draft products can update attributes and variants structure",
      });
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
      products: { $elemMatch: { productId: productIdObject, variantId: variantIdObject } },
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
