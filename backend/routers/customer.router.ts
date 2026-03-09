import Router from "express";
import CustomerController from "../controllers/customer.controller.js";
import { authmiddleware } from "../middleware/authmiddleware.js";
import { customerValidations, customerById, deleteCustomer, uniqueCustomer } from "../middleware/customerMiddleware.js";
import { schemaMiddleware } from "../middleware/schemaMiddleware.js";

const customerRouter = Router();

customerRouter.post(
  "/customers",
  authmiddleware,
  schemaMiddleware("customerSchema"),
  uniqueCustomer,
  customerValidations,
  CustomerController.create,
);

customerRouter.get("/customers", authmiddleware, CustomerController.getAllSorted);

customerRouter.get("/customers/all", authmiddleware, CustomerController.getAll);

customerRouter.get("/customers/:id", authmiddleware, customerById, CustomerController.getCustomer);

customerRouter.put(
  "/customers/:id",
  authmiddleware,
  schemaMiddleware("customerSchema"),
  uniqueCustomer,
  customerById,
  customerValidations,
  CustomerController.update,
);

customerRouter.delete("/customers/:id", authmiddleware, customerById, deleteCustomer, CustomerController.delete);

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     BearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *   schemas:
 *     Customer:
 *       type: object
 *       required:
 *         - email
 *         - name
 *         - country
 *         - city
 *         - street
 *         - house
 *         - flat
 *         - phone
 *         - createdOn
 *       properties:
 *         _id:
 *           type: string
 *           description: The auto-generated id of the customer
 *         email:
 *           type: string
 *           description: The customer's email address
 *         name:
 *           type: string
 *           description: The customer's name
 *         country:
 *           type: string
 *           enum:
 *             - USA
 *             - Canada
 *             - Belarus
 *             - Ukraine
 *             - Germany
 *             - France
 *             - Great Britain
 *             - Russia
 *           description: The customer's country
 *         city:
 *           type: string
 *           description: The customer's city
 *         street:
 *           type: string
 *           description: The customer's street
 *         house:
 *           type: number
 *           description: The customer's house number
 *         flat:
 *           type: number
 *           description: The customer's flat number
 *         phone:
 *           type: string
 *           description: The customer's phone number
 *         createdOn:
 *           type: string
 *           format: date-time
 *           description: The date the customer was created
 *         notes:
 *           type: string
 *           description: Additional notes about the customer
 *       example:
 *         "_id": "6396593e54206d313b2a50b7"
 *         "email": "customer1@example.com"
 *         "name": "John Doe"
 *         "country": "USA"
 *         "city": "New York"
 *         "street": "5th Avenue"
 *         "house": 123
 *         "flat": 45
 *         "phone": "+155512345678"
 *         "createdOn": "2024-09-28T14:00:00Z"
 *         "notes": "Frequent customer"
 *
 *     CustomerWithoutId:
 *       type: object
 *       required:
 *         - email
 *         - name
 *         - country
 *         - city
 *         - street
 *         - house
 *         - flat
 *         - phone
 *       properties:
 *         email:
 *           type: string
 *           description: The customer's email address
 *         name:
 *           type: string
 *           description: The customer's name
 *         country:
 *           type: string
 *           enum:
 *             - USA
 *             - Canada
 *             - Belarus
 *             - Ukraine
 *             - Germany
 *             - France
 *             - Great Britain
 *             - Russia
 *           description: The customer's country
 *         city:
 *           type: string
 *           description: The customer's city
 *         street:
 *           type: string
 *           description: The customer's street
 *         house:
 *           type: number
 *           description: The customer's house number
 *         flat:
 *           type: number
 *           description: The customer's flat number
 *         phone:
 *           type: string
 *           description: The customer's phone number
 *         notes:
 *           type: string
 *           description: Additional notes about the customer
 *       example:
 *         "email": "customer1@example.com"
 *         "name": "John Doe"
 *         "country": "USA"
 *         "city": "New York"
 *         "street": "5th Avenue"
 *         "house": 123
 *         "flat": 45
 *         "phone": "+155512345678"
 *         "notes": "Frequent customer"
 */

/**
 * @swagger
 * tags:
 *   name: Customers
 *   description: Customers management service
 */

/**
 * @swagger
 * /api/customers:
 *   post:
 *     summary: Create a new customer
 *     tags: [Customers]
 *     parameters:
 *       - in: header
 *         name: Authorization
 *         required: true
 *         schema:
 *           type: string
 *           example: Bearer <JWT token>
 *         description: Bearer token for authentication
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CustomerWithoutId'
 *     responses:
 *       201:
 *         description: The customer was successfully created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Customer'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized, missing or invalid token
 *       409:
 *         description: Conflict, customer already exists
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/customers:
 *   get:
 *     summary: Get the list of customers with optional filters and sorting
 *     tags: [Customers]
 *     parameters:
 *       - in: header
 *         name: Authorization
 *         required: true
 *         schema:
 *           type: string
 *           example: Bearer <JWT token>
 *         description: Bearer token for authentication
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for filtering customers by email, name, or country
 *       - in: query
 *         name: country
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *           example: ["USA", "Canada"]
 *         description: Filter customers by country
 *       - in: query
 *         name: sortField
 *         schema:
 *           type: string
 *           enum: [email, name, country, createdOn]
 *           example: name
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           example: asc
 *         description: Sort order (ascending or descending)
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: The list of customers
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Customer'
 *       401:
 *         description: Unauthorized, missing or invalid token
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/customers/all:
 *   get:
 *     summary: Get the list of all customers (no pagination, filters or sorting)
 *     tags: [Customers]
 *     parameters:
 *       - in: header
 *         name: Authorization
 *         required: true
 *         schema:
 *           type: string
 *           example: Bearer <JWT token>
 *         description: Bearer token for authentication
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: The complete list of customers
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Customer'
 *       401:
 *         description: Unauthorized, missing or invalid token
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/customers/{id}:
 *   get:
 *     summary: Get the customer by Id
 *     tags: [Customers]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The customer id
 *       - in: header
 *         name: Authorization
 *         required: true
 *         schema:
 *           type: string
 *           example: Bearer <JWT token>
 *         description: Bearer token for authentication
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: The customer by Id
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Customer'
 *       401:
 *         description: Unauthorized, missing or invalid token
 *       404:
 *         description: The customer was not found
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/customers/{id}:
 *   put:
 *     summary: Update the customer by Id
 *     tags: [Customers]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The customer id
 *       - in: header
 *         name: Authorization
 *         required: true
 *         schema:
 *           type: string
 *           example: Bearer <JWT token>
 *         description: Bearer token for authentication
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CustomerWithoutId'
 *     responses:
 *       200:
 *         description: The customer was successfully updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Customer'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized, missing or invalid token
 *       404:
 *         description: The customer was not found
 *       409:
 *         description: Conflict, unable to update the customer
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/customers/{id}:
 *   delete:
 *     summary: Delete the customer by Id
 *     tags: [Customers]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The customer id
 *       - in: header
 *         name: Authorization
 *         required: true
 *         schema:
 *           type: string
 *           example: Bearer <JWT token>
 *         description: Bearer token for authentication
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       204:
 *         description: The customer was successfully deleted
 *       401:
 *         description: Unauthorized, missing or invalid token
 *       404:
 *         description: The customer was not found
 *       500:
 *         description: Server error
 */

export default customerRouter;
