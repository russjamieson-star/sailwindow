// Captain's Brief feed for the Ask Captain Jim app.
//
// Reads the "Daily Brief" Google Sheet and returns, as JSON, only the rows Russ has
// ticked in the Approved column whose End Date hasn't passed. Unapproved rows never
// leave Google. The app doesn't call this directly: the askcaptainjim-weather Worker
// fetches it at /brief and caches it for 15 minutes.
//
// One-time setup (Apps Script editor, signed in as russjamieson@gmail.com):
//   1. script.google.com → New project → paste this file → Save. Name it "Captain's Brief feed".
//   2. Deploy → New deployment → type "Web app".
//      Execute as: Me.  Who has access: Anyone.  → Deploy, then approve the permission prompt.
//   3. Copy the Web app URL (ends in /exec) and give it to Claude, who sets it as the
//      Worker's BRIEF_SCRIPT_URL.
// After editing this script later: Deploy → Manage deployments → edit → Version: New version,
// so the same URL keeps working.

const SHEET_ID = '1m8SMyFaCdjggkqF5wBmNPCmOXK1nlkHbhayWHNiCCXo';
const TZ = 'America/Chicago';

function doGet() {
  const rows = SpreadsheetApp.openById(SHEET_ID).getSheets()[0].getDataRange().getValues();
  const head = rows.shift().map(h => String(h).trim());
  const col = name => head.indexOf(name);
  const day = v => v instanceof Date ? Utilities.formatDate(v, TZ, 'yyyy-MM-dd') : String(v || '').trim();
  const text = v => String(v == null ? '' : v).trim();
  const num = v => (v === '' || v == null || isNaN(Number(v))) ? null : Number(v);
  const today = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd');

  const items = rows
    .filter(r => r[col('Approved')] === true || text(r[col('Approved')]).toUpperCase() === 'TRUE')
    .map(r => ({
      found: day(r[col('Date Found')]),
      category: text(r[col('Category')]),
      state: text(r[col('State')]),
      location: text(r[col('Location')]),
      item: text(r[col('Item')]),
      details: text(r[col('Details')]),
      when: text(r[col('When')]),
      source: text(r[col('Source')]),
      notes: text(r[col('Notes')]),
      start: day(r[col('Start Date')]),
      end: day(r[col('End Date')]),
      lat: num(r[col('Latitude')]),
      lon: num(r[col('Longitude')]),
      priority: text(r[col('Priority')]) || 'Plan Ahead',
    }))
    .filter(i => i.item && (!i.end || i.end >= today));

  return ContentService
    .createTextOutput(JSON.stringify({ updated: new Date().toISOString(), today, items }))
    .setMimeType(ContentService.MimeType.JSON);
}
