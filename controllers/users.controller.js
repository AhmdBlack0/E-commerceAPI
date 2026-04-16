import { prisma } from "../lib/connectDB.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const getUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const users = await prisma.user.findMany({
      skip,
      take: limit,
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    const total = await prisma.user.count();

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
    const user = await prisma.user.delete({
      where: { id: req.params.id }
    });
    res.status(200).json({ message: "User deleted successfully" });
  } catch (err) {
    console.error("Error deleting user:", err);
    if (err.code === 'P2025') {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(500).json({ error: err.message });
  }
};

const registerUser = async (req, res) => {
  const { name, email, password, username, role } = req.body;
  
  if (!name || !email || !password || !username) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  let user = await prisma.user.findUnique({
    where: { email }
  });
  if (user) {
    return res.status(400).json({ message: "User already exists" });
  } else {
    try {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      const user = await prisma.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          username,
          role: role || 'USER'
        }
      });

      const token = await jwt.sign(
        { email: user.email, id: user.id },
        process.env.JWT_SECRET_KEY,
        { expiresIn: "1h" }
      );

      await prisma.user.update({
        where: { id: user.id },
        data: { token }
      });
      return res.status(201).json(user);
    } catch (err) {
      return res.status(400).json({ message: err.message });
    }
  }
};

const login = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { email: req.body.email }
    });
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
      { email: user.email, id: user.id, role: user.role },
      process.env.JWT_SECRET_KEY,
      { expiresIn: "1d" }
    );
    return res.status(200).json({
      msg: "Login successful",
      user: {
        id: user.id,
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

    // Check user exists
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: "User not found" });

    // Check product exists before attempting to create the cart item
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) return res.status(404).json({ error: "Product not found" });

    const existingCartItem = await prisma.cartItem.findUnique({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
    });

    if (existingCartItem) {
      await prisma.cartItem.update({
        where: { id: existingCartItem.id },
        data: {
          quantity: existingCartItem.quantity + (quantity || 1),
        },
      });
    } else {
      await prisma.cartItem.create({
        data: {
          userId,
          productId,
          quantity: quantity || 1,
        },
      });
    }

    const cart = await prisma.cartItem.findMany({
      where: { userId },
      include: { product: true },
    });

    res.status(200).json({ message: "Cart updated", cart });
  } catch (err) {
    console.error("Error adding to cart:", err);
    res.status(500).json({ error: err.message });
  }
};

const getCart = async (req, res) => {
  const { userId } = req.params;

  try {
    const cart = await prisma.cartItem.findMany({
      where: { userId },
      include: { product: true }
    });

    res.status(200).json(cart);
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
    const cartItem = await prisma.cartItem.findUnique({
      where: {
        userId_productId: {
          userId,
          productId
        }
      }
    });

    if (!cartItem) return res.status(404).json({ error: "Product not in cart" });

    const updatedCartItem = await prisma.cartItem.update({
      where: { id: cartItem.id },
      data: { quantity }
    });

    const cart = await prisma.cartItem.findMany({
      where: { userId },
      include: { product: true }
    });

    res.status(200).json({ message: "Cart item updated", cart });
  } catch (err) {
    console.error("Error updating cart item:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Remove from Cart
const removeFromCart = async (req, res) => {
  const { userId, productId } = req.params;

  try {
    const cartItem = await prisma.cartItem.findUnique({
      where: {
        userId_productId: {
          userId,
          productId
        }
      }
    });

    if (!cartItem) return res.status(404).json({ error: "Product not in cart" });

    await prisma.cartItem.delete({
      where: { id: cartItem.id }
    });

    const cart = await prisma.cartItem.findMany({
      where: { userId },
      include: { product: true }
    });

    res.status(200).json({ message: "Item removed from cart", cart });
  } catch (err) {
    console.error("Error removing item from cart:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get WatchList
const getWatchList = async (req, res) => {
  const { userId } = req.params;

  try {
    const watchList = await prisma.watchListItem.findMany({
      where: { userId },
      include: { product: true }
    });

    res.status(200).json(watchList);
  } catch (err) {
    console.error("Error fetching watchList:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Remove from WatchList
const removeFromWatchList = async (req, res) => {
  const { userId, productId } = req.params;

  try {
    const watchListItem = await prisma.watchListItem.findUnique({
      where: {
        userId_productId: {
          userId,
          productId
        }
      }
    });

    if (!watchListItem) return res.status(404).json({ error: "Product not in watchList" });

    await prisma.watchListItem.delete({
      where: { id: watchListItem.id }
    });

    const watchList = await prisma.watchListItem.findMany({
      where: { userId },
      include: { product: true }
    });

    res.status(200).json({
      message: "Item removed from watchList",
      watchList,
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
    const existingWatchListItem = await prisma.watchListItem.findUnique({
      where: {
        userId_productId: {
          userId,
          productId
        }
      }
    });

    if (existingWatchListItem) {
      return res.status(400).json({ message: "Item already in watchList" });
    }

    await prisma.watchListItem.create({
      data: {
        userId,
        productId
      }
    });

    const watchList = await prisma.watchListItem.findMany({
      where: { userId },
      include: { product: true }
    });

    res.status(200).json({
      message: "watchList updated",
      watchList,
    });
  } catch (err) {
    console.error("Error adding to watchList:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

export {
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
