#!/usr/bin/env node
/*
 * Convert the "Sailwindow Restajurants" Google Sheet CSV export into the
 * SailWindow app's marina_data.json seed shape.
 *
 * Expected current clean sheet columns:
 *   A email
 *   B restaurant name
 *   C marina
 *   D phone
 *   E address
 *   F website
 *   G rating
 *   H outreach/campaign status (optional)
 *
 * The current Mailmeteor tab also has a greeting column after email:
 *   A email, B first_name, C restaurant name, D marina, ...
 *
 * The app expects:
 * {
 *   "Marina Name": {
 *     "lat": 0,
 *     "lng": 0,
 *     "restaurants": [
 *       {
 *         "name": "...",
 *         "address": "...",
 *         "phone": "...",
 *         "website": "...",
 *         "rating": 4.5,
 *         "google_maps": "",
 *         "partner": false,
 *         "discount_offer": ""
 *       }
 *     ]
 *   }
 * }
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const DEFAULT_SHEET_ID = '19U9qNCN5bK6Xk1oEnQNCnJi7XY9fo9da37OWuuGl28Y';
const DEFAULT_BASE = 'dist-v6/marina_data.json';
const DEFAULT_OUT = 'dist-v6/marina_data.sheet-seed.json';

function usage() {
  console.log(`Usage:
  node scripts/convert-sailwindow-restaurants.js --input restaurants.csv [--base dist-v6/marina_data.json] [--out dist-v6/marina_data.sheet-seed.json]
  node scripts/convert-sailwindow-restaurants.js --sheet-id ${DEFAULT_SHEET_ID} --gid 97532774 [--out dist-v6/marina_data.sheet-seed.json]

Options:
  --input <path>       CSV exported from the Google Sheet.
  --sheet-id <id>     Google Sheets spreadsheet ID. Requires the sheet/export URL to be readable.
  --gid <gid>         Sheet tab gid for CSV export. Defaults to the current Mailmeteor gid.
  --base <path>       Existing marina_data.json used for lat/lng and merge shape.
  --out <path>        Output JSON path.
  --include-skipped   Include rows whose campaign status starts with "SKIPPED".
  --replace-only      Only output marinas present in the sheet instead of merging with base.
  --pretty            Pretty-print JSON. Enabled by default.
  --compact           Compact JSON.
`);
}

function parseArgs(argv) {
  const args = {
    base: DEFAULT_BASE,
    out: DEFAULT_OUT,
    gid: '97532774',
    includeSkipped: false,
    replaceOnly: false,
    pretty: true,
  };

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      args.help = true;
    } else if (arg === '--include-skipped') {
      args.includeSkipped = true;
    } else if (arg === '--replace-only') {
      args.replaceOnly = true;
    } else if (arg === '--pretty') {
      args.pretty = true;
    } else if (arg === '--compact') {
      args.pretty = false;
    } else if (arg.startsWith('--')) {
      const key = arg.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      const value = argv[i + 1];
      if (!value || value.startsWith('--')) {
        throw new Error(`Missing value for ${arg}`);
      }
      args[key] = value;
      i += 1;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return args;
}

function readCsvFromUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        readCsvFromUrl(res.headers.location).then(resolve, reject);
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error(`CSV download failed with HTTP ${res.statusCode}`));
        res.resume();
        return;
      }
      res.setEncoding('utf8');
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => resolve(body));
    }).on('error', reject);
  });
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];

    if (quoted) {
      if (ch === '"' && next === '"') {
        field += '"';
        i += 1;
      } else if (ch === '"') {
        quoted = false;
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (ch !== '\r') {
      field += ch;
    }
  }

  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

function normalizeText(value) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

function parseRating(value) {
  const cleaned = normalizeText(value);
  if (!cleaned) return '';
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : '';
}

function normalizeWebsite(value) {
  const website = normalizeText(value);
  if (!website) return '';
  if (/^https?:\/\//i.test(website)) return website;
  return `https://${website}`;
}

function normalizeStatus(value) {
  return normalizeText(value).toUpperCase();
}

function restaurantKey(row) {
  return [
    normalizeText(row.name).toLowerCase(),
    normalizeText(row.address).toLowerCase(),
    normalizeText(row.phone).replace(/\D/g, ''),
  ].join('|');
}

function isHeaderRow(row) {
  const lower = row.map(cell => normalizeText(cell).toLowerCase());
  return lower.includes('restaurant_name') || lower.includes('marina_name') || lower.includes('restaurant name');
}

function looksLikePhone(value) {
  return /\(?\d{3}\)?[\s.-]*\d{3}[\s.-]*\d{4}/.test(normalizeText(value));
}

function looksLikeUrl(value) {
  return /^(https?:\/\/|www\.)/i.test(normalizeText(value));
}

function looksLikeRating(value) {
  const text = normalizeText(value);
  if (!text) return true;
  const num = Number(text);
  return Number.isFinite(num) && num >= 0 && num <= 5;
}

function extractRecord(row) {
  const explicitGreeting = normalizeText(row[1]).toLowerCase() === 'there';
  const cleanLayout = looksLikeUrl(row[5]) && looksLikeRating(row[6]);
  const mailmeteorLayout = looksLikeUrl(row[6]) && looksLikeRating(row[7]);
  const hasGreetingColumn = explicitGreeting || (mailmeteorLayout && !cleanLayout);
  const offset = hasGreetingColumn ? 1 : 0;

  return {
    email: row[0],
    name: row[1 + offset],
    marina: row[2 + offset],
    phone: row[3 + offset],
    address: row[4 + offset],
    website: row[5 + offset],
    rating: row[6 + offset],
    status: row[7 + offset],
  };
}

function convertRows(rows, includeSkipped) {
  const grouped = {};
  const stats = {
    rowsRead: rows.length,
    rowsImported: 0,
    rowsSkipped: 0,
    duplicateRows: 0,
    headerRows: 0,
  };
  const seen = new Set();

  for (const row of rows) {
    if (!row.some(cell => normalizeText(cell))) continue;
    if (isHeaderRow(row)) {
      stats.headerRows += 1;
      continue;
    }

    const record = extractRecord(row);
    const status = normalizeStatus(record.status);
    if (!includeSkipped && status.startsWith('SKIPPED')) {
      stats.rowsSkipped += 1;
      continue;
    }

    const restaurant = {
      name: normalizeText(row[2]),
      address: normalizeText(record.address),
      phone: normalizeText(record.phone),
      website: normalizeWebsite(record.website),
      rating: parseRating(record.rating),
      google_maps: '',
      partner: false,
      discount_offer: '',
      email: normalizeText(record.email),
      outreach_status: status,
      offer_confirmed_at: '',
      offer_notes: '',
    };
    restaurant.name = normalizeText(record.name);
    const marinaName = normalizeText(record.marina);

    if (!restaurant.name || !marinaName) {
      stats.rowsSkipped += 1;
      continue;
    }

    const key = `${marinaName.toLowerCase()}|${restaurantKey(restaurant)}`;
    if (seen.has(key)) {
      stats.duplicateRows += 1;
      continue;
    }
    seen.add(key);

    if (!grouped[marinaName]) {
      grouped[marinaName] = { lat: null, lng: null, restaurants: [] };
    }
    grouped[marinaName].restaurants.push(restaurant);
    stats.rowsImported += 1;
  }

  return { grouped, stats };
}

function loadBase(basePath) {
  if (!basePath || !fs.existsSync(basePath)) return {};
  return JSON.parse(fs.readFileSync(basePath, 'utf8'));
}

function mergeSeed(base, sheetData, replaceOnly) {
  const output = replaceOnly ? {} : JSON.parse(JSON.stringify(base));

  for (const [marinaName, marinaData] of Object.entries(sheetData)) {
    const existing = base[marinaName] || {};
    output[marinaName] = {
      lat: existing.lat ?? marinaData.lat,
      lng: existing.lng ?? existing.lon ?? marinaData.lng,
      restaurants: marinaData.restaurants,
    };
  }

  return output;
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    usage();
    return;
  }

  let csvText = '';
  if (args.input) {
    csvText = fs.readFileSync(args.input, 'utf8');
  } else {
    const sheetId = args.sheetId || DEFAULT_SHEET_ID;
    const gid = args.gid || '0';
    const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
    csvText = await readCsvFromUrl(url);
  }

  const rows = parseCsv(csvText);
  const { grouped, stats } = convertRows(rows, args.includeSkipped);
  const base = loadBase(args.base);
  const output = mergeSeed(base, grouped, args.replaceOnly);

  const outPath = path.resolve(args.out);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(output, null, args.pretty ? 2 : 0) + '\n');

  const unknownCoords = Object.entries(output)
    .filter(([, data]) => data.lat == null || data.lng == null)
    .map(([name]) => name);

  console.log(`Wrote ${outPath}`);
  console.log(`Rows imported: ${stats.rowsImported}`);
  console.log(`Rows skipped: ${stats.rowsSkipped}`);
  console.log(`Duplicate rows ignored: ${stats.duplicateRows}`);
  console.log(`Header rows ignored: ${stats.headerRows}`);
  console.log(`Marinas from sheet: ${Object.keys(grouped).length}`);
  if (unknownCoords.length) {
    console.log(`Marinas missing lat/lng: ${unknownCoords.length}`);
    console.log(unknownCoords.slice(0, 20).join('\n'));
    if (unknownCoords.length > 20) console.log(`...and ${unknownCoords.length - 20} more`);
  }
}

main().catch(err => {
  console.error(err.message);
  process.exit(1);
});
