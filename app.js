const express = require("express");
const session = require("express-session");
const path = require("path");
const bcrypt = require("bcrypt");

const db = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const deviceRoutes = require("./routes/deviceRoutes");

const app = express();

/* ============================= */
/* Middleware */
/* ============================= */

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
    name: "upman_session",
    secret: process.env.SESSION_SECRET || "supersecretkey",
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 1000 * 60 * 60 * 4, // 4 Stunden eingeloggt bleiben
        httpOnly: true,
        secure: false,
        sameSite: "lax"
    }
}));

/* Globaler Projektname */
app.locals.appName = "Upman";

/* ============================= */
/* View Engine */
/* ============================= */

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static("public"));

/* ============================= */
/* Routes */
/* ============================= */

app.use(authRoutes);
app.use(dashboardRoutes);
app.use(deviceRoutes);

/* ============================= */
/* DB Initialisierung */
/* ============================= */

db.serialize(() => {

    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT NOT NULL CHECK(role IN ('admin','user'))
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS devices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            type TEXT NOT NULL,
            software_version TEXT,
            update_status TEXT CHECK(update_status IN ('up-to-date','update-available','critical')),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )
    `);

    // Admin erstellen
    const adminPassword = bcrypt.hashSync("admin123", 10);

    db.get("SELECT * FROM users WHERE username = ?", ["admin"], (err, row) => {
        if (!row) {
            db.run(
                "INSERT INTO users (username, password, role) VALUES (?, ?, ?)",
                ["admin", adminPassword, "admin"]
            );
            console.log("Admin erstellt (admin / admin123)");
        }
    });

    // Normaler User erstellen
    const userPassword = bcrypt.hashSync("user123", 10);

    db.get("SELECT * FROM users WHERE username = ?", ["user"], (err, row) => {
        if (!row) {
            db.run(
                "INSERT INTO users (username, password, role) VALUES (?, ?, ?)",
                ["user", userPassword, "user"]
            );
            console.log("User erstellt (user / user123)");
        }
    });

});

/* ============================= */
/* Root Redirect */
/* ============================= */

app.get("/", (req, res) => {
    if (req.session.user) {
        return res.redirect("/dashboard");
    }
    res.redirect("/login");
});

/* ============================= */
/* Server */
/* ============================= */

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server läuft auf Port ${PORT}`);
});