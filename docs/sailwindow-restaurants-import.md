# SailWindow Restaurant Import

This project already has an app seed shape for marina restaurants in
`dist-v6/marina_data.json`. Do not create a parallel format.

The app expects this JSON shape:

```json
{
  "Marina Name": {
    "lat": 29.5443,
    "lng": -95.0191,
    "restaurants": [
      {
        "name": "Restaurant Name",
        "address": "123 Dock St, City",
        "phone": "(555) 555-5555",
        "website": "https://example.com/",
        "rating": 4.5,
        "google_maps": "",
        "partner": false,
        "discount_offer": ""
      }
    ]
  }
}
```

The SailWindow partner switch is already built into the app:

- `partner: true`
- `discount_offer: "10% off for SailWindow crews"`

Both must be present for the restaurant to show as a featured partner offer.
The converter also keeps `email`, `outreach_status`, `offer_confirmed_at`, and
`offer_notes` on each restaurant row so outreach and confirmed offers can be
tracked without changing the app display code.

## Source Sheet

Current Google Sheet: `Sailwindow Restajurants`

Current tab: `Mailmeteor`

Current clean columns:

1. `email`
2. `restaurant_name`
3. `marina_name`
4. `phone`
5. `address`
6. `website`
7. `rating`
8. `Campaign status`

The live `Mailmeteor` tab currently includes an extra `first_name` / greeting
column after `email`, usually set to `there`, and also contains one repeated
header row in the middle. The converter handles both the clean layout and the
Mailmeteor layout.

## Run The Converter

For a downloaded CSV export:

```sh
node scripts/convert-sailwindow-restaurants.js \
  --input ~/Downloads/Sailwindow\ Restajurants.csv \
  --out dist-v6/marina_data.sheet-seed.json
```

For a Google Sheets CSV export URL or ID, the sheet must be readable without an
interactive login:

```sh
node scripts/convert-sailwindow-restaurants.js \
  --sheet-id 19U9qNCN5bK6Xk1oEnQNCnJi7XY9fo9da37OWuuGl28Y \
  --gid 97532774 \
  --out dist-v6/marina_data.sheet-seed.json
```

By default, the converter merges into the existing `dist-v6/marina_data.json`
so marina coordinates are preserved. Sheet restaurants replace the restaurant
list for matching marinas, and marinas not present in the sheet are retained
from the base seed.

Use `--replace-only` to output only marinas present in the sheet.

Use `--include-skipped` to include rows marked `SKIPPED`.

## Deploying A Seed

After reviewing `dist-v6/marina_data.sheet-seed.json`, copy or rename it to the
seed path the app currently fetches:

```sh
cp dist-v6/marina_data.sheet-seed.json dist-v6/marina_data.json
```

When deploying a changed `marina_data.json`, bump `SW_DB_VER` in
`dist-v6/index.html` so browser localStorage refreshes the cached restaurant
database.
