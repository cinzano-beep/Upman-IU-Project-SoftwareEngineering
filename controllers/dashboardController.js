const db = require("../config/db");
const axios = require("axios");

const NVD_API_KEY = process.env.NVD_API_KEY;

if (!NVD_API_KEY) {
    console.error(" NVD_API_KEY ist NICHT gesetzt!");
} else {
    console.log(" NVD_API_KEY wurde geladen.");
}

/*  Keyword + CPE Mapping */

function detectPlatform(device) {
    const combined = (
        (device.name || "") + " " +
        (device.type || "") + " " +
        (device.software_version || "")
    ).toLowerCase();

    if (combined.includes("windows 11")) return "windows11";
    if (combined.includes("windows 10")) return "windows10";
    if (combined.includes("windows")) return "windows";

    if (combined.includes("macos") || combined.includes("os x")) return "macos";

    if (combined.includes("iphone") || combined.includes("ios")) return "ios";
    if (combined.includes("ipad")) return "ipad";

    if (combined.includes("android") || combined.includes("samsung") || combined.includes("huawei")) return "android";

    return "unknown";
}

/*  Dashboard */

exports.dashboard = async (req, res) => {

    const user = req.session.user;
    if (!user) return res.redirect("/login");

    try {

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

        const totalDevices = devices.length;
        const criticalCount = devices.filter(d => d.update_status === "critical").length;
        const availableCount = devices.filter(d => d.update_status === "update-available").length;
        const upToDateCount = devices.filter(d => d.update_status === "up-to-date").length;

        let securityAlerts = [];

        if (!NVD_API_KEY) {
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

        for (const device of devices) {

            const platform = detectPlatform(device);
            console.log(" Plattform erkannt:", platform);

            let apiParams = { resultsPerPage: 20 };

            /* ===== CPE Mapping ===== */

            switch (platform) {

                case "windows11":
                    apiParams.cpeName = "cpe:2.3:o:microsoft:windows_11:-:*:*:*:*:*:*:*";
                    break;
            
                case "windows10":
                    apiParams.cpeName = "cpe:2.3:o:microsoft:windows_10:-:*:*:*:*:*:*:*";
                    break;
            
                case "windows":
                    apiParams.keywordSearch = "Microsoft Windows";
                    break;

                case "macos":
                    apiParams.keywordSearch = "Apple macOS";
                    break;

                case "ios":
                    apiParams.keywordSearch = "Apple iOS";
                    break;

                case "ipad":
                    apiParams.keywordSearch = "Apple iPadOS";
                    break;

                case "android":
                    apiParams.keywordSearch = "Android";
                    break;

                default:
                    apiParams.keywordSearch = device.software_version || device.name;
            }

            try {

                const response = await axios.get(
                    "https://services.nvd.nist.gov/rest/json/cves/2.0",
                    {
                        params: apiParams,
                        headers: {
                            "X-Api-Key": NVD_API_KEY
                        },
                        timeout: 10000
                    }
                );

                const vulnerabilities = response.data.vulnerabilities || [];

                const filtered = vulnerabilities
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
                        platform,
                        alerts: filtered
                    });
                }

                // Rate limit protection
                await new Promise(r => setTimeout(r, 800));

            } catch (err) {

                if (err.response) {
                    console.error(" NVD Fehler:", err.response.status);
                    console.error(err.response.data);
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