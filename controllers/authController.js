const db = require("../config/db");
const bcrypt = require("bcrypt");

exports.showLogin = (req, res) => {
    res.render("login");
};

exports.login = (req, res) => {
    const { username, password } = req.body;

    db.get("SELECT * FROM users WHERE username = ?", [username], async (err, user) => {
        if (err || !user) {
            return res.send("Benutzer nicht gefunden");
        }

        const validPassword = await bcrypt.compare(password, user.password);

        if (!validPassword) {
            return res.send("Falsches Passwort");
        }

        req.session.user = {
            id: user.id,
            role: user.role
        };

        res.redirect("/dashboard");
    });
};

exports.logout = (req, res) => {
    req.session.destroy(() => {
        res.redirect("/login");
    });
};