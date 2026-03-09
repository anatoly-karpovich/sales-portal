import { Router } from "express";
import UsersController from "../controllers/users.controller";
import { authmiddleware } from "../middleware/authmiddleware";
import { check } from "express-validator";
import { schemaMiddleware } from "../middleware/schemaMiddleware";
import { deleteUserMiddleware } from "../middleware/usersMiddleware";
import { changePasswordMiddleware } from "../middleware/changePasswordMiddleware";

const usersRouter = Router();

usersRouter.get("/users", authmiddleware, UsersController.getUsers.bind(UsersController));
usersRouter.get("/users/:id", authmiddleware, UsersController.getUser.bind(UsersController));

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
usersRouter.delete("/users/:id", authmiddleware, deleteUserMiddleware, UsersController.deleteUser.bind(UsersController));
usersRouter.patch(
  "/users/password/:id",
  authmiddleware,
  changePasswordMiddleware,
  UsersController.changePassword.bind(UsersController),
);

export default usersRouter;
