import Router from "express";
import ProductsController from "../controllers/products.controller.js";
import { authmiddleware } from "../middleware/authmiddleware.js";
import {
  deleteProductVariant,
  deleteProduct,
  productById,
  productCreateOrReplaceValidations,
  productVariantCreateValidations,
  productPatchValidations,
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
  schemaMiddleware("productVariantCreateSchema"),
  productById,
  productVariantCreateValidations,
  ProductsController.createVariant.bind(ProductsController),
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
 *       required: [_id, price, status, attributes]
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
 *     ProductDetails:
 *       type: object
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
 * /api/products:
 *   get:
 *     summary: Get products list
 *     tags: [Products]
 *   post:
 *     summary: Create product
 *     tags: [Products]
 * /api/products/all:
 *   get:
 *     summary: Get full product details for all products
 *     tags: [Products]
 * /api/products/{productId}:
 *   get:
 *     summary: Get product details by id
 *     tags: [Products]
 *   put:
 *     summary: Replace product by id
 *     tags: [Products]
 *   patch:
 *     summary: Patch product parent fields
 *     tags: [Products]
 *   delete:
 *     summary: Delete product by id
 *     tags: [Products]
 * /api/products/{productId}/variants/{variantId}:
 *   patch:
 *     summary: Patch one product variant
 *     tags: [Products]
 *   delete:
 *     summary: Delete one product variant
 *     tags: [Products]
 * /api/products/{productId}/variants:
 *   post:
 *     summary: Add one product variant
 *     tags: [Products]
 * /api/products/export:
 *   post:
 *     summary: Export products
 *     tags: [Products]
 *
 * tags:
 *   name: Products
 *   description: Products management service
 */

export default productsRouter;
