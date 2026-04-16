import express from "express";
import verifyToken from "../middlewares/verifyToken.js";
import verifyAdmin from "../middlewares/verifyAdmin.js";
import {
  createCheckoutSession,
  stripeWebhook,
  getOrders,
  getOrderById,
  getAllOrders,
} from "../controllers/payment.controller.js";

const router = express.Router();

router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  stripeWebhook
);

router.post("/checkout", verifyToken, createCheckoutSession);
router.get("/orders", verifyToken, getOrders);
router.get("/orders/:orderId", verifyToken, getOrderById);
router.get("/admin/orders", verifyToken, verifyAdmin, getAllOrders);

export default router;
