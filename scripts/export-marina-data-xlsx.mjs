import fs from 'node:fs/promises';
import path from 'node:path';
import { SpreadsheetFile, Workbook } from '@oai/artifact-tool';

const sourcePath = process.argv[2] || 'dist-v6/marina_data.sheet-seed.json';
const outPath = process.argv[3] || 'dist-v6/marina_data.sheet-seed.xlsx';

const sourceJson = JSON.parse(await fs.readFile(sourcePath, 'utf8'));
const workbook = Workbook.create();

const restaurantsSheet = workbook.worksheets.add('Restaurants');
const marinasSheet = workbook.worksheets.add('Marina Summary');
const notesSheet = workbook.worksheets.add('Notes');

const restaurantHeaders = [
  'marina',
  'lat',
  'lng',
  'restaurant_name',
  'email',
  'phone',
  'address',
  'website',
  'rating',
  'google_maps',
  'partner',
  'discount_offer',
  'outreach_status',
  'offer_confirmed_at',
  'offer_notes',
];

const restaurantRows = [];
const marinaRows = [['marina', 'lat', 'lng', 'restaurant_count', 'sheet_imported_count', 'active_partner_count']];

for (const [marinaName, marinaData] of Object.entries(sourceJson)) {
  const restaurants = Array.isArray(marinaData.restaurants) ? marinaData.restaurants : [];
  let importedCount = 0;
  let activePartnerCount = 0;

  for (const restaurant of restaurants) {
    if (restaurant.email || restaurant.outreach_status) importedCount += 1;
    if (restaurant.partner && restaurant.discount_offer) activePartnerCount += 1;

    restaurantRows.push([
      marinaName,
      marinaData.lat ?? '',
      marinaData.lng ?? '',
      restaurant.name ?? '',
      restaurant.email ?? '',
      restaurant.phone ?? '',
      restaurant.address ?? '',
      restaurant.website ?? '',
      restaurant.rating ?? '',
      restaurant.google_maps ?? '',
      Boolean(restaurant.partner),
      restaurant.discount_offer ?? '',
      restaurant.outreach_status ?? '',
      restaurant.offer_confirmed_at ?? '',
      restaurant.offer_notes ?? '',
    ]);
  }

  marinaRows.push([
    marinaName,
    marinaData.lat ?? '',
    marinaData.lng ?? '',
    restaurants.length,
    importedCount,
    activePartnerCount,
  ]);
}

restaurantRows.sort((a, b) => String(a[0]).localeCompare(String(b[0])) || String(a[3]).localeCompare(String(b[3])));

restaurantsSheet.getRangeByIndexes(0, 0, restaurantRows.length + 1, restaurantHeaders.length).values = [
  restaurantHeaders,
  ...restaurantRows,
];

marinasSheet.getRangeByIndexes(0, 0, marinaRows.length, marinaRows[0].length).values = marinaRows;

notesSheet.getRange('A1:B9').values = [
  ['SailWindow restaurant seed export', ''],
  ['Source JSON', sourcePath],
  ['Generated file', outPath],
  ['Partner activation', 'Set partner to TRUE and add discount_offer. The app requires both.'],
  ['Production JSON shape', 'dist-v6/marina_data.json'],
  ['Restaurant rows', restaurantRows.length],
  ['Marinas', Object.keys(sourceJson).length],
  ['Imported outreach rows', restaurantRows.filter(row => row[4] || row[12]).length],
  ['Active partner rows', restaurantRows.filter(row => row[10] && row[11]).length],
];

restaurantsSheet.tables.add(
  `A1:O${restaurantRows.length + 1}`,
  true,
  'RestaurantsTable',
);
marinasSheet.tables.add(
  `A1:F${marinaRows.length}`,
  true,
  'MarinaSummaryTable',
);

for (const sheet of [restaurantsSheet, marinasSheet, notesSheet]) {
  sheet.showGridLines = false;
  sheet.freezePanes.freezeRows(1);
}

const headerFill = '#0F766E';
const headerFont = '#FFFFFF';
const subtleFill = '#ECFDF5';
const borderColor = '#D1D5DB';

