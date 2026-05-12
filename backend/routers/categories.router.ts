import Router from "express";
import CategoriesController from "../controllers/categories.controller.js";
import { authmiddleware } from "../middleware/authmiddleware.js";
import { schemaMiddleware } from "../middleware/schemaMiddleware.js";

const categoriesRouter = Router();

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
categoriesRouter.patch(
  "/categories/nodes/:categoryId/status",
  authmiddleware,
  schemaMiddleware("categoryStatusPatchSchema"),
  CategoriesController.patchStatus.bind(CategoriesController),
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
 *     CategoryNode:
 *       type: object
 *       required: [_id, name, slug, status, children, createdOn, updatedOn]
 *       properties:
 *         _id: { type: string }
 *         name: { type: string }
 *         slug: { type: string }
 *         description: { type: string }
 *         imageUrl: { type: string }
 *         status: { type: string, enum: [Active, Archived] }
 *         children:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/CategoryNode'
 *         createdOn: { type: string, format: date-time }
 *         updatedOn: { type: string, format: date-time }
 * /api/categories/tree:
 *   get:
 *     summary: Get categories tree
 *     tags: [Categories]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: includeArchived
 *         schema:
 *           type: boolean
 * /api/categories/flat:
 *   get:
 *     summary: Get flat categories list
 *     tags: [Categories]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Active, Archived, All]
 * /api/categories/nodes:
 *   post:
 *     summary: Create category node
 *     tags: [Categories]
 *     security:
 *       - BearerAuth: []
 * /api/categories/nodes/{categoryId}:
 *   get:
 *     summary: Get category node by id
 *     tags: [Categories]
 *     security:
 *       - BearerAuth: []
 *   patch:
 *     summary: Patch category node
 *     tags: [Categories]
 *     security:
 *       - BearerAuth: []
 *   delete:
 *     summary: Delete category node
 *     tags: [Categories]
 *     security:
 *       - BearerAuth: []
 * /api/categories/nodes/{categoryId}/status:
 *   patch:
 *     summary: Patch category status
 *     tags: [Categories]
 *     security:
 *       - BearerAuth: []
 * /api/categories/nodes/{categoryId}/move:
 *   post:
 *     summary: Move category node
 *     tags: [Categories]
 *     security:
 *       - BearerAuth: []
 * /api/categories/nodes/{categoryId}/products:
 *   get:
 *     summary: Get products in category subtree
 *     tags: [Categories]
 *     security:
 *       - BearerAuth: []
 */

export default categoriesRouter;
