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
  CustomerController.create.bind(CustomerController),
);

customerRouter.get("/customers", authmiddleware, CustomerController.getAllSorted.bind(CustomerController));

customerRouter.get("/customers/all", authmiddleware, CustomerController.getAll.bind(CustomerController));

customerRouter.post("/customers/export", authmiddleware, CustomerController.export.bind(CustomerController));

customerRouter.get(
  "/customers/:customerId",
  authmiddleware,
  customerById,
  CustomerController.getCustomer.bind(CustomerController),
);

customerRouter.put(
  "/customers/:customerId",
  authmiddleware,
  schemaMiddleware("customerSchema"),
  uniqueCustomer,
  customerById,
  customerValidations,
  CustomerController.update.bind(CustomerController),
);

customerRouter.delete(
  "/customers/:customerId",
  authmiddleware,
  customerById,
  deleteCustomer,
  CustomerController.delete.bind(CustomerController),
);

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
 *
 *     CustomerResponse:
 *       type: object
 *       properties:
 *         Customer:
 *           $ref: '#/components/schemas/Customer'
 *         IsSuccess:
 *           type: boolean
 *         ErrorMessage:
 *           type: string
 *           nullable: true
 *
 *     CustomersListResponse:
 *       type: object
 *       properties:
 *         Customers:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Customer'
 *         IsSuccess:
 *           type: boolean
 *         ErrorMessage:
 *           type: string
 *           nullable: true
 *
 *     CustomersSortedResponse:
 *       allOf:
 *         - $ref: '#/components/schemas/CustomersListResponse'
 *         - type: object
 *           properties:
 *             total:
 *               type: number
 *             page:
 *               type: number
 *             limit:
 *               type: number
 *             search:
 *               type: string
 *             country:
 *               type: array
 *               items:
 *                 type: string
 *             sorting:
 *               type: object
 *               properties:
 *                 sortField:
 *                   type: string
 *                   enum: [email, name, country, createdOn]
 *                 sortOrder:
 *                   type: string
 *                   enum: [asc, desc]
 *
 *     CustomerExportPayload:
 *       type: object
 *       required:
 *         - format
 *         - fields
 *       properties:
 *         format:
 *           type: string
 *           enum: [csv, json]
 *         filters:
 *           type: object
 *           nullable: true
 *           properties:
 *             search:
 *               type: string
 *             country:
 *               type: array
 *               items:
 *                 type: string
 *             page:
 *               type: number
 *             limit:
 *               type: number
 *             sortField:
 *               type: string
 *               enum: [email, name, country, createdOn]
 *             sortOrder:
 *               type: string
 *               enum: [asc, desc]
 *         fields:
 *           type: array
 *           items:
 *             type: string
 *             enum: [_id, email, name, country, city, street, house, flat, phone, createdOn, notes]
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
 *               $ref: '#/components/schemas/CustomerResponse'
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
 *               $ref: '#/components/schemas/CustomersSortedResponse'
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
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: The complete list of customers
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CustomersListResponse'
 *       401:
 *         description: Unauthorized, missing or invalid token
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/customers/export:
 *   post:
 *     summary: Export customers in CSV/JSON format
 *     tags: [Customers]
 *     parameters:
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CustomerExportPayload'
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
 *       401:
 *         description: Unauthorized, missing or invalid token
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/customers/{customerId}:
 *   get:
 *     summary: Get the customer by Id
 *     tags: [Customers]
 *     parameters:
 *       - in: path
 *         name: customerId
 *         schema:
 *           type: string
 *         required: true
 *         description: The customer id
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: The customer by Id
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CustomerResponse'
 *       401:
 *         description: Unauthorized, missing or invalid token
 *       404:
 *         description: The customer was not found
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/customers/{customerId}:
 *   put:
 *     summary: Update the customer by Id
 *     tags: [Customers]
 *     parameters:
 *       - in: path
 *         name: customerId
 *         schema:
 *           type: string
 *         required: true
 *         description: The customer id
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
 *               $ref: '#/components/schemas/CustomerResponse'
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
 * /api/customers/{customerId}:
 *   delete:
 *     summary: Delete the customer by Id
 *     tags: [Customers]
 *     parameters:
 *       - in: path
 *         name: customerId
 *         schema:
 *           type: string
 *         required: true
 *         description: The customer id
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       204:
 *         description: The customer was successfully deleted
 *       401:
 *         description: Unauthorized, missing or invalid token
 *       404:
 *         description: The customer was not found
 *       409:
 *         description: Conflict, unable to delete the customer
 *       500:
 *         description: Server error
 */

export default customerRouter;

