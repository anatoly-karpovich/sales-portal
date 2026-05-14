import Router from "express";
import CategoriesController from "../controllers/categories.controller.js";
import { authmiddleware } from "../middleware/authmiddleware.js";
import { schemaMiddleware } from "../middleware/schemaMiddleware.js";

const categoriesRouter = Router();

categoriesRouter.get("/categories", authmiddleware, CategoriesController.getCombined.bind(CategoriesController));
categoriesRouter.get("/categories/tree", authmiddleware, CategoriesController.getTree.bind(CategoriesController));
categoriesRouter.get("/categories/flat", authmiddleware, CategoriesController.getFlat.bind(CategoriesController));
categoriesRouter.get(
  "/categories/nodes/:categoryId",
  authmiddleware,
  CategoriesController.getNode.bind(CategoriesController),
);
categoriesRouter.post(
  "/categories/nodes",
  authmiddleware,
  schemaMiddleware("categoryCreateSchema"),
  CategoriesController.createNode.bind(CategoriesController),
);
categoriesRouter.patch(
  "/categories/nodes/:categoryId",
  authmiddleware,
  schemaMiddleware("categoryPatchSchema"),
  CategoriesController.patchNode.bind(CategoriesController),
);
categoriesRouter.post(
  "/categories/nodes/:categoryId/move",
  authmiddleware,
  schemaMiddleware("categoryMoveSchema"),
  CategoriesController.moveNode.bind(CategoriesController),
);
categoriesRouter.get(
  "/categories/nodes/:categoryId/products",
  authmiddleware,
  CategoriesController.getNodeProducts.bind(CategoriesController),
);
categoriesRouter.delete(
  "/categories/nodes/:categoryId",
  authmiddleware,
  CategoriesController.deleteNode.bind(CategoriesController),
);

