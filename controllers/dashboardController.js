const db = require("../config/db");
const axios = require("axios");

exports.dashboard = async (req, res) => {
    const user = req.session.user;

    if (!user) {
        return res.redirect("/login");
    }

    try {
        /* ============================= */
        /* Geräte laden */
        /* ============================= */

        const devices = await new Promise((resolve, reject) => {

            let query;
            let params = [];

            if (user.role === "admin") {
                query = `
                    SELECT devices.*, users.username
                    FROM devices
                    JOIN users ON devices.user_id = users.id
                `;
            } else {
                query = `
                    SELECT devices.*, users.username
                    FROM devices
                    JOIN users ON devices.user_id = users.id
                    WHERE devices.user_id = ?
                `;
                params = [user.id];
            }

            db.all(query, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        /* ============================= */
        /* Statistik berechnen */
        /* ============================= */

        const totalDevices = devices.length;
        const criticalCount = devices.filter(d => d.update_status === "critical").length;
        const availableCount = devices.filter(d => d.update_status === "update-available").length;
        const upToDateCount = devices.filter(d => d.update_status === "up-to-date").length;

        /* ============================= */
        /* NVD API Integration */
        /* ============================= */

        const apiKey = process.env.NVD_API_KEY;

        let securityAlerts = [];

        for (const device of devices) {

            // Keyword bauen (Typ + Version)
            const keyword = `${device.type || ""} ${device.software_version || ""}`.trim();

            if (!keyword) continue;

            try {
                const response = await axios.get(
                    `https://services.nvd.nist.gov/rest/json/cves/2.0`,
                    {
                        params: {
                            keywordSearch: keyword,
                            resultsPerPage: 3
                        },
                        headers: {
                            "apiKey": apiKey
                        }
                    }
                );

                const vulnerabilities = response.data.vulnerabilities || [];

                const deviceAlerts = vulnerabilities.slice(0, 3).map(v => {
                    return {
                        cveId: v.cve.id,
                        description: v.cve.descriptions?.[0]?.value || "Keine Beschreibung verfügbar",
                        published: v.cve.published
                    };
                });

                if (deviceAlerts.length > 0) {
                    securityAlerts.push({
                        deviceName: device.name,
                        keyword,
                        alerts: deviceAlerts
                    });
                }

            } catch (err) {
                console.error("NVD API Fehler:", err.message);
            }
        }

        /* ============================= */
        /* Render */
        /* ============================= */

        res.render("dashboard", {
            user,
            totalDevices,
            criticalCount,
            availableCount,
            upToDateCount,
            securityAlerts
        });

    } catch (err) {
        console.error(err);
        res.status(500).send("Fehler beim Laden des Dashboards");
    }
};