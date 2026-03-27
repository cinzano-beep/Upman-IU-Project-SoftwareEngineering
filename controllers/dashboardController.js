const db = require("../config/db");
const axios = require("axios");

/* 🔐 NVD API KEY CHECK */


const NVD_API_KEY = process.env.NVD_API_KEY;

if (!NVD_API_KEY) {
    console.error(" NVD_API_KEY ist NICHT gesetzt!");
} else {
    console.log(" NVD_API_KEY wurde geladen.");
}


/*  Keyword Mapping */


function buildKeyword(device) {
    const combined = (
        (device.name || "") + " " +
        (device.type || "") + " " +
        (device.software_version || "")
    ).toLowerCase();

    const keywordMap = [
        { match: ["windows 11"], keyword: "Windows 11" },
        { match: ["windows 10"], keyword: "Windows 10" },
        { match: ["windows"], keyword: "Microsoft Windows" },

        { match: ["macos", "os x"], keyword: "macOS" },

        { match: ["iphone"], keyword: "iOS" },
        { match: ["ipad"], keyword: "iPadOS" },
        { match: ["ios"], keyword: "iOS" },

        { match: ["samsung"], keyword: "Android" },
        { match: ["huawei"], keyword: "Android" },
        { match: ["android"], keyword: "Android" }
    ];

    for (const entry of keywordMap) {
        if (entry.match.some(term => combined.includes(term))) {
            return entry.keyword;
        }
    }

    return device.software_version || device.type || device.name;
}


/*  Dashboard */


exports.dashboard = async (req, res) => {

    const user = req.session.user;
    if (!user) return res.redirect("/login");

    try {

        /* Geräte laden */

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

        /* Statistik */

        const totalDevices = devices.length;
        const criticalCount = devices.filter(d => d.update_status === "critical").length;
        const availableCount = devices.filter(d => d.update_status === "update-available").length;
        const upToDateCount = devices.filter(d => d.update_status === "up-to-date").length;

        let securityAlerts = [];

        if (!NVD_API_KEY) {
            console.error(" Dashboard läuft ohne API Key!");
            return res.render("dashboard", {
                user,
                totalDevices,
                criticalCount,
                availableCount,
                upToDateCount,
                securityAlerts
            });
        }

        const fiveYearsAgo = new Date();
        fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);

        /* Für jedes Gerät CVEs laden */
     

        for (const device of devices) {

            const keyword = buildKeyword(device);
            console.log("🔎 Suche CVEs für:", keyword);

            try {

                const response = await axios.get(
                    "https://services.nvd.nist.gov/rest/json/cves/2.0",
                    {
                        params: {
                            keywordSearch: keyword,
                            resultsPerPage: 10
                        },
                        headers: {
                            "X-Api-Key": NVD_API_KEY
                        },
                        timeout: 10000
                    }
                );

                if (!response.data || !response.data.vulnerabilities) {
                    console.log("⚠️ Keine Vulnerabilities erhalten.");
                    continue;
                }

                const filtered = response.data.vulnerabilities
                    .filter(v => {
                        const publishedDate = new Date(v.cve.published);
                        return publishedDate >= fiveYearsAgo;
                    })
                    .slice(0, 3)
                    .map(v => ({
                        cveId: v.cve.id,
                        description: v.cve.descriptions?.[0]?.value || "Keine Beschreibung verfügbar",
                        published: v.cve.published
                    }));

                if (filtered.length > 0) {
                    securityAlerts.push({
                        deviceName: device.name,
                        keyword,
                        alerts: filtered
                    });
                }

                // kleine Pause gegen Rate Limit
                await new Promise(r => setTimeout(r, 800));

            } catch (err) {

                if (err.response) {
                    console.error(" NVD API Fehler Status:", err.response.status);
                    console.error(" Antwort:", err.response.data);
                } else {
                    console.error(" Request Fehler:", err.message);
                }
            }
        }

        res.render("dashboard", {
            user,
            totalDevices,
            criticalCount,
            availableCount,
            upToDateCount,
            securityAlerts
        });

    } catch (err) {
        console.error(" Dashboard Fehler:", err);
        res.status(500).send("Fehler beim Laden des Dashboards");
    }
};