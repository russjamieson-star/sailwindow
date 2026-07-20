/**
 * SailWindow — Waitlist backend
 *
 * Deploy as a Web App: Deploy > New deployment > gear icon > "Web app"
 *   - Execute as: Me
 *   - Who has access: Anyone
 * Copy the resulting /exec URL into WAITLIST_SCRIPT_URL in dist/index.html
 * (and dist-v8/index.html — the two share one waitlist form promoting Atlantic
 * to Gulf visitors).
 *
 * Shared across all future editions (Atlantic now, Great Lakes/Mississippi later) —
 * each submission is tagged with an Edition column, so no new Sheet or script is
 * needed when a new edition adds its own waitlist form; just point its
 * submitWaitlist(event, '<edition>') call at the same WAITLIST_SCRIPT_URL.
 *
 * Expected POST body (client sends Content-Type: text/plain specifically to dodge
 * a CORS preflight that Apps Script Web Apps can't handle — the body itself is
 * still valid JSON; see submitWaitlist() in dist/index.html):
 *   { "edition": "atlantic", "email": "someone@example.com", "source": "sailwindow.com" }
 *
 * Appends one row per submission to Sheet1: Timestamp | Edition | Email | Source
 */
function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Sheet1');

  // Ensure header row exists (first-ever submission on a fresh sheet)
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['Timestamp', 'Edition', 'Email', 'Source']);
  }

  try {
    var data = JSON.parse(e.postData.contents);
    var edition = data.edition || '';
    var email = data.email || '';
    var source = data.source || '';

    if (email) {
      sheet.appendRow([new Date(), edition, email, source]);
    }
  } catch (err) {
    // Log malformed submissions instead of silently dropping them
    sheet.appendRow([new Date(), 'ERROR', '', String(err)]);
  }

  // The client uses mode: "no-cors" and never reads this response — it's
  // fire-and-forget — but returning valid JSON keeps this well-behaved for
  // any future caller that does read it.
  return ContentService.createTextOutput(JSON.stringify({ status: 'ok' }))
    .setMimeType(ContentService.MimeType.JSON);
}
