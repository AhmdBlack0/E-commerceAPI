const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { connectDB } = require("./lib/connectDB");
const productRoutes = require("./routes/products.route");
const userRoutes = require("./routes/user.route");
const app = express();
app.use(cors());
app.use(express.json());
dotenv.config();
const PORT = process.env.PORT || 3000;

// Test database connection before starting server
connectDB().then(() => {
  console.log('Database connection established, starting server...');
  
  app.use("/api/products", productRoutes);
  app.use("/api/", userRoutes);

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
