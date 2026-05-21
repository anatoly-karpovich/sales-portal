import Router from "express";
import ProductsController from "../controllers/products.controller.js";
import { authmiddleware } from "../middleware/authmiddleware.js";
import {
  deleteProductVariant,
  deleteProduct,
  productById,
  productSetupInitValidations,
  productSetupWritable,
  productCreateOrReplaceValidations,
  productStatusPatchValidations,
  productVariantsCreateValidations,
  productVariantsReplaceValidations,
  productVariantsValidate,
  productPatchValidations,
  productVariantStatusPatchValidations,
  productVariantPatchValidations,
  uniqueProduct,
} from "../middleware/productMiddleware.js";
import { schemaMiddleware } from "../middleware/schemaMiddleware.js";

const productsRouter = Router();

productsRouter.get("/products", authmiddleware, ProductsController.getAllSorted.bind(ProductsController));
productsRouter.post(
  "/products",
  authmiddleware,
  schemaMiddleware("productSetupInitSchema"),
  uniqueProduct,
  productSetupInitValidations,
  ProductsController.createSetupInit.bind(ProductsController),
);

productsRouter.get("/products/all", authmiddleware, ProductsController.getAll.bind(ProductsController));

productsRouter.post("/products/export", authmiddleware, ProductsController.export.bind(ProductsController));

productsRouter.get(
  "/products/:productId",
  authmiddleware,
  productById,
  ProductsController.getProduct.bind(ProductsController),
);

productsRouter.post(
  "/products/setup/init",
  authmiddleware,
  schemaMiddleware("productSetupInitSchema"),
  uniqueProduct,
  productSetupInitValidations,
  ProductsController.createSetupInit.bind(ProductsController),
);

productsRouter.put(
  "/products/:productId/setup/spec",
  authmiddleware,
  schemaMiddleware("productSetupSpecSchema"),
  productById,
  productSetupWritable,
  productVariantsReplaceValidations,
  ProductsController.replaceSetupSpec.bind(ProductsController),
);

productsRouter.post(
  "/products/:productId/complete-setup",
  authmiddleware,
  productById,
  productSetupWritable,
  ProductsController.completeSetup.bind(ProductsController),
);

productsRouter.put(
  "/products/:productId",
  authmiddleware,
  schemaMiddleware("productReplaceSchema"),
  uniqueProduct,
  productById,
  productCreateOrReplaceValidations,
  ProductsController.replace.bind(ProductsController),
);

productsRouter.patch(
  "/products/:productId",
  authmiddleware,
  schemaMiddleware("productPatchSchema"),
  productById,
  uniqueProduct,
  productPatchValidations,
  ProductsController.patch.bind(ProductsController),
);

productsRouter.patch(
  "/products/:productId/status",
  authmiddleware,
  schemaMiddleware("productStatusPatchSchema"),
  productById,
  productStatusPatchValidations,
  ProductsController.patchStatus.bind(ProductsController),
);

productsRouter.put(
  "/products/:productId/variants",
  authmiddleware,
  schemaMiddleware("productVariantsReplaceSchema"),
  productById,
  productVariantsReplaceValidations,
  ProductsController.replaceVariants.bind(ProductsController),
);

productsRouter.post(
  "/products/:productId/variants/validate",
  authmiddleware,
  schemaMiddleware("productVariantsValidateSchema"),
  productById,
  productVariantsValidate,
  ProductsController.validateVariants.bind(ProductsController),
);

productsRouter.patch(
  "/products/:productId/variants/:variantId/status",
  authmiddleware,
  schemaMiddleware("productVariantStatusPatchSchema"),
  productById,
  productVariantStatusPatchValidations,
  ProductsController.patchVariantStatus.bind(ProductsController),
);

productsRouter.patch(
  "/products/:productId/variants/:variantId",
  authmiddleware,
  schemaMiddleware("productVariantPatchSchema"),
  productById,
  productVariantPatchValidations,
  ProductsController.patchVariant.bind(ProductsController),
);

productsRouter.post(
  "/products/:productId/variants",
  authmiddleware,
  schemaMiddleware("productVariantsCreateSchema"),
  productById,
  productVariantsCreateValidations,
  ProductsController.createVariants.bind(ProductsController),
);

productsRouter.delete(
  "/products/:productId",
  authmiddleware,
  productById,
  deleteProduct,
  ProductsController.delete.bind(ProductsController),
);

productsRouter.delete(
  "/products/:productId/variants/:variantId",
  authmiddleware,
  productById,
  deleteProductVariant,
  ProductsController.deleteVariant.bind(ProductsController),
);

