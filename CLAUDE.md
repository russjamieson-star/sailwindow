# SailWindow Project

## Location
Project is on the Desktop (non-standard): `/Users/howardshellabarge/Desktop/SailWindow/`

## Two Products
SailWindow is now two separate editions, each its own subscription product:
- **Gulf Edition** (live, primary) — `dist/index.html` — Texas to the Florida Keys, 35 NOAA stations. Also covers both of Florida's coastlines internally (hero badge: "FL Gulf & Atlantic Coasts" — this is *not* the same thing as the Atlantic Edition below; the wording was fixed 2026-07-19 after it read as if the two products overlapped).
- **Atlantic Edition** (in development, not yet deployed) — `dist-atlantic/index.html` — Georgia to Maine, 21 NOAA stations, 45 curated marinas. See "Atlantic Edition" section below for details and open items.

## Key Files
- `dist/index.html` — Gulf edition production build (primary)
- `dist-v8/index.html` — mirrors dist/index.html (keep in sync)
- `dist-atlantic/index.html` — Atlantic edition fork (local only, not yet deployed)
- `inject_light_hero.py` — hero replacement injection script
- `dist-v6/index.html` — older Gulf V6 build (separate)

## Deployment
```
cd /Users/howardshellabarge/Desktop/SailWindow
npx wrangler pages deploy dist --project-name=sailwindow --branch main
```
Live at: **sailwindow.com** (Cloudflare Pages)

Atlantic Edition has no Cloudflare Pages project or subdomain yet — `dist-atlantic/` only exists locally. Deploying it (new Pages project + `atlantic.sailwindow.com` DNS) is an open item.

## Backup
Standing rule: treat `~/Desktop/SailWindow` as the only place edits happen. At the end of any session with code changes, back up to both of the following.

- **GitHub (primary, full mirror):** `~/Projects/SailWindow`, remote `git@github.com-sailwindow:russjamieson-star/sailwindow.git`. This is a real git repo and mirrors everything, including media (App Hero, Photos videos, etc.) — rsync Desktop → this folder (never edit it directly), `git status --short` to sanity-check the diff before committing, then commit and push.
- **Google Drive (secondary, code/docs only):** the **"SailWindow BU"** folder — https://drive.google.com/drive/folders/1_JT5-Z5WhT5uI_KBFio4NHkJo4Gv-cML — holds the deployable build + scripts + docs (not the large media folders, which already have full-fidelity backup via GitHub). **Note (2026-07-19):** this folder lives under the **russjamieson@gmail.com** account (the 5TB personal Drive, and the account Claude's Google Drive connector is authenticated as) — not russjamieson@sailwindow.com, and not the same account synced locally to this Mac's `Google Drive` folder (that's why it wasn't found there). Back it up via Claude's Google Drive connector (upload straight to folder ID `1_JT5-Z5WhT5uI_KBFio4NHkJo4Gv-cML`), not the local Mac folder.
- **Deprecated — do not use:** the old `SailWindow` Drive folder at https://drive.google.com/drive/folders/14tfWjXYcw08ejy_uz_ORMJlO28qM-YZM is stale and no longer the backup target.

Known gotcha: a naive Desktop → Projects overwrite once silently reverted a shipped feature (the "Eat" button, 2026-07-05) because the two folders had diverged. Always diff before committing, never assume they match.

## Hero Overlay (Gulf edition, `dist/index.html`)
- Element: `#sw-hero-overlay` (position:fixed, inset:0, z-index:600, overflow-y:auto, display:none) — full-viewport and internally scrollable. Anything placed as a DOM sibling *after* its closing tag renders behind it while it's showing, i.e. invisible. Content meant to be seen by new visitors must live inside this element.
- Theme: Light — `linear-gradient(135deg, #f0f7fc, #d4e9ff)`
- CSS prefix: `hw-` (hw-card, hw-feature-grid, hw-trust-badge, etc.)
- All hero CSS scoped to `#sw-hero-overlay`
- Font Awesome 6.5.0 loaded from cdnjs (added to `<head>`)
- Shown to new visitors via `initHeroCheck()` in DOMContentLoaded
- localStorage keys: `sailwindow.trial.start`, `sailwindow.subscription`
- **Atlantic Edition promo (added 2026-07-19):** a "Coming Soon: Atlantic Edition" banner sits as the first child inside `#sw-hero-overlay` (across the top, above `#sailwindow-hero`), and an `#atlantic-waitlist` signup form sits right after the hero content closes. The banner's "Get Notified" button anchor-links to the form. The waitlist form (`action="#" method="POST"`) has no real backend yet — see TODO.md. Its card icon is a Font Awesome ship (`fa-ship`, brand blue) — not the wave emoji, which read too much like the Hokusai "Great Wave."

