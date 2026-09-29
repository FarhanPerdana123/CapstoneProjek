const express = require("express");
const router = express.Router();
const ScreeningController = require("../controllers/screeningController");
const { requireAuth, optionalAuth } = require("../middlewares/authMiddleware");

router.get("/questions", ScreeningController.getQuestions);
router.post("/start", optionalAuth, ScreeningController.startSession);
router.post("/:sessionId/submit", optionalAuth, ScreeningController.submitScreening);
router.post("/submit", optionalAuth, ScreeningController.submitScreening);
router.get("/:sessionId/result", optionalAuth, ScreeningController.getResult);
router.get("/history", requireAuth, ScreeningController.getAllSessions);
router.get("/results", requireAuth, ScreeningController.getResults);

module.exports = router;