/**
 * @swagger
 * tags:
 *   - name: Products
 *     description: Products management service
 * components:
 *   schemas:
 *     ProductListItem:
 *       type: object
 *       required: [_id, name, manufacturer, categoryId, rootCategoryId, categoryPath, status, createdOn, variantsCount, priceRange, setup]
 *       properties:
 *         _id: { type: string }
 *         name: { type: string }
 *         manufacturer: { type: string }
 *         categoryId: { type: string }
 *         rootCategoryId: { type: string }
 *         categoryPath: { type: string }
 *         status: { type: string, enum: [Draft, Active, Archived] }
 *         createdOn: { type: string, format: date-time }
 *         variantsCount: { type: integer }
 *         priceRange:
 *           type: object
 *           required: [min, max]
 *           properties:
 *             min: { type: number }
 *             max: { type: number }
 *         setup:
 *           type: object
 *           required: [completed]
 *           properties:
 *             completed: { type: boolean }
 *             completedOn: { type: string, format: date-time, nullable: true }
 *             completedBy: { type: string, nullable: true }
 *     ProductCreatePayload:
 *       type: object
 *       required: [name, manufacturer, categoryId]
 *       properties:
 *         name: { type: string, minLength: 1 }
 *         manufacturer: { type: string, minLength: 1 }
 *         categoryId: { type: string, minLength: 1 }
 *         description: { type: string }
 *         imageUrl: { type: string }
 * /api/products:
 *   get:
 *     summary: Get products list
 *     tags: [Products]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: manufacturer
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *         style: form
 *         explode: true
 *       - in: query
 *         name: status
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *             enum: [Draft, Active, Archived]
 *         style: form
 *         explode: true
 *       - in: query
 *         name: categoryId
 *         schema:
 *           type: string
 *       - in: query
 *         name: rootCategoryId
 *         schema:
 *           type: string
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: string
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: string
 *       - in: query
 *         name: sortField
 *         schema:
 *           type: string
 *           enum: [name, price, manufacturer, category, status, createdOn, variantsCount]
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *       - in: query
 *         name: page
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: string
 *   post:
 *     summary: Create draft product (setup init alias)
 *     tags: [Products]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProductCreatePayload'
 * /api/products/setup/init:
 *   post:
 *     summary: Create product
 *     tags: [Products]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProductCreatePayload'
 * /api/products/all:
 *   get:
 *     summary: Get all products (full details)
 *     tags: [Products]
 *     security:
 *       - BearerAuth: []
 * /api/products/export:
 *   post:
 *     summary: Export products
 *     tags: [Products]
 *     security:
 *       - BearerAuth: []
 * /api/products/{productId}:
 *   get:
 *     summary: Get product details
 *     tags: [Products]
 *     security:
 *       - BearerAuth: []
 *   put:
 *     summary: Full replace product
 *     tags: [Products]
 *     security:
 *       - BearerAuth: []
 *   patch:
 *     summary: Partial update product parent fields
 *     tags: [Products]
 *     security:
 *       - BearerAuth: []
 *   delete:
 *     summary: Delete product
 *     tags: [Products]
 *     security:
 *       - BearerAuth: []
 * /api/products/{productId}/status:
 *   patch:
 *     summary: Update product status
 *     tags: [Products]
 *     security:
 *       - BearerAuth: []
 * /api/products/{productId}/variants:
 *   put:
 *     summary: Full replace variants
 *     tags: [Products]
 *     security:
 *       - BearerAuth: []
 *   post:
 *     summary: Bulk add variants
 *     tags: [Products]
 *     security:
 *       - BearerAuth: []
 * /api/products/{productId}/variants/validate:
 *   post:
 *     summary: Validate variants payload without saving
 *     tags: [Products]
 *     security:
 *       - BearerAuth: []
 * /api/products/{productId}/variants/{variantId}:
 *   patch:
 *     summary: Partial update one variant
 *     tags: [Products]
 *     security:
 *       - BearerAuth: []
 *   delete:
 *     summary: Delete one variant
 *     tags: [Products]
 *     security:
 *       - BearerAuth: []
 * /api/products/{productId}/variants/{variantId}/status:
 *   patch:
 *     summary: Update one variant status
 *     tags: [Products]
 *     security:
 *       - BearerAuth: []
 * /api/products/{productId}/setup/spec:
 *   put:
 *     summary: Save setup specification (attributes + variants)
 *     tags: [Products]
 *     security:
 *       - BearerAuth: []
 * /api/products/{productId}/complete-setup:
 *   post:
 *     summary: Complete product setup
 *     tags: [Products]
 *     security:
 *       - BearerAuth: []
 */

export default productsRouter;
