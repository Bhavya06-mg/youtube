import express from "express";
import { createPlanOrder, verifyPlanPayment, getPlanStatus } from "../controllers/plan.js";

const routes = express.Router();

routes.post("/create-order", createPlanOrder);
routes.post("/verify-payment", verifyPlanPayment);
routes.get("/status/:userId", getPlanStatus);

export default routes;