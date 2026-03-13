const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const db = require("../config/db");

/* Login Seite */
router.get("/login", (req, res) => {
    if (req.session.user) {
        return res.redirect("/dashboard");
    }
    res.render("login");
});

/* Login Verarbeitung */
router.post("/login", (req, res) => {
    const { username, password } = req.body;

    db.get("SELECT * FROM users WHERE username = ?", [username], async (err, user) => {
        if (err || !user) {
            return res.render("login", { error: "Ungültige Zugangsdaten" });
        }

        const valid = await bcrypt.compare(password, user.password);

        if (!valid) {
            return res.render("login", { error: "Ungültige Zugangsdaten" });
        }

        req.session.user = {
            id: user.id,
            username: user.username,
            role: user.role
        };

        res.redirect("/dashboard");
    });
});

/* Logout */
router.get("/logout", (req, res) => {
    req.session.destroy(() => {
        res.redirect("/login");
    });
});

module.exports = router;