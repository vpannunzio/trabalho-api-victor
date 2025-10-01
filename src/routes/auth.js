const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { userSchemas, validate } = require("../middleware/validation");
const { authenticateToken } = require("../middleware/auth");
const { authLimiter } = require("../middleware/rateLimiter");

router.post(
  "/register",
  authLimiter,
  validate(userSchemas.register),
  authController.register
);

router.post(
  "/login",
  authLimiter,
  validate(userSchemas.login),
  authController.login
);

router.get("/profile", authenticateToken, authController.getProfile);

router.put(
  "/profile",
  authenticateToken,
  validate(userSchemas.update),
  authController.updateProfile
);

router.delete("/account", authenticateToken, authController.deleteAccount);

module.exports = router;
