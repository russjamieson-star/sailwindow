const fs = require('fs');
const path = require('path');

const STATIONS = {
  "key-west": { name: "Key West, FL" },
  "marathon": { name: "Marathon, FL" },
  "islamorada": { name: "Islamorada, FL" },
  "miami": { name: "Miami Beach, FL" },
  "fort-lauderdale": { name: "Fort Lauderdale, FL" },
  "west-palm-beach": { name: "West Palm Beach, FL" },
  "jupiter": { name: "Jupiter, FL" },
  "stuart": { name: "Stuart, FL" },
  "fort-pierce": { name: "Fort Pierce, FL" },
  "vero-beach": { name: "Vero Beach, FL" },
  "cocoa": { name: "Cocoa, FL" },
  "port-canaveral": { name: "Port Canaveral, FL" },
  "daytona": { name: "Daytona Beach, FL" },
  "st-augustine": { name: "St. Augustine, FL" },
  "jacksonville": { name: "Jacksonville, FL" },
  "fernandina": { name: "Fernandina Beach, FL" },
  "marco-island": { name: "Marco Island, FL" },
  "naples": { name: "Naples, FL" },
  "fort-myers": { name: "Fort Myers, FL" },
  "punta-gorda": { name: "Punta Gorda, FL" },
  "sarasota": { name: "Sarasota, FL" },
  "clearwater": { name: "Clearwater Beach, FL" },
  "st-pete": { name: "St. Petersburg, FL" },
  "tampa-hooker": { name: "Tampa — Hooker Point" },
  "tampa-egmont": { name: "Tampa — Egmont Key" },
  "tampa-gandy": { name: "Tampa — Gandy Bridge" },
  "cedar-key": { name: "Cedar Key, FL" },
  "apalachicola": { name: "Apalachicola, FL" },
  "port-st-joe": { name: "Port St. Joe, FL" },
  "panama-city": { name: "Panama City, FL" },
  "rocky-bayou": { name: "Niceville — Rocky Bayou" },
  "niceville": { name: "Niceville — Valparaiso" },
  "destin": { name: "Destin — East Pass" },
  "pensacola": { name: "Pensacola, FL" },
  "pensacola-beach": { name: "Pensacola Beach Pier" },
  "dauphin-island": { name: "Dauphin Island, AL" },
  "mobile": { name: "Mobile State Docks, AL" },
  "pascagoula": { name: "Pascagoula, MS" },
  "biloxi": { name: "Biloxi, MS" },
  "bay-waveland": { name: "Bay Waveland, MS" },
  "sw-pass": { name: "SW Pass, LA" },
  "grand-isle": { name: "Grand Isle, LA" },
  "port-fourchon": { name: "Port Fourchon, LA" },
  "new-orleans": { name: "New Orleans, LA" },
  "calcasieu-pass": { name: "Calcasieu Pass, LA" },
  "sabine-pass": { name: "Sabine Pass, TX" },
  "port-arthur": { name: "Port Arthur, TX" },
  "port-bolivar": { name: "Port Bolivar, TX" },
  "kemah": { name: "Kemah / Clear Lake, TX" },
  "galveston": { name: "Galveston Pier 21, TX" },
  "freeport": { name: "Freeport, TX" },
  "port-lavaca": { name: "Port Lavaca, TX" },
  "matagorda": { name: "Matagorda City, TX" },
  "rockport": { name: "Rockport, TX" },
  "aransas-pass": { name: "Aransas Pass, TX" },
  "port-aransas": { name: "Port Aransas, TX" },
  "corpus-christi": { name: "Corpus Christi, TX" },
  "port-mansfield": { name: "Port Mansfield, TX" },
  "port-isabel": { name: "Port Isabel, TX" },
  "south-padre-island": { name: "South Padre Island, TX" }
};

let entries = [];
Object.keys(STATIONS).forEach(slug => {
  entries.push(`  <url>
    <loc>https://sailwindow.com/locations/${slug}</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>`);
});

const sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://sailwindow.com/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://sailwindow.com/SailWindow-Instructions</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
${entries.join('\n')}
</urlset>`;

fs.writeFileSync('./dist/sitemap.xml', sitemapContent, 'utf8');
fs.writeFileSync('./dist-v6/sitemap.xml', sitemapContent, 'utf8');

console.log(`✨ Updated sitemap with ${entries.length} location pages`);
