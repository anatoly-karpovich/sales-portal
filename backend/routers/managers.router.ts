import { Router } from "express";
import ManagersController from "../controllers/managers.controller";
import { authmiddleware } from "../middleware/authmiddleware";
import { check } from "express-validator";
import { schemaMiddleware } from "../middleware/schemaMiddleware";
import { deleteManagerMiddleware } from "../middleware/managersMiddleware";
import { changePasswordMiddleware } from "../middleware/changePasswordMiddleware";

const managersRouter = Router();

managersRouter.get("/managers", authmiddleware, ManagersController.getManagers.bind(ManagersController));
managersRouter.get("/managers/me", authmiddleware, ManagersController.getMe.bind(ManagersController));
managersRouter.get("/managers/:managerId", authmiddleware, ManagersController.getManager.bind(ManagersController));

managersRouter.post(
  "/managers",
  authmiddleware,
  [
    check("username", "Username is required").notEmpty(),
    check("password", `Password can't be less then 8 characters`).isLength({ min: 8 }),
  ],
  schemaMiddleware("managerSchema"),
  ManagersController.registration.bind(ManagersController),
);
managersRouter.delete(
  "/managers/:managerId",
  authmiddleware,
  deleteManagerMiddleware,
  ManagersController.deleteManager.bind(ManagersController),
);
managersRouter.patch(
  "/managers/password/:managerId",
  authmiddleware,
  changePasswordMiddleware,
  ManagersController.changePassword.bind(ManagersController),
);

/**
 * @swagger
 * components:
 *   schemas:
 *     Manager:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         username:
 *           type: string
 *         firstName:
 *           type: string
 *         lastName:
 *           type: string
 *         roles:
 *           type: array
 *           items:
 *             type: string
 *         createdOn:
 *           type: string
 *           format: date-time
 *     ManagerCreatePayload:
 *       type: object
 *       required: [username, password, firstName, lastName]
 *       properties:
 *         username:
 *           type: string
 *         password:
 *           type: string
 *         firstName:
 *           type: string
 *         lastName:
 *           type: string
 *     ChangePasswordPayload:
 *       type: object
 *       required: [oldPassword, newPassword]
 *       properties:
 *         oldPassword:
 *           type: string
 *         newPassword:
 *           type: string
 *     ManagerResponse:
 *       type: object
 *       properties:
 *         Manager:
 *           $ref: '#/components/schemas/Manager'
 *         IsSuccess:
 *           type: boolean
 *         ErrorMessage:
 *           type: string
 *           nullable: true
 *     ManagersResponse:
 *       type: object
 *       properties:
 *         Managers:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Manager'
 *         IsSuccess:
 *           type: boolean
 *         ErrorMessage:
 *           type: string
 *           nullable: true
 *     ManagerWithOrdersResponse:
 *       type: object
 *       properties:
 *         Manager:
 *           $ref: '#/components/schemas/Manager'
 *         Orders:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/OrderListItem'
 *         IsSuccess:
 *           type: boolean
 *         ErrorMessage:
 *           type: string
 *           nullable: true
 *     ManagerErrorResponse:
 *       type: object
 *       properties:
 *         IsSuccess:
 *           type: boolean
 *         ErrorMessage:
 *           type: string
 *         reason:
 *           oneOf:
 *             - type: string
 *             - type: array
 *               items:
 *                 type: string
 *
 * tags:
 *   - name: Managers
 *     description: Managers management service
 *
 * /api/managers:
 *   get:
 *     summary: Get all managers
 *     tags: [Managers]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of managers
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ManagersResponse'
 *       401:
 *         description: Unauthorized, missing or invalid token
 *       400:
 *         description: Failed to get managers
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ManagerErrorResponse'
 *
 *   post:
 *     summary: Register a new manager
 *     tags: [Managers]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ManagerCreatePayload'
 *     responses:
 *       201:
 *         description: Manager successfully created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ManagerResponse'
 *       400:
 *         description: Validation or registration error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ManagerErrorResponse'
 *       401:
 *         description: Unauthorized, missing or invalid token
 *
 * /api/managers/me:
 *   get:
 *     summary: Get current authenticated manager profile
 *     tags: [Managers]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Current manager profile
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ManagerResponse'
 *       401:
 *         description: Unauthorized, missing or invalid token
 *       404:
 *         description: Manager was not found
 *       400:
 *         description: Failed to get manager
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ManagerErrorResponse'
 *
 * /api/managers/{managerId}:
 *   get:
 *     summary: Get manager by id with assigned orders
 *     tags: [Managers]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: managerId
 *         required: true
 *         schema:
 *           type: string
 *         description: Manager id
 *     responses:
 *       200:
 *         description: Manager and assigned orders
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ManagerWithOrdersResponse'
 *       401:
 *         description: Unauthorized, missing or invalid token
 *       400:
 *         description: Failed to get manager
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ManagerErrorResponse'
 *
 *   delete:
 *     summary: Delete manager by id
 *     tags: [Managers]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: managerId
 *         required: true
 *         schema:
 *           type: string
 *         description: Manager id
 *     responses:
 *       204:
 *         description: Manager successfully deleted
 *       401:
 *         description: Unauthorized, missing or invalid token
 *       403:
 *         description: Forbidden, not allowed to delete this manager
 *       400:
 *         description: Failed to delete manager
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ManagerErrorResponse'
 *       500:
 *         description: Server error
 *
 * /api/managers/password/{managerId}:
 *   patch:
 *     summary: Change manager password
 *     tags: [Managers]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: managerId
 *         required: true
 *         schema:
 *           type: string
 *         description: Manager id
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ChangePasswordPayload'
 *     responses:
 *       200:
 *         description: Password changed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ManagerResponse'
 *       401:
 *         description: Unauthorized, missing or invalid token
 *       403:
 *         description: Forbidden, not allowed to change password
 *       400:
 *         description: Password validation or update error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ManagerErrorResponse'
 *       500:
 *         description: Server error
 */

export default managersRouter;
