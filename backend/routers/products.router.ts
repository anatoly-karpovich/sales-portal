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
 *     ProductAttribute:
 *       type: object
 *       required: [key, name, values]
 *       properties:
 *         key: { type: string }
 *         name: { type: string }
 *         values:
 *           type: array
 *           items: { type: string }
 *     ProductVariant:
 *       type: object
 *       required: [price, status, attributes]
 *       properties:
 *         _id: { type: string }
 *         price: { type: number }
 *         status:
 *           type: string
 *           enum: [Draft, Active, Archived]
 *         attributes:
 *           type: object
 *           additionalProperties: { type: string }
 *         imageUrl: { type: string }
 *     ProductPriceRange:
 *       type: object
 *       required: [min, max]
 *       properties:
 *         min: { type: number }
 *         max: { type: number }
 *     ProductListItem:
 *       type: object
 *       required: [_id, name, manufacturer, category, status, variantsCount, priceRange]
 *       properties:
 *         _id: { type: string }
 *         name: { type: string }
 *         manufacturer: { type: string }
 *         category: { type: string }
 *         status: { type: string, enum: [Draft, Active, Archived] }
 *         variantsCount: { type: integer }
 *         priceRange:
 *           $ref: '#/components/schemas/ProductPriceRange'
 *     ProductDetails:
 *       type: object
 *       required: [_id, name, manufacturer, category, status, attributes, variants, priceRange, createdOn, updatedOn]
 *       properties:
 *         _id: { type: string }
 *         name: { type: string }
 *         manufacturer: { type: string }
 *         category: { type: string }
 *         description: { type: string }
 *         imageUrl: { type: string }
 *         status: { type: string, enum: [Draft, Active, Archived] }
 *         attributes:
 *           type: array
 *           items: { $ref: '#/components/schemas/ProductAttribute' }
 *         variants:
 *           type: array
 *           items: { $ref: '#/components/schemas/ProductVariant' }
 *         priceRange:
 *           $ref: '#/components/schemas/ProductPriceRange'
 *         createdOn: { type: string }
 *         updatedOn: { type: string }
 *     ProductCreatePayload:
 *       type: object
 *       required: [name, manufacturer, category, attributes, variants]
 *       properties:
 *         name: { type: string, minLength: 1 }
 *         manufacturer: { type: string, minLength: 1 }
 *         category: { type: string, minLength: 1 }
 *         description: { type: string }
 *         imageUrl: { type: string }
 *         attributes:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/ProductAttribute'
 *         variants:
 *           type: array
 *           minItems: 1
 *           items:
 *             $ref: '#/components/schemas/ProductVariantCreatePayload'
 *     ProductReplacePayload:
 *       type: object
 *       required: [name, manufacturer, category, attributes, variants]
 *       properties:
 *         name: { type: string, minLength: 1 }
 *         manufacturer: { type: string, minLength: 1 }
 *         category: { type: string, minLength: 1 }
 *         description: { type: string }
 *         imageUrl: { type: string }
 *         attributes:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/ProductAttribute'
 *         variants:
 *           type: array
 *           minItems: 1
 *           items:
 *             $ref: '#/components/schemas/ProductVariantReplacePayload'
 *     ProductPatchPayload:
 *       type: object
 *       minProperties: 1
 *       properties:
 *         name: { type: string, minLength: 1 }
 *         manufacturer: { type: string, minLength: 1 }
 *         category: { type: string, minLength: 1 }
 *         description: { type: string }
 *         imageUrl: { type: string }
 *     ProductVariantCreatePayload:
 *       type: object
 *       required: [price, attributes]
 *       properties:
 *         price: { type: number }
 *         attributes:
 *           type: object
 *           additionalProperties: { type: string }
 *         imageUrl: { type: string }
 *     ProductVariantReplacePayload:
 *       allOf:
 *         - $ref: '#/components/schemas/ProductVariantCreatePayload'
 *         - type: object
 *           properties:
 *             _id: { type: string }
 *     ProductVariantPatchPayload:
 *       type: object
 *       minProperties: 1
 *       additionalProperties: false
 *       properties:
 *         price: { type: number }
 *         attributes:
 *           type: object
 *           additionalProperties: { type: string }
 *         imageUrl: { type: string }
 *     ProductVariantsReplacePayload:
 *       type: object
 *       required: [variants]
 *       properties:
 *         attributes:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/ProductAttribute'
 *         variants:
 *           type: array
 *           minItems: 1
 *           maxItems: 200
 *           items:
 *             $ref: '#/components/schemas/ProductVariantReplacePayload'
 *     ProductStatusPatchPayload:
 *       type: object
 *       required: [status]
 *       properties:
 *         status:
 *           type: string
 *           enum: [Draft, Active, Archived]
 *     ProductResponse:
 *       type: object
 *       required: [Product, IsSuccess, ErrorMessage]
 *       properties:
 *         Product:
 *           $ref: '#/components/schemas/ProductDetails'
 *         IsSuccess: { type: boolean, example: true }
 *         ErrorMessage:
 *           oneOf:
 *             - type: string
 *             - type: "null"
 *     ProductsResponse:
 *       type: object
 *       required: [Products, IsSuccess, ErrorMessage]
 *       properties:
 *         Products:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/ProductDetails'
 *         IsSuccess: { type: boolean, example: true }
 *         ErrorMessage:
 *           oneOf:
 *             - type: string
 *             - type: "null"
 *     ProductsSortedResponse:
 *       type: object
 *       required: [Products, total, page, limit, search, manufacturer, status, sorting, IsSuccess, ErrorMessage]
 *       properties:
 *         Products:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/ProductListItem'
 *         total: { type: integer }
 *         page: { type: integer }
 *         limit: { type: integer }
 *         search: { type: string }
 *         manufacturer:
 *           type: array
 *           items: { type: string }
 *         status:
 *           type: array
 *           items:
 *             type: string
 *             enum: [Draft, Active, Archived]
 *         sorting:
 *           type: object
 *           required: [sortField, sortOrder]
 *           properties:
 *             sortField:
 *               type: string
 *               enum: [name, price, manufacturer, category, status, createdOn]
 *             sortOrder:
 *               type: string
 *               enum: [asc, desc]
 *         IsSuccess: { type: boolean, example: true }
 *         ErrorMessage:
 *           oneOf:
 *             - type: string
 *             - type: "null"
 *     ProductExportPayload:
 *       type: object
 *       required: [format, fields]
 *       properties:
 *         format:
 *           type: string
 *           enum: [csv, json]
 *         filters:
 *           type: object
 *           nullable: true
 *           properties:
 *             search: { type: string }
 *             manufacturer:
 *               type: array
 *               items: { type: string }
 *             status:
 *               type: array
 *               items:
 *                 type: string
 *                 enum: [Draft, Active, Archived]
 *             page: { type: integer }
 *             limit: { type: integer }
 *             sortField:
 *               type: string
 *               enum: [name, price, manufacturer, category, status, createdOn]
 *             sortOrder:
 *               type: string
 *               enum: [asc, desc]
 *         fields:
 *           type: array
 *           items:
 *             type: string
 *             enum: [_id, name, manufacturer, category, status, variantsCount, priceRange, attributes, variants, createdOn, updatedOn]
 *     ProductApiErrorResponse:
 *       type: object
 *       required: [IsSuccess, ErrorMessage]
 *       properties:
 *         IsSuccess:
 *           type: boolean
 *           example: false
 *         ErrorMessage:
 *           type: string
 *
 * /api/products:
 *   get:
 *     summary: Get products list
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for name/manufacturer/category
 *       - in: query
 *         name: manufacturer
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *         style: form
 *         explode: true
 *         description: Manufacturer filters (repeat query param)
 *       - in: query
 *         name: status
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *             enum: [Draft, Active, Archived]
 *         style: form
 *         explode: true
 *         description: Status filters (repeat query param)
 *       - in: query
 *         name: sortField
 *         schema:
 *           type: string
 *           enum: [name, price, manufacturer, category, status, createdOn]
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
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Paginated product list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProductsSortedResponse'
 *       401:
 *         description: Unauthorized, missing or invalid token
 *       500:
 *         description: Server error
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
 *             $ref: '#/components/schemas/ProductReplacePayload'
 *     responses:
 *       201:
 *         description: Product created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProductResponse'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProductApiErrorResponse'
 *       401:
 *         description: Unauthorized, missing or invalid token
 *       409:
 *         description: Conflict, e.g. duplicate name/attribute combinations
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProductApiErrorResponse'
 *       500:
 *         description: Server error
 * /api/products/all:
 *   get:
 *     summary: Get full product details for all products
 *     tags: [Products]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Full product list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProductsResponse'
 *       401:
 *         description: Unauthorized, missing or invalid token
 *       500:
 *         description: Server error
 * /api/products/{productId}:
 *   get:
 *     summary: Get product details by id
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Product details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProductResponse'
 *       401:
 *         description: Unauthorized, missing or invalid token
 *       404:
 *         description: Product not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProductApiErrorResponse'
 *       500:
 *         description: Server error
 *   put:
 *     summary: Replace product by id
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProductCreatePayload'
 *     responses:
 *       200:
 *         description: Product replaced
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProductResponse'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProductApiErrorResponse'
 *       401:
 *         description: Unauthorized, missing or invalid token
 *       404:
 *         description: Product not found
 *       409:
 *         description: Conflict, e.g. duplicate name/attribute combinations
 *       500:
 *         description: Server error
 *   patch:
 *     summary: Patch product parent fields
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProductPatchPayload'
 *     responses:
 *       200:
 *         description: Product patched
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProductResponse'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized, missing or invalid token
 *       404:
 *         description: Product not found
 *       409:
 *         description: Conflict, e.g. duplicate name/attribute combinations
 *       500:
 *         description: Server error
 *   delete:
 *     summary: Delete product by id
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       204:
 *         description: Product deleted
 *       401:
 *         description: Unauthorized, missing or invalid token
 *       404:
 *         description: Product not found
 *       409:
 *         description: Product is assigned to order
 *       500:
 *         description: Server error
 * /api/products/{productId}/status:
 *   patch:
 *     summary: Patch product status
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProductStatusPatchPayload'
 *     responses:
 *       200:
 *         description: Product status updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProductResponse'
 *       400:
 *         description: Validation error or invalid status transition
 *       401:
 *         description: Unauthorized, missing or invalid token
 *       404:
 *         description: Product not found
 *       500:
 *         description: Server error
 * /api/products/{productId}/variants:
 *   put:
 *     summary: Replace product variants and optional attributes
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProductVariantsReplacePayload'
 *     responses:
 *       200:
 *         description: Product variants replaced
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProductResponse'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized, missing or invalid token
 *       404:
 *         description: Product or variant not found
 *       409:
 *         description: Conflict, e.g. duplicate combinations or deleted variant assigned to order
 *       500:
 *         description: Server error
 *   post:
 *     summary: Add product variants in bulk
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             minItems: 1
 *             maxItems: 200
 *             items:
 *               $ref: '#/components/schemas/ProductVariantCreatePayload'
 *     responses:
 *       201:
 *         description: Product variants added
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProductResponse'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized, missing or invalid token
 *       404:
 *         description: Product not found
 *       409:
 *         description: Conflict, e.g. duplicate combinations
 *       500:
 *         description: Server error
 * /api/products/{productId}/variants/validate:
 *   post:
 *     summary: Validate product variants payload without saving
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProductVariantsReplacePayload'
 *     responses:
 *       200:
 *         description: Payload is valid, returns preview Product
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProductResponse'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized, missing or invalid token
 *       404:
 *         description: Product or variant not found
 *       409:
 *         description: Conflict, e.g. duplicate combinations
 *       500:
 *         description: Server error
 * /api/products/{productId}/variants/{variantId}:
 *   patch:
 *     summary: Patch one product variant
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: variantId
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProductVariantPatchPayload'
 *     responses:
 *       200:
 *         description: Variant patched
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProductResponse'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized, missing or invalid token
 *       404:
 *         description: Product or variant not found
 *       409:
 *         description: Conflict, e.g. duplicate combinations
 *       500:
 *         description: Server error
 *   delete:
 *     summary: Delete one product variant
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: variantId
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       204:
 *         description: Variant deleted
 *       401:
 *         description: Unauthorized, missing or invalid token
 *       404:
 *         description: Product or variant not found
 *       409:
 *         description: Variant is assigned to order
 *       500:
 *         description: Server error
 * /api/products/{productId}/variants/{variantId}/status:
 *   patch:
 *     summary: Patch one product variant status
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: variantId
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProductStatusPatchPayload'
 *     responses:
 *       200:
 *         description: Variant status updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProductResponse'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized, missing or invalid token
 *       404:
 *         description: Product or variant not found
 *       500:
 *         description: Server error
 * /api/products/export:
 *   post:
 *     summary: Export products
 *     tags: [Products]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProductExportPayload'
 *     responses:
 *       200:
 *         description: Export file
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *               format: binary
 *           application/json:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProductApiErrorResponse'
 *       401:
 *         description: Unauthorized, missing or invalid token
 *       500:
 *         description: Server error
 *
 */

export default productsRouter;