## Hero CTAs
- `heroStartTrial()` — "Check Your Window — Free for 7 Days →"
- `heroSubscribe()` — "Subscribe Now"
- `heroRestoreAccess()` — "Already a subscriber? Restore access →"

## Pricing
Each edition is its own subscription, plus a combined bundle:
- **Gulf or Atlantic alone:** $5.99/mo or $49/yr (7-day free trial), same structure on both editions.
- **Bundle (both editions):** $10/mo flat — one subscription for Gulf + Atlantic. Surfaced as a third "Best Value" price card in the subscribe modal on both sites, plus in the hero pricing bar and the Atlantic waitlist copy.
- Stripe Payment Links: `STRIPE_MONTHLY` / `STRIPE_ANNUAL` (per-edition) and `STRIPE_BUNDLE` (shared — use the identical link value in both `dist/index.html` and `dist-atlantic/index.html`). **Atlantic's monthly/annual links currently still point at Gulf's real Stripe links (fork copy-paste, not yet fixed) and `STRIPE_BUNDLE` is an unset `"#"` placeholder in both files** — see TODO.md.
- **No shared entitlement backend.** Gulf and Atlantic are separate subdomains with separate localStorage, so a bundle subscriber must tap "Activate" once on each site after paying. The checkout flow explains this in `sub-activate-note`. A real fix would need a small shared verification backend.

## App Coverage
### Gulf Edition
- 48 drawbridges in the Bridge Schedules reference (`BRIDGE_DATA`): TX/LA/MS/AL, FL Panhandle, FL Gulf ICW, FL Atlantic ICW
- 35 verified NOAA stations, Port Isabel TX to Key West FL
- 80+ marinas (Port Aransas to Cape Canaveral)
- Weather: NOAA + ECMWF
- Features: Sailing Window, Bridges, Marinas, Dining, 7-Day Forecast, Cruiser's Log

### Atlantic Edition (in development)
- 21 verified NOAA Tides & Currents stations, Georgia to Maine, grouped into 6 legs
- 45 curated marinas (20-mile/daysail spacing + top-rated filter; 10 of 45 geocoded to town-center precision, rest exact street address via US Census Bureau geocoder)
- `DRAWBRIDGES` (nearby-bridges widget): 15 real ICW drawbridges, GA → NJ, sourced from Russ's `atlantic_icw_drawbridges.xls`
- `BRIDGE_DATA` (Bridge Schedules reference panel): **still the old Gulf database** — not yet replaced, see TODO.md
- `marina_data.json`: schema in place, restaurant data empty (`restaurants: []` for all 45) — needs sourcing
- `FREE_KEYS`: placeholder `["annapolis","newport"]` — unconfirmed, see TODO.md
- No hurricane advisory content (not applicable to this coast) — `#marina-advisory` hidden with an explanatory TODO comment in the code

## Cruiser's Log
- Backend: Google Apps Script (Code.gs) + Google Sheets, project "Cruiser Log" in Drive (script ID `1XghG2VZPZ5cf9Hjt4Z9Wz3k4cPgTrCb_iPVHvum4fsLcUYACT-i_ckRe`), backing sheet "SailWindow — Cruiser's Log" (`11zeOQiF5ndDh2UOIexk88BZAiS-AZyeZou822JrRvYc`).
- **Moderation gate:** every submission is written with `Approved = false`. `doGet()` only returns rows where Approved is checked TRUE in the Sheet — nothing shows in the app's community feed until someone manually approves it there.
- Front end: category checkboxes (Docking/Marina, Restaurants/Ashore, Hazards & Cautions, General) + Good/Bad sentiment toggle on the log form; feed groups by marina (destination, falling back to departure) then by category, newest first.
- Stripe: subscription + trial management
- Subscribe modal restore mode: `openSubscribeModal('restore')`
- Gulf-only for now — Atlantic edition mirrors the same code path but is untested against its own Apps Script/Sheet backend (TBD whether it shares the Gulf sheet or needs its own).

## Known Issues / Open Items
See `TODO.md` in this same folder for the full current punch list (Atlantic launch blockers, bundle-pricing follow-ups, Gulf open items, backup gap).

## Hero Headline
"Your Passage Planner. / Bridges, Weather, Docks & Food." (Gulf edition)

## Founder Story
"Built by a former CNN correspondent · 73 years old · 3 weeks with Claude"
