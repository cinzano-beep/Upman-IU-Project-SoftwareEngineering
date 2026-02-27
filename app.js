const express = require("express");
const session = require("express-session");
const path = require("path");
const bcrypt = require("bcrypt");

const db = require("./config/db");

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
    secret: "supersecretkey",
    resave: false,
    saveUninitialized: false
}));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static("public"));

/* DB Initialisierung */

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

    // Admin-User erstellen (falls nicht vorhanden)
    const adminPassword = bcrypt.hashSync("admin123", 10);

    db.get("SELECT * FROM users WHERE username = ?", ["admin"], (err, row) => {
        if (!row) {
            db.run(
                "INSERT INTO users (username, password, role) VALUES (?, ?, ?)",
                ["admin", adminPassword, "admin"]
            );
            console.log("Admin-User erstellt (admin / admin123)");
        }
    });

});

/*  Test-Route */

app.get("/", (req, res) => {
    res.send("Update Manager läuft 🚀");
});

/*  Server starten */

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server läuft auf Port ${PORT}`);
});