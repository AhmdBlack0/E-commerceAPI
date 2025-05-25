const express = require("express");
const router = express.Router();

const {
  getProducts,
  addProduct,
  getProduct,
  updateProduct,
  deleteProduct,
} = require("../controllers/products.controller");
const verifyToken = require("../middlewares/verifyToken");
const verifyAdmin = require("../middlewares/verifyAdmin");

// Product routes
router.route("/").get(getProducts);
router.route("/").post(verifyToken, verifyAdmin, addProduct);
router.route("/:id").get(getProduct);
router.route("/:id").patch(verifyToken, verifyAdmin, updateProduct);
router.route("/:id").delete(verifyToken, verifyAdmin, deleteProduct);

module.exports = router;
