import { Router } from "express";
import UsersController from "../controllers/users.controller";
import { authmiddleware } from "../middleware/authmiddleware";
import { check } from "express-validator";
import { schemaMiddleware } from "../middleware/schemaMiddleware";
import { deleteUserMiddleware } from "../middleware/usersMiddleware";
import { changePasswordMiddleware } from "../middleware/changePasswordMiddleware";

const usersRouter = Router();

usersRouter.get("/users", authmiddleware, UsersController.getUsers.bind(UsersController));
usersRouter.get("/users/me", authmiddleware, UsersController.getMe.bind(UsersController));
usersRouter.get("/users/:userId", authmiddleware, UsersController.getUser.bind(UsersController));

usersRouter.post(
  "/users",
  authmiddleware,
  [
    check("username", "Username is required").notEmpty(),
    check("password", `Password can't be less then 8 characters`).isLength({ min: 8 }),
  ],
  schemaMiddleware("userSchema"),
  UsersController.registration.bind(UsersController)
);
usersRouter.delete("/users/:userId", authmiddleware, deleteUserMiddleware, UsersController.deleteUser.bind(UsersController));
usersRouter.patch(
  "/users/password/:userId",
  authmiddleware,
  changePasswordMiddleware,
  UsersController.changePassword.bind(UsersController),
);

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
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
 *     UserCreatePayload:
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
 *     UserResponse:
 *       type: object
 *       properties:
 *         User:
 *           $ref: '#/components/schemas/User'
 *         IsSuccess:
 *           type: boolean
 *         ErrorMessage:
 *           type: string
 *           nullable: true
 *     UsersResponse:
 *       type: object
 *       properties:
 *         Users:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/User'
 *         IsSuccess:
 *           type: boolean
 *         ErrorMessage:
 *           type: string
 *           nullable: true
 *     UserWithOrdersResponse:
 *       type: object
 *       properties:
 *         User:
 *           $ref: '#/components/schemas/User'
 *         Orders:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/OrderListItem'
 *         IsSuccess:
 *           type: boolean
 *         ErrorMessage:
 *           type: string
 *           nullable: true
 *     UserErrorResponse:
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
 *   - name: Users
 *     description: Users management service
 *
 * /api/users:
 *   get:
 *     summary: Get all users
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of users
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UsersResponse'
 *       401:
 *         description: Unauthorized, missing or invalid token
 *       400:
 *         description: Failed to get users
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserErrorResponse'
 *
 *   post:
 *     summary: Register a new user
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserCreatePayload'
 *     responses:
 *       201:
 *         description: User successfully created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserResponse'
 *       400:
 *         description: Validation or registration error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserErrorResponse'
 *       401:
 *         description: Unauthorized, missing or invalid token
 *
 * /api/users/me:
 *   get:
 *     summary: Get current authenticated user profile
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Current user profile
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserResponse'
 *       401:
 *         description: Unauthorized, missing or invalid token
 *       404:
 *         description: User was not found
 *       400:
 *         description: Failed to get user
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserErrorResponse'
 *
 * /api/users/{userId}:
 *   get:
 *     summary: Get user by id with assigned orders
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User id
 *     responses:
 *       200:
 *         description: User and assigned orders
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserWithOrdersResponse'
 *       401:
 *         description: Unauthorized, missing or invalid token
 *       400:
 *         description: Failed to get user
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserErrorResponse'
 *
 *   delete:
 *     summary: Delete user by id
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User id
 *     responses:
 *       204:
 *         description: User successfully deleted
 *       401:
 *         description: Unauthorized, missing or invalid token
 *       403:
 *         description: Forbidden, not allowed to delete this user
 *       400:
 *         description: Failed to delete user
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserErrorResponse'
 *       500:
 *         description: Server error
 *
 * /api/users/password/{userId}:
 *   patch:
 *     summary: Change user password
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User id
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
 *               $ref: '#/components/schemas/UserResponse'
 *       401:
 *         description: Unauthorized, missing or invalid token
 *       403:
 *         description: Forbidden, not allowed to change password
 *       400:
 *         description: Password validation or update error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserErrorResponse'
 *       500:
 *         description: Server error
 */

export default usersRouter;