for (const sheet of [restaurantsSheet, marinasSheet]) {
  const used = sheet.getUsedRange();
  used.format.font.name = 'Aptos';
  used.format.font.size = 10;
  used.format.borders = { preset: 'outside', style: 'thin', color: borderColor };
  const header = sheet.getRange('A1:O1');
  if (sheet === marinasSheet) {
    sheet.getRange('A1:F1').format.fill.color = headerFill;
    sheet.getRange('A1:F1').format.font.color = headerFont;
    sheet.getRange('A1:F1').format.font.bold = true;
  } else {
    header.format.fill.color = headerFill;
    header.format.font.color = headerFont;
    header.format.font.bold = true;
  }
}

restaurantsSheet.getRange(`B2:C${restaurantRows.length + 1}`).setNumberFormat('0.0000');
restaurantsSheet.getRange(`I2:I${restaurantRows.length + 1}`).setNumberFormat('0.0');
restaurantsSheet.getRange(`K2:K${restaurantRows.length + 1}`).dataValidation = {
  rule: { type: 'list', values: ['TRUE', 'FALSE'] },
};
restaurantsSheet.getRange(`L2:L${restaurantRows.length + 1}`).format.fill.color = subtleFill;
restaurantsSheet.getRange(`N2:N${restaurantRows.length + 1}`).setNumberFormat('yyyy-mm-dd');

marinasSheet.getRange(`B2:C${marinaRows.length}`).setNumberFormat('0.0000');
marinasSheet.getRange(`D2:F${marinaRows.length}`).setNumberFormat('#,##0');

notesSheet.getRange('A1:B1').merge();
notesSheet.getRange('A1').values = [['SailWindow Restaurant Seed Export']];
notesSheet.getRange('A1').format.fill.color = headerFill;
notesSheet.getRange('A1').format.font.color = headerFont;
notesSheet.getRange('A1').format.font.bold = true;
notesSheet.getRange('A1').format.font.size = 14;
notesSheet.getRange('A2:A9').format.fill.color = subtleFill;
notesSheet.getRange('A2:A9').format.font.bold = true;
notesSheet.getRange('A1:B9').format.borders = { preset: 'outside', style: 'thin', color: borderColor };

restaurantsSheet.getRange('A:A').format.columnWidth = 28;
restaurantsSheet.getRange('B:C').format.columnWidth = 11;
restaurantsSheet.getRange('D:D').format.columnWidth = 34;
restaurantsSheet.getRange('E:E').format.columnWidth = 32;
restaurantsSheet.getRange('F:F').format.columnWidth = 16;
restaurantsSheet.getRange('G:G').format.columnWidth = 44;
restaurantsSheet.getRange('H:J').format.columnWidth = 34;
restaurantsSheet.getRange('K:K').format.columnWidth = 10;
restaurantsSheet.getRange('L:L').format.columnWidth = 34;
restaurantsSheet.getRange('M:O').format.columnWidth = 20;
restaurantsSheet.getRange(`A1:O${restaurantRows.length + 1}`).format.wrapText = true;

marinasSheet.getRange('A:A').format.columnWidth = 34;
marinasSheet.getRange('B:F').format.columnWidth = 18;
notesSheet.getRange('A:A').format.columnWidth = 24;
notesSheet.getRange('B:B').format.columnWidth = 72;
notesSheet.getRange('A1:B9').format.wrapText = true;

await fs.mkdir(path.dirname(outPath), { recursive: true });

const tableCheck = await workbook.inspect({
  kind: 'table',
  sheetId: 'Restaurants',
  range: 'A1:O8',
  include: 'values',
  tableMaxRows: 8,
  tableMaxCols: 15,
  maxChars: 4000,
});
console.log(tableCheck.ndjson);

const errorCheck = await workbook.inspect({
  kind: 'match',
  searchTerm: '#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A',
  options: { useRegex: true, maxResults: 50 },
  summary: 'final formula error scan',
  maxChars: 2000,
});
console.log(errorCheck.ndjson);

const preview = await workbook.render({
  sheetName: 'Restaurants',
  range: 'A1:O12',
  scale: 1,
  format: 'png',
});
await fs.writeFile('/private/tmp/sailwindow-restaurant-seed-preview.png', new Uint8Array(await preview.arrayBuffer()));

const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outPath);
console.log(`Saved ${path.resolve(outPath)}`);
