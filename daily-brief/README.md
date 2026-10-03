# Gulf Coast Daily Brief

A scheduled Claude agent ("Gulf Coast Daily Brief", task id `gulf-daily-brief`) runs every morning at 6 AM. It researches the coast from the southern tip of Texas around Florida to the Florida/Georgia line for:

- coastal construction affecting mariners (bridges, drawbridge schedules, channel closures, dredging)
- marina deals
- festivals
- boat shows

New items go to the Google Sheet **Daily Brief**:
https://docs.google.com/spreadsheets/d/1m8SMyFaCdjggkqF5wBmNPCmOXK1nlkHbhayWHNiCCXo/edit

A CSV copy of each day's rows is also saved in this folder (`YYYY-MM-DD.csv`).

## One-time setup (about 2 minutes)

Claude's Google Drive connection can create sheets but can't add rows to an existing one. A small Google Apps Script attached to the sheet fixes that. Until it's set up, each day's results go into a separate sheet named "Daily Brief – <date>".

1. Open the Daily Brief sheet → **Extensions → Apps Script**.
2. Delete what's there and paste in the contents of `~/.config/daily-brief/Code.gs`. It's kept outside this folder because it holds a private key, and this folder is backed up to GitHub.
3. Click **Save**, then **Deploy → New deployment → gear icon → Web app**. Set *Execute as: Me* and *Who has access: Anyone*, then click **Deploy** and approve the Google permission prompt.
4. Copy the **Web app URL** (it ends in `/exec`) and paste it into the `webapp_url` field of `~/.config/daily-brief/config.json`. Or just give it to Claude and ask it to do this.

## Columns, and the future "Captain's Daily Brief" in the app

The rows will eventually feed a Captain's Daily Brief section in Ask Captain Jim, so since 2026-10-03 each row has five extra columns that the app can read, plus an approval box:

| Column | What goes in it |
|---|---|
| Start Date / End Date | `YYYY-MM-DD`; blank if unknown or open-ended. Lets the app hide expired items. |
| Latitude / Longitude | Where the item is (town-level precision is fine), so the app can show what's near a boater. Blank if it can't be pinned down. |
| Priority | `Safety` (closures, clearance limits), `Plan Ahead` (deals, info), or `Fun` (festivals, shows). |
| Approved | Checkbox, always starts unchecked. **Tick it for rows you want boaters to see.** The app will show only approved rows. |

**Updating the receiver script (needed once, for the new columns):** open the sheet → **Extensions → Apps Script**, replace everything with the contents of `~/.config/daily-brief/Code.gs`, **Save**, then **Deploy → Manage deployments → pencil icon → Version: New version → Deploy**. The web-app URL stays the same. On its next run the agent fills in the new columns for the rows already in the sheet (from `backfill-pending.json`) and deletes that file. Until the script is updated, the sheet keeps getting the original 9 columns and the extra ones are saved only in the local CSVs.

## Notes

- The schedule runs only while the Claude desktop app is open. If the app is closed at 6 AM, the run happens the next time it opens.
- To change the time or the topics, edit the task in the app's **Scheduled** sidebar section, or ask Claude.
