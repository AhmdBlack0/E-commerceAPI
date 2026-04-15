import express from "express";
import {
  getProducts,
  addProduct,
  getProduct,
  updateProduct,
  deleteProduct,
} from "../controllers/products.controller.js";
import verifyToken from "../middlewares/verifyToken.js";
import verifyAdmin from "../middlewares/verifyAdmin.js";

const router = express.Router();

// Product routes
router.route("/").get(getProducts);
router.route("/").post(verifyToken, verifyAdmin, addProduct);
router.route("/:id").get(getProduct);
router.route("/:id").patch(verifyToken, verifyAdmin, updateProduct);
router.route("/:id").delete(verifyToken, verifyAdmin, deleteProduct);

export default router;