/**
 * @swagger
 * tags:
 *   - name: Categories
 *     description: Category tree management
 * components:
 *   schemas:
 *     CategoryPathItem:
 *       type: object
 *       required: [_id, name, slug]
 *       properties:
 *         _id: { type: string }
 *         name: { type: string }
 *         slug: { type: string }
 *     CategoryNode:
 *       type: object
 *       required: [_id, name, slug, children, createdOn, updatedOn]
 *       properties:
 *         _id: { type: string }
 *         name: { type: string }
 *         slug: { type: string }
 *         description: { type: string }
 *         imageUrl: { type: string }
 *         children:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/CategoryNode'
 *           example: []
 *         createdOn: { type: string, format: date-time }
 *         updatedOn: { type: string, format: date-time }
 *     CategoryTreeNode:
 *       type: object
 *       required: [_id, name, slug, children, productsCount, createdOn, updatedOn]
 *       properties:
 *         _id: { type: string }
 *         name: { type: string }
 *         slug: { type: string }
 *         description: { type: string }
 *         imageUrl: { type: string }
 *         children:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/CategoryTreeNode'
 *           example: []
 *         productsCount:
 *           type: integer
 *           minimum: 0
 *         createdOn: { type: string, format: date-time }
 *         updatedOn: { type: string, format: date-time }
 *     CategoryFlatNode:
 *       type: object
 *       required: [_id, name, slug, path, createdOn, updatedOn]
 *       properties:
 *         _id: { type: string }
 *         name: { type: string }
 *         slug: { type: string }
 *         description: { type: string }
 *         imageUrl: { type: string }
 *         parentId: { type: string }
 *         path:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/CategoryPathItem'
 *         createdOn: { type: string, format: date-time }
 *         updatedOn: { type: string, format: date-time }
 *     CategoryCreatePayload:
 *       type: object
 *       required: [name]
 *       properties:
 *         name: { type: string, minLength: 1 }
 *         slug: { type: string, minLength: 1 }
 *         description: { type: string }
 *         imageUrl: { type: string }
 *         parentId: { type: string, minLength: 1 }
 *     CategoryPatchPayload:
 *       type: object
 *       minProperties: 1
 *       properties:
 *         name: { type: string, minLength: 1 }
 *         slug: { type: string, minLength: 1 }
 *         description: { type: string }
 *         imageUrl: { type: string }
 *     CategoryMovePayload:
 *       type: object
 *       required: [targetParentId]
 *       properties:
 *         targetParentId:
 *           nullable: true
 *           oneOf:
 *             - type: string
 *             - type: "null"
 *     CategoryTreeResponse:
 *       type: object
 *       required: [CategoriesTree, IsSuccess, ErrorMessage]
 *       properties:
 *         CategoriesTree:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/CategoryTreeNode'
 *         IsSuccess: { type: boolean, example: true }
 *         ErrorMessage:
 *           oneOf:
 *             - type: string
 *             - type: "null"
 *     CategoryCombinedResponse:
 *       type: object
 *       required: [CategoriesTree, Categories, IsSuccess, ErrorMessage]
 *       properties:
 *         CategoriesTree:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/CategoryTreeNode'
 *         Categories:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/CategoryFlatNode'
 *         IsSuccess: { type: boolean, example: true }
 *         ErrorMessage:
 *           oneOf:
 *             - type: string
 *             - type: "null"
 *     CategoryFlatResponse:
 *       type: object
 *       required: [Categories, IsSuccess, ErrorMessage]
 *       properties:
 *         Categories:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/CategoryFlatNode'
 *         IsSuccess: { type: boolean, example: true }
 *         ErrorMessage:
 *           oneOf:
 *             - type: string
 *             - type: "null"
 *     CategoryNodeResponse:
 *       type: object
 *       required: [Category, IsSuccess, ErrorMessage]
 *       properties:
 *         Category:
 *           $ref: '#/components/schemas/CategoryNode'
 *         IsSuccess: { type: boolean, example: true }
 *         ErrorMessage:
 *           oneOf:
 *             - type: string
 *             - type: "null"
 *       example:
 *         Category:
 *           _id: "68222e58c511980d79eaaf80"
 *           name: "Laptops"
 *           slug: "laptops"
 *           children: []
 *           createdOn: "2026-05-13T10:25:00.000Z"
 *           updatedOn: "2026-05-13T10:25:00.000Z"
 *         IsSuccess: true
 *         ErrorMessage: null
 *     CategoryProductsResponse:
 *       type: object
 *       required: [Products, IsSuccess, ErrorMessage]
 *       properties:
 *         Products:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/ProductListItem'
 *         IsSuccess: { type: boolean, example: true }
 *         ErrorMessage:
 *           oneOf:
 *             - type: string
 *             - type: "null"
 *     CategoryApiErrorResponse:
 *       type: object
 *       required: [IsSuccess, ErrorMessage]
 *       properties:
 *         IsSuccess:
 *           type: boolean
 *           example: false
 *         ErrorMessage:
 *           type: string
 * /api/categories:
 *   get:
 *     summary: Get categories tree and flat list
 *     tags: [Categories]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Combined categories payload
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CategoryCombinedResponse'
 *       401:
 *         description: Unauthorized, missing or invalid token
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CategoryApiErrorResponse'
 * /api/categories/tree:
 *   get:
 *     summary: Get categories tree
 *     tags: [Categories]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Categories tree
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CategoryTreeResponse'
 *       401:
 *         description: Unauthorized, missing or invalid token
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CategoryApiErrorResponse'
 * /api/categories/flat:
 *   get:
 *     summary: Get flat categories list
 *     tags: [Categories]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Flat categories list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CategoryFlatResponse'
 *       401:
 *         description: Unauthorized, missing or invalid token
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CategoryApiErrorResponse'
 * /api/categories/nodes:
 *   post:
 *     summary: Create category node
 *     tags: [Categories]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CategoryCreatePayload'
 *     responses:
 *       201:
 *         description: Category node created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CategoryNodeResponse'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CategoryApiErrorResponse'
 *       401:
 *         description: Unauthorized, missing or invalid token
 *       404:
 *         description: Parent category not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CategoryApiErrorResponse'
 *       409:
 *         description: Slug conflict
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CategoryApiErrorResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CategoryApiErrorResponse'
 * /api/categories/nodes/{categoryId}:
 *   get:
 *     summary: Get category node by id
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: categoryId
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Category node
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CategoryNodeResponse'
 *       401:
 *         description: Unauthorized, missing or invalid token
 *       404:
 *         description: Category not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CategoryApiErrorResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CategoryApiErrorResponse'
 *   patch:
 *     summary: Patch category node
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: categoryId
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
 *             $ref: '#/components/schemas/CategoryPatchPayload'
 *     responses:
 *       200:
 *         description: Category node updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CategoryNodeResponse'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CategoryApiErrorResponse'
 *       401:
 *         description: Unauthorized, missing or invalid token
 *       404:
 *         description: Category not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CategoryApiErrorResponse'
 *       409:
 *         description: Slug conflict
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CategoryApiErrorResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CategoryApiErrorResponse'
 *   delete:
 *     summary: Delete category node
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: categoryId
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       204:
 *         description: Category node deleted
 *       401:
 *         description: Unauthorized, missing or invalid token
 *       404:
 *         description: Category not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CategoryApiErrorResponse'
 *       409:
 *         description: Delete guard conflict (node has children or is used by products)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CategoryApiErrorResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CategoryApiErrorResponse'
 * /api/categories/nodes/{categoryId}/move:
 *   post:
 *     summary: Move category node
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: categoryId
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
 *             $ref: '#/components/schemas/CategoryMovePayload'
 *     responses:
 *       200:
 *         description: Category node moved
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CategoryNodeResponse'
 *       400:
 *         description: Validation error (self move, cyclic move, etc.)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CategoryApiErrorResponse'
 *       401:
 *         description: Unauthorized, missing or invalid token
 *       404:
 *         description: Category or target parent not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CategoryApiErrorResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CategoryApiErrorResponse'
 * /api/categories/nodes/{categoryId}/products:
 *   get:
 *     summary: Get products in category subtree
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: categoryId
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Products in category subtree
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CategoryProductsResponse'
 *       401:
 *         description: Unauthorized, missing or invalid token
 *       404:
 *         description: Category not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CategoryApiErrorResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CategoryApiErrorResponse'
 */

export default categoriesRouter;
