const Parser = require("rss-parser");
const parser = new Parser();

const BSI_FEED = "https://www.bsi.bund.de/SiteGlobals/Functions/RSSFeed/RSSGenerator_Sicherheitshinweise.xml";

async function getSecurityAdvisories() {
    try {
        const feed = await parser.parseURL(BSI_FEED);

        return feed.items.map(item => ({
            title: item.title,
            link: item.link,
            pubDate: item.pubDate,
            content: item.contentSnippet
        }));

    } catch (error) {
        console.error("BSI Feed Fehler:", error);
        return [];
    }
}

module.exports = {
    getSecurityAdvisories
};