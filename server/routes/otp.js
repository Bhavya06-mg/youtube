import express from "express";
import { sendOTP, verifyOTP, getTheme } from "../controllers/otp.js";

const routes = express.Router();

routes.post("/send", sendOTP);
routes.post("/verify", verifyOTP);
routes.get("/theme", getTheme);

export default routes;