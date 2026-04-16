import express from "express";
import cors from "cors";
import "dotenv/config";
import { connectDB } from "./lib/connectDB.js";
import productRoutes from "./routes/products.route.js";
import userRoutes from "./routes/user.route.js";
import paymentRoutes from "./routes/payment.route.js";

const app = express();
app.use(cors());
app.use(express.json());
const PORT = process.env.PORT || 3000;

// Test database connection before starting server
connectDB().then(() => {
  console.log('Database connection established, starting server...');
  
  app.use("/api/products", productRoutes);
  app.use("/api/", userRoutes);
  app.use("/api/payment", paymentRoutes);

  // for test
  app.get("/test", (req, res) => {
    res.status(200).json({ status: "OK" });
  });

  app.use((req, res) => {
    res.status(404).json({ error: "Route not found" });
  });

  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}).catch(err => {
  console.error('Failed to connect to database:', err);
  process.exit(1);
});
