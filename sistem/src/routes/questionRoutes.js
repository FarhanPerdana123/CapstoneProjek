const express = require("express");
const router = express.Router();
const QuestionController = require("../controllers/questionController");
const { optionalAuth } = require("../middlewares/authMiddleware");

// Public Read Routes
router.get("/generate-code", QuestionController.generateCode);
router.get("/", QuestionController.getAll);
router.get("/:id", QuestionController.getById);

// Question Management Routes (CRUD)
router.post("/", optionalAuth, QuestionController.create);
router.put("/:id", optionalAuth, QuestionController.update);
router.delete("/:id", optionalAuth, QuestionController.delete);

module.exports = router;
