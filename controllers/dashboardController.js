const db = require("../config/db");

exports.showDashboard = (req, res) => {
    const user = req.session.user;

    const stats = {
        totalDevices: 0,
        criticalUpdates: 0,
        totalUsers: 0
    };

    const queries = [];

    if (user.role === "admin") {
        queries.push(new Promise((resolve) => {
            db.get("SELECT COUNT(*) as count FROM devices", (err, row) => {
                stats.totalDevices = row?.count || 0;
                resolve();
            });
        }));

        queries.push(new Promise((resolve) => {
            db.get("SELECT COUNT(*) as count FROM devices WHERE update_status = 'critical'", (err, row) => {
                stats.criticalUpdates = row?.count || 0;
                resolve();
            });
        }));

        queries.push(new Promise((resolve) => {
            db.get("SELECT COUNT(*) as count FROM users", (err, row) => {
                stats.totalUsers = row?.count || 0;
                resolve();
            });
        }));
    } else {
        queries.push(new Promise((resolve) => {
            db.get("SELECT COUNT(*) as count FROM devices WHERE user_id = ?", [user.id], (err, row) => {
                stats.totalDevices = row?.count || 0;
                resolve();
            });
        }));

        queries.push(new Promise((resolve) => {
            db.get("SELECT COUNT(*) as count FROM devices WHERE user_id = ? AND update_status = 'critical'", [user.id], (err, row) => {
                stats.criticalUpdates = row?.count || 0;
                resolve();
            });
        }));
    }

    Promise.all(queries).then(() => {
        res.render("dashboard", { user, stats });
    });
};