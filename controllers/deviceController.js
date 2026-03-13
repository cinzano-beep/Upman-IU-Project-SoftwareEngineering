const db = require("../config/db");

exports.listDevices = (req, res) => {
    const user = req.session.user;

    let query;
    let params = [];

    if (user.role === "admin") {
        query = "SELECT devices.*, users.username FROM devices JOIN users ON devices.user_id = users.id";
    } else {
        query = "SELECT devices.*, users.username FROM devices JOIN users ON devices.user_id = users.id WHERE user_id = ?";
        params = [user.id];
    }

    db.all(query, params, (err, rows) => {
        if (err) return res.send("Fehler beim Laden der Geräte");

        res.render("devices", { devices: rows, user });
    });
};

exports.showAddForm = (req, res) => {
    res.render("add-device");
};

exports.addDevice = (req, res) => {
    const { name, type, software_version, update_status } = req.body;
    const userId = req.session.user.id;

    db.run(
        "INSERT INTO devices (user_id, name, type, software_version, update_status) VALUES (?, ?, ?, ?, ?)",
        [userId, name, type, software_version, update_status],
        (err) => {
            if (err) return res.send("Fehler beim Speichern");

            res.redirect("/devices");
        }
    );
};

exports.showEditForm = (req, res) => {
    const deviceId = req.params.id;

    db.get("SELECT * FROM devices WHERE id = ?", [deviceId], (err, device) => {
        if (err || !device) return res.send("Gerät nicht gefunden");

        res.render("edit-device", { device });
    });
};

exports.updateDevice = (req, res) => {
    const deviceId = req.params.id;
    const { name, type, software_version, update_status } = req.body;

    db.run(
        "UPDATE devices SET name = ?, type = ?, software_version = ?, update_status = ? WHERE id = ?",
        [name, type, software_version, update_status, deviceId],
        (err) => {
            if (err) return res.send("Fehler beim Aktualisieren");

            res.redirect("/devices");
        }
    );
};

exports.deleteDevice = (req, res) => {
    const deviceId = req.params.id;

    db.run("DELETE FROM devices WHERE id = ?", [deviceId], (err) => {
        if (err) return res.send("Fehler beim Löschen");

        res.redirect("/devices");
    });
};