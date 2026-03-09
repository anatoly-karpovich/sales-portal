import Router from "express";
import AuthController from "../controllers/auth.controller.js";
import { authmiddleware } from "../middleware/authmiddleware.js";
// import { roleMiddleware } from "../middleware/rolemiddleware.js";

const authRouter = Router();

authRouter.post("/login", AuthController.login.bind(AuthController));
authRouter.post("/logout", authmiddleware, AuthController.logout.bind(AuthController));
// authRouter.get('/users', authmiddleware, AuthController.getUsers) FOR CHECHING AUTHORIZATION
// authRouter.get('/users', roleMiddleware(ROLES.ADMIN), AuthController.getUsers)

/**
 * @swagger
 * components:
 *   schemas:
 *     AuthLogin:
 *       type: object
 *       required:
 *         - username
 *         - password
 *       properties:
 *         username:
 *           type: string
 *           description: The user's username
 *         password:
 *           type: string
 *           description: The user's password
 *       example:
 *         username: "user123@example.com"
 *         password: "Password123"
 *
 * /api/login:
 *   post:
 *     summary: User login
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AuthLogin'
 *     responses:
 *       200:
 *         description: Successfully logged in
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 IsSuccess:
 *                   type: boolean
 *                   description: Operation success flag
 *                 ErrorMessage:
 *                   type: string
 *                   nullable: true
 *       400:
 *         description: Incorrect credentials or login error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 IsSuccess:
 *                   type: boolean
 *                   description: Operation success flag
 *                 ErrorMessage:
 *                   type: string
 *                   description: Error message in case of failure
 * /api/logout:
 *   post:
 *     summary: User logout
 *     tags: [Auth]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: header
 *         name: Authorization
 *         required: true
 *         schema:
 *           type: string
 *           example: Bearer <JWT token>
 *         description: Bearer token for authentication
 *     responses:
 *       200:
 *         description: Successfully logged out, active session is removed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 IsSuccess:
 *                   type: boolean
 *                   description: Operation success flag
 *                 ErrorMessage:
 *                   type: string
 *                   nullable: true
 *       401:
 *         description: Unauthorized - No valid token provided
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 IsSuccess:
 *                   type: boolean
 *                   description: Operation success flag
 *                 ErrorMessage:
 *                   type: string
 *                   description: Error message in case of failure
 *       500:
 *         description: Server error during logout
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 IsSuccess:
 *                   type: boolean
 *                   description: Operation success flag
 *                 ErrorMessage:
 *                   type: string
 *                   description: Error message in case of failure
 */

export default authRouter;
