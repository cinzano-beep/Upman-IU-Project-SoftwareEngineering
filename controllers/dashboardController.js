const db = require("../config/db");
const axios = require("axios");

const NVD_API = "https://services.nvd.nist.gov/rest/json/cves/2.0?resultsPerPage=5";

exports.dashboard = async (req, res) => {
    const user = req.session.user;

    try {

        /* ============================= */
        /* Geräte-Statistiken */
        /* ============================= */

        let query = "";
        let params = [];

        if (user.role === "admin") {
            query = "SELECT * FROM devices";
        } else {
            query = "SELECT * FROM devices WHERE user_id = ?";
            params = [user.id];
        }

        const devices = await new Promise((resolve, reject) => {
            db.all(query, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        const stats = {
            totalDevices: devices.length,
            criticalDevices: devices.filter(d => d.update_status === "critical").length,
            updateAvailableDevices: devices.filter(d => d.update_status === "update-available").length
        };

        /* ============================= */
        /* Benutzeranzahl (nur Admin) */
        /* ============================= */

        let totalUsers = 0;

        if (user.role === "admin") {
            totalUsers = await new Promise((resolve, reject) => {
                db.get("SELECT COUNT(*) as count FROM users", (err, row) => {
                    if (err) reject(err);
                    else resolve(row.count);
                });
            });
        }

        /* ============================= */
        /* NVD API – Aktuelle CVEs */
        /* ============================= */

        let advisories = [];

        try {
            const response = await axios.get(NVD_API);

            const cves = response.data.vulnerabilities;

            advisories = cves.map(item => ({
                id: item.cve.id,
                description: item.cve.descriptions?.[0]?.value || "Keine Beschreibung verfügbar",
                published: item.cve.published
            }));

        } catch (apiError) {
            console.error("NVD API Fehler:", apiError.message);
            advisories = [];
        }

        /* ============================= */
        /* Render */
        /* ============================= */

        res.render("dashboard", {
            user,
            stats,
            totalUsers,
            advisories,
            appName: "Upman"
        });

    } catch (error) {
        console.error("Dashboard Fehler:", error);
        res.status(500).send("Fehler beim Laden des Dashboards");
    }
};