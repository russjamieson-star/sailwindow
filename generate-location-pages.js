#!/usr/bin/env node
/**
 * Generate 35 location-specific pages for sailwindow.com/locations/[slug]
 * Each page pre-selects the location, has unique title/meta tags for SEO
 */

const fs = require('fs');
const path = require('path');

const STATIONS = {
  "key-west": { name: "Key West, FL", stationId: "8724580" },
  "naples": { name: "Naples, FL", stationId: "8725110" },
  "fort-myers": { name: "Fort Myers, FL", stationId: "8725520" },
  "clearwater": { name: "Clearwater Beach, FL", stationId: "8726724" },
  "st-pete": { name: "St. Petersburg, FL", stationId: "8726520" },
  "tampa-hooker": { name: "Tampa — Hooker Point", stationId: "8726667" },
  "tampa-egmont": { name: "Tampa — Egmont Key", stationId: "8726347" },
  "tampa-gandy": { name: "Tampa — Gandy Bridge", stationId: "8726607" },
  "cedar-key": { name: "Cedar Key, FL", stationId: "8727520" },
  "apalachicola": { name: "Apalachicola, FL", stationId: "8728690" },
  "panama-city": { name: "Panama City, FL", stationId: "8729108" },
  "rocky-bayou": { name: "Niceville — Rocky Bayou", stationId: "8729479" },
  "niceville": { name: "Niceville — Valparaiso", stationId: "8729501" },
  "destin": { name: "Destin — East Pass", stationId: "8729511" },
  "pensacola": { name: "Pensacola, FL", stationId: "8729840" },
  "pensacola-beach": { name: "Pensacola Beach Pier", stationId: "8729807" },
  "dauphin-island": { name: "Dauphin Island, AL", stationId: "8735180" },
  "mobile": { name: "Mobile State Docks, AL", stationId: "8737048" },
  "pascagoula": { name: "Pascagoula, MS", stationId: "8741533" },
  "biloxi": { name: "Biloxi, MS", stationId: "8744117" },
  "bay-waveland": { name: "Bay Waveland, MS", stationId: "8747437" },
  "sw-pass": { name: "SW Pass, LA", stationId: "8760922" },
  "grand-isle": { name: "Grand Isle, LA", stationId: "8761724" },
  "port-fourchon": { name: "Port Fourchon, LA", stationId: "8762075" },
  "new-orleans": { name: "New Orleans, LA", stationId: "8761927" },
  "calcasieu-pass": { name: "Calcasieu Pass, LA", stationId: "8768094" },
  "sabine-pass": { name: "Sabine Pass, TX", stationId: "8770570" },
  "port-arthur": { name: "Port Arthur, TX", stationId: "8770475" },
  "galveston": { name: "Galveston Pier 21, TX", stationId: "8771450" },
  "freeport": { name: "Freeport, TX", stationId: "8772447" },
  "matagorda": { name: "Matagorda City, TX", stationId: "8773146" },
  "rockport": { name: "Rockport, TX", stationId: "8774770" },
  "aransas-pass": { name: "Aransas Pass, TX", stationId: "8775241" },
  "corpus-christi": { name: "Corpus Christi, TX", stationId: "8775870" },
  "port-isabel": { name: "Port Isabel, TX", stationId: "8779770" }
};

const baseHtml = fs.readFileSync('./SailWindow-V6.html', 'utf8');

// Ensure dist/locations exists
const locDir = path.join('./dist/locations');
if (!fs.existsSync(locDir)) {
  fs.mkdirSync(locDir, { recursive: true });
}

// Generate one page per station
let sitemapEntries = [];

Object.entries(STATIONS).forEach(([slug, { name, stationId }]) => {
  const title = `${name} Sailing Conditions Today | SailWindow`;
  const description = `Live wind, tide, and sailability score for ${name}. Best sailing window updated hourly from NWS and NOAA data.`;

  // Inject unique title and meta tags
  let html = baseHtml
    .replace(
      /<title>SailWindow — Gulf Coast Sailing Conditions<\/title>/,
      `<title>${title}</title>`
    )
    .replace(
      /(<meta property="og:description" content=")Live wind, tide, and sailability scores for your marina, from NWS and NOAA data\.(">)/,
      `$1${description}$2`
    )
    .replace(
      /(<meta name="description" content=")Live sailing conditions[^"]*(")/,
      `$1${description}$2`
    )
    .replace(
      /(<meta property="og:url" content=")https:\/\/sailwindow\.com\/(">)/,
      `$1https://sailwindow.com/locations/${slug}$2`
    )
    // Add inline script to pre-select the station on page load
    .replace(
      /<\/head>/,
      `<script>
  window.PRESELECT_LOCATION = "${slug}";
</script>
</head>`
    );

  // Write the file
  fs.writeFileSync(path.join(locDir, `${slug}.html`), html, 'utf8');
  console.log(`✓ ${slug}`);

  sitemapEntries.push(`  <url>
    <loc>https://sailwindow.com/locations/${slug}</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>`);
});

// Update sitemap
let sitemap = fs.readFileSync('./dist/sitemap.xml', 'utf8');
const newSitemap = sitemap.replace(
  /  <\/urlset>/,
  sitemapEntries.join('\n') + '\n  </urlset>'
);
fs.writeFileSync('./dist/sitemap.xml', newSitemap, 'utf8');

// Also sync to dist-v6
fs.cpSync(locDir, path.join('./dist-v6/locations'), { recursive: true });
fs.writeFileSync('./dist-v6/sitemap.xml', newSitemap, 'utf8');

console.log(`\n✨ Generated ${Object.keys(STATIONS).length} location pages`);
console.log('✨ Updated sitemap.xml with all locations');
