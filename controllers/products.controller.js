import { prisma } from "../lib/connectDB.js";

const getProducts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Dynamic query building for filters (category, price, etc.)
    const where = {};
    if (req.query.category) where.category = req.query.category;
    if (req.query.price) where.price = { lte: parseFloat(req.query.price) }; // Example: Filter by max price
    if (req.query.rating) where.rating = { gte: parseFloat(req.query.rating) }; // Example: Filter by min rating

    const products = await prisma.product.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' }
    });

    const total = await prisma.product.count({ where });

    res.status(200).json({
      data: products,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error("Error fetching products:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

const addProduct = async (req, res) => {
  try {
    const savedProduct = await prisma.product.create({
      data: req.body
    });
    res.status(201).json(savedProduct);
  } catch (err) {
    console.error("Error creating product:", err);
    if (err.name === "ValidationError") {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: "Internal server error" });
  }
};

const getProduct = async (req, res) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id }
    });
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }
    res.status(200).json(product);
  } catch (err) {
    console.error("Error fetching product:", err);
    if (err.code === 'P2025') {
      return res.status(400).json({ error: "Invalid product ID format" });
    }
    res.status(500).json({ error: "Internal server error" });
  }
};

const updateProduct = async (req, res) => {
  try {
    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: req.body
    });
    res.status(200).json(product);
  } catch (err) {
    console.error("Error updating product:", err);
    if (err.code === 'P2025') {
      return res.status(400).json({ error: "Invalid product ID format" });
    }
    if (err.name === "ValidationError") {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: "Internal server error" });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const product = await prisma.product.delete({
      where: { id: req.params.id }
    });
    res.status(200).json({ message: "Product deleted successfully" });
  } catch (err) {
    console.error("Error deleting product:", err);
    if (err.code === 'P2025') {
      return res.status(400).json({ error: "Invalid product ID format" });
    }
    res.status(500).json({ error: "Internal server error" });
  }
};

export {
  getProducts,
  addProduct,
  getProduct,
  updateProduct,
  deleteProduct,
};
