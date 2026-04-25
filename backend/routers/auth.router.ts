import Router from "express";
import AuthController from "../controllers/auth.controller.js";
import { authmiddleware } from "../middleware/authmiddleware.js";
// import { roleMiddleware } from "../middleware/rolemiddleware.js";

const authRouter = Router();

authRouter.post("/login", AuthController.login.bind(AuthController));
authRouter.post("/logout", authmiddleware, AuthController.logout.bind(AuthController));
// authRouter.get('/managers', authmiddleware, AuthController.getManagers) FOR CHECHING AUTHORIZATION
// authRouter.get('/managers', roleMiddleware(ROLES.ADMIN), AuthController.getManagers)

/**
 * @swagger
 * components:
 *   schemas:
 *     AuthLoginRequest:
 *       type: object
 *       required:
 *         - username
 *         - password
 *       properties:
 *         username:
 *           type: string
 *           description: The manager username
 *         password:
 *           type: string
 *           description: The manager password
 *       example:
 *         username: "user123@example.com"
 *         password: "Password123"
 *     AuthManager:
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
 *     AuthLoginResponse:
 *       type: object
 *       required: [IsSuccess, ErrorMessage, Manager]
 *       properties:
 *         IsSuccess:
 *           type: boolean
 *         ErrorMessage:
 *           type: string
 *           nullable: true
 *         Manager:
 *           $ref: '#/components/schemas/AuthManager'
 *     AuthLogoutResponse:
 *       type: object
 *       required: [IsSuccess, ErrorMessage]
 *       properties:
 *         IsSuccess:
 *           type: boolean
 *         ErrorMessage:
 *           type: string
 *           nullable: true
 *     AuthErrorResponse:
 *       type: object
 *       required: [IsSuccess, ErrorMessage]
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
 * /api/login:
 *   post:
 *     summary: Manager login
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AuthLoginRequest'
 *     responses:
 *       200:
 *         description: Successfully logged in
 *         headers:
 *           Authorization:
 *             description: JWT access token
 *             schema:
 *               type: string
 *           X-Manager-Name:
 *             description: Manager first name
 *             schema:
 *               type: string
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthLoginResponse'
 *       400:
 *         description: Incorrect credentials or login error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthErrorResponse'
 * /api/logout:
 *   post:
 *     summary: Manager logout
 *     tags: [Auth]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *     responses:
 *       200:
 *         description: Successfully logged out, active session is removed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthLogoutResponse'
 *       401:
 *         description: Unauthorized - No valid token provided
 *       400:
 *         description: Logout error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthErrorResponse'
 */

export default authRouter;

