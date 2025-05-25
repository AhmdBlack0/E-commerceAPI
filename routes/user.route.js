const express = require("express");
const router = express.Router();
const verifyToken = require("../middlewares/verifyToken");
const {
  getUsers,
  registerUser,
  login,
  deleteUser,
  addToCart,
  getCart,
  updateCartItem,
  removeFromCart,
  getWatchList,
  removeFromWatchList,
  addWatchList,
} = require("../controllers/users.controller");
const verifyAdmin = require("../middlewares/verifyAdmin");

// User routes
router.route("/users").get(verifyToken, verifyAdmin, getUsers);
router.route("/users/:id").delete(verifyToken, verifyAdmin, deleteUser);
router.route("/register").post(registerUser);
router.route("/login").post(login);

// Cart routes
router.route("/users/:userId/cart").post(verifyToken, addToCart);
router.route("/users/:userId/cart").get(verifyToken, getCart);
router
  .route("/users/:userId/cart/:productId")
  .patch(verifyToken, updateCartItem);
router
  .route("/users/:userId/cart/:productId")
  .delete(verifyToken, removeFromCart);

// WatchList routes
router.route("/users/:userId/watchList").post(verifyToken, addWatchList);
router.route("/users/:userId/watchList").get(verifyToken, getWatchList);
router
  .route("/users/:userId/watchList/:productId")
  .delete(verifyToken, removeFromWatchList);

module.exports = router;
