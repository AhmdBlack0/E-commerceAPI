const User = require("../models/userModel");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const getUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const users = await User.find({})
      .select("-password -__v")
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments();

    res.status(200).json({
      data: users,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ error: err.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json({ message: "User deleted successfully" });
  } catch (err) {
    console.error("Error deleting user:", err);
    res.status(500).json({ error: err.message });
  }
};

const registerUser = async (req, res) => {
  let user = await User.findOne({ email: req.body.email });
  if (user) {
    return res.status(400).json({ message: "User already exists" });
  } else {
    try {
      const salt = await bcrypt.genSalt(10);
      const password = await bcrypt.hash(req.body.password, salt);
      const user = new User({
        name: req.body.name,
        email: req.body.email,
        password: password,
        username: req.body.username,
        role: req.body.role
      });

      const token = await jwt.sign(
        { email: user.email, id: user._id },
        process.env.JWT_SECRET_KEY,
        { expiresIn: "1h" }
      );
      user.token = token;

      await user.save();
      return res.status(201).json(user);
    } catch (err) {
      return res.status(400).json({ message: err.message });
    }
  }
};

const login = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const passwordMatch = await bcrypt.compare(
      req.body.password,
      user.password
    );
    if (!passwordMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const token = await jwt.sign(
      { email: user.email, id: user._id, role: user.role },
      process.env.JWT_SECRET_KEY,
      { expiresIn: "1d" }
    );
    return res.status(200).json({
      msg: "Login successful",
      user: {
        id: user._id,
        token: token,
      },
      role: user.role,
    });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

const addToCart = async (req, res) => {
  const { userId } = req.params;
  const { productId, quantity } = req.body;

  try {
    if (!productId) return res.status(400).json({ error: "Product ID is required" });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const itemIndex = user.cart.findIndex(
      (item) => item.productId && item.productId.toString() === productId
    );

    if (itemIndex > -1) {
      user.cart[itemIndex].quantity += quantity || 1;
    } else {
      user.cart.push({
        productId: new mongoose.Types.ObjectId(productId),
        quantity: quantity || 1,
      });
    }

    await user.save();
    res.status(200).json({ message: "Cart updated", cart: user.cart });
  } catch (err) {
    console.error("Error adding to cart:", err);
    res.status(500).json({ error: err.message });
  }
};

const getCart = async (req, res) => {
  const { userId } = req.params;

  try {
    const user = await User.findById(userId).populate("cart.productId", "-__v");
    if (!user) return res.status(404).json({ error: "User not found" });

    res.status(200).json(user.cart);
  } catch (err) {
    console.error("Error fetching cart:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Update Cart Item
const updateCartItem = async (req, res) => {
  const { userId, productId } = req.params;
  const { quantity } = req.body;

  try {
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ error: "Invalid product ID" });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const item = user.cart.find(
      (item) => item.productId && item.productId.toString() === productId
    );

    if (!item) return res.status(404).json({ error: "Product not in cart" });

    item.quantity = quantity;
    await user.save();
    res.status(200).json({ message: "Cart item updated", cart: user.cart });
  } catch (err) {
    console.error("Error updating cart item:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Remove from Cart
const removeFromCart = async (req, res) => {
  const { userId, productId } = req.params;

  try {
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ error: "Invalid product ID" });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    user.cart = user.cart.filter(
      (item) => item.productId && item.productId.toString() !== productId
    );

    await user.save();
    res.status(200).json({ message: "Item removed from cart", cart: user.cart });
  } catch (err) {
    console.error("Error removing item from cart:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get WatchList
const getWatchList = async (req, res) => {
  const { userId } = req.params;

  try {
    const user = await User.findById(userId).populate("watchList.productId", "-__v");
    if (!user) return res.status(404).json({ error: "User not found" });

    res.status(200).json(user.watchList);
  } catch (err) {
    console.error("Error fetching watchList:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Remove from WatchList
const removeFromWatchList = async (req, res) => {
  const { userId, productId } = req.params;

  try {
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ error: "Invalid product ID" });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    user.watchList = user.watchList.filter(
      (item) => item.productId && item.productId.toString() !== productId
    );

    await user.save();
    res.status(200).json({
      message: "Item removed from watchList",
      watchList: user.watchList,
    });
  } catch (err) {
    console.error("Error removing item from watchList:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Add to WatchList
const addWatchList = async (req, res) => {
  const { userId } = req.params;
  const { productId } = req.body;

  try {
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ error: "Invalid product ID" });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const itemIndex = user.watchList.findIndex(
      (item) => item.productId && item.productId.toString() === productId
    );

    if (itemIndex > -1) {
      return res.status(400).json({ message: "Item already in watchList" });
    } else {
      user.watchList.push({ productId: new mongoose.Types.ObjectId(productId) });
      await user.save();
      res.status(200).json({
        message: "watchList updated",
        watchList: user.watchList,
      });
    }
  } catch (err) {
    console.error("Error adding to watchList:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
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
};
