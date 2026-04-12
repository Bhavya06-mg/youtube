import express from "express";
import {
  createOrder,
  verifyPayment,
  downloadVideo,
  getUserDownloads,
  getPremiumStatus,
} from "../controllers/download.js";

const routes = express.Router();

routes.post("/create-order", createOrder);
routes.post("/verify-payment", verifyPayment);
routes.post("/download", downloadVideo);
routes.get("/user-downloads/:userId", getUserDownloads);
routes.get("/premium-status/:userId", getPremiumStatus);

export default routes;