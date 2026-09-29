const express = require("express");
const router = express.Router();
const { AuthController } = require("../controllers/authController");
const { requireAuth } = require("../middlewares/authMiddleware");

router.post("/register", AuthController.register);
router.post("/login", AuthController.login);
router.get("/me", requireAuth, AuthController.getProfile);

module.exports = router;
