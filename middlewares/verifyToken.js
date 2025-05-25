// middlewares/verifyToken.js
const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
  try {
    const authHeader =
      req.headers["authorization"] || req.headers["Authorization"];

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({ message: "Invalid or missing Authorization header" });
    }

    const token = authHeader.split(" ")[1];
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET_KEY);

    req.user = decodedToken; // Attach user info (id, role, etc.) to request
    next();
  } catch (error) {
    const msg =
      error.name === "TokenExpiredError"
        ? "Token has expired"
        : "Invalid token";
    return res.status(401).json({ message: msg });
  }
};

module.exports = verifyToken;
