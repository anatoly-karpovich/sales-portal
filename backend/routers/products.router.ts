import Router from "express";
import ProductsController from "../controllers/products.controller.js";
import { authmiddleware } from "../middleware/authmiddleware.js";
import {
  deleteProductVariant,
  deleteProduct,
  productById,
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

productsRouter.get("/products/all", authmiddleware, ProductsController.getAll.bind(ProductsController));

productsRouter.post("/products/export", authmiddleware, ProductsController.export.bind(ProductsController));

productsRouter.get(
  "/products/:productId",
  authmiddleware,
  productById,
  ProductsController.getProduct.bind(ProductsController),
);

productsRouter.post(
  "/products",
  authmiddleware,
  schemaMiddleware("productCreateSchema"),
  uniqueProduct,
  productCreateOrReplaceValidations,
  ProductsController.create.bind(ProductsController),
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
 *       required: [_id, name, manufacturer, categoryId, rootCategoryId, categoryPath, status, createdOn, variantsCount, priceRange]
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
 *     ProductCreatePayload:
 *       type: object
 *       required: [name, manufacturer, categoryId, attributes, variants]
 *       properties:
 *         name: { type: string, minLength: 1 }
 *         manufacturer: { type: string, minLength: 1 }
 *         categoryId: { type: string, minLength: 1 }
 *         description: { type: string }
 *         imageUrl: { type: string }
 *         attributes:
 *           type: array
 *           items:
 *             type: object
 *         variants:
 *           type: array
 *           minItems: 1
 *           items:
 *             type: object
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
 */

export default productsRouter;
