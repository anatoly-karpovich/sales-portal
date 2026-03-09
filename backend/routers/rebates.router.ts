import { Router } from "express";
import PromocodesController from "../controllers/rebates.controller.js";

const rebatesRouter = Router();

rebatesRouter.get("/promocodes/:id", PromocodesController.getPromocodeByName.bind(PromocodesController));

export default rebatesRouter;
