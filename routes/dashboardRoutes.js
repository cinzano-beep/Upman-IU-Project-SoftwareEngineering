const express = require("express");
const router = express.Router();
const { isAuthenticated } = require("../middleware/authMiddleware");
const dashboardController = require("../controllers/dashboardController");

router.get("/dashboard", isAuthenticated, dashboardController.dashboard);

module.exports = router;