const express = require("express");
const router = express.Router();
const { isAuthenticated } = require("../middleware/authMiddleware");

router.get("/dashboard", isAuthenticated, (req, res) => {
    res.render("dashboard", { user: req.session.user });
});

module.exports = router;