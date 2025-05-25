const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, "title is required"],
    minlength: 3,
  },
  price: {
    type: Number,
    required: [true, "price is required"],
  },
  description: {
    type: String,
    required: [true, "description is required"],
  },
  imageUrl: {
    type: [String],
    required: [true, "imageUrl is required"],
  },
  category: {
    type: String,
    required: [true, "category is required"],
  },
  stock: Number,
  rating: Number,
  isActive: { type: Boolean, default: true },
  tags: [String],
  discount: Number,
  size: [String],
  color: [String],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Product", ProductSchema);
