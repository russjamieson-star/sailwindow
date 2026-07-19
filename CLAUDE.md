# SailWindow Project

## Location
Project is on the Desktop (non-standard): `/Users/howardshellabarge/Desktop/SailWindow/`

## Key Files
- `dist/index.html` — production build (primary)
- `dist-v8/index.html` — mirrors dist/index.html (keep in sync)
- `inject_light_hero.py` — hero replacement injection script
- `dist-v6/index.html` — older V6 build (separate)

## Deployment
```
cd /Users/howardshellabarge/Desktop/SailWindow
npx wrangler pages deploy dist --project-name=sailwindow --branch main
```
Live at: **sailwindow.com** (Cloudflare Pages)

## Backup
Standing rule: treat `~/Desktop/SailWindow` as the only place edits happen. At the end of any session with code changes, back up to both of the following.

- **GitHub (primary, full mirror):** `~/Projects/SailWindow`, remote `git@github.com-sailwindow:russjamieson-star/sailwindow.git`. This is a real git repo and mirrors everything, including media (App Hero, Photos videos, etc.) — rsync Desktop → this folder (never edit it directly), `git status --short` to sanity-check the diff before committing, then commit and push.
- **Google Drive (secondary, code/docs only):** the **"SailWindow BU"** folder — https://drive.google.com/drive/folders/1_JT5-Z5WhT5uI_KBFio4NHkJo4Gv-cML — holds the deployable build + scripts + docs (not the large media folders, which already have full-fidelity backup via GitHub).
- **Deprecated — do not use:** the old `SailWindow` Drive folder at https://drive.google.com/drive/folders/14tfWjXYcw08ejy_uz_ORMJlO28qM-YZM is stale and no longer the backup target.

Known gotcha: a naive Desktop → Projects overwrite once silently reverted a shipped feature (the "Eat" button, 2026-07-05) because the two folders had diverged. Always diff before committing, never assume they match.

## Hero Overlay
- Element: `#sw-hero-overlay` (position:fixed, z-index:600)
- Theme: Light — `linear-gradient(135deg, #f0f7fc, #d4e9ff)`
- CSS prefix: `hw-` (hw-card, hw-feature-grid, hw-trust-badge, etc.)
- All hero CSS scoped to `#sw-hero-overlay`
- Font Awesome 6.5.0 loaded from cdnjs (added to `<head>`)
- Shown to new visitors via `initHeroCheck()` in DOMContentLoaded
- localStorage keys: `sailwindow.trial.start`, `sailwindow.subscription`

## Hero CTAs
- `heroStartTrial()` — "Check Your Window — Free for 7 Days →"
- `heroSubscribe()` — "Subscribe Now"
- `heroRestoreAccess()` — "Already a subscriber? Restore access →"

## Pricing
- Monthly: **$5.99/mo**
- Annual: **$49/yr**
- Trial: **7 days free**

## App Coverage
- 48 drawbridges (Gulf & Atlantic ICW, FL Panhandle, TX/LA/AL)
- 80+ marinas (Port Aransas to Cape Canaveral)
- Weather: NOAA + ECMWF
- Features: Sailing Window, Bridges, Marinas, Dining, 7-Day Forecast, Cruiser's Log

## Cruiser's Log
- Backend: Google Apps Script (Code.gs) + Google Sheets, project "Cruiser Log" in Drive (script ID `1XghG2VZPZ5cf9Hjt4Z9Wz3k4cPgTrCb_iPVHvum4fsLcUYACT-i_ckRe`), backing sheet "SailWindow — Cruiser's Log" (`11zeOQiF5ndDh2UOIexk88BZAiS-AZyeZou822JrRvYc`).
- **Moderation gate:** every submission is written with `Approved = false`. `doGet()` only returns rows where Approved is checked TRUE in the Sheet — nothing shows in the app's community feed until someone manually approves it there.
- Front end: category checkboxes (Docking/Marina, Restaurants/Ashore, Hazards & Cautions, General) + Good/Bad sentiment toggle on the log form; feed groups by marina (destination, falling back to departure) then by category, newest first.
- Stripe: subscription + trial management
- Subscribe modal restore mode: `openSubscribeModal('restore')`

## Hero Headline
"Your Passage Planner. / Bridges, Weather, Docks & Food."

## Founder Story
"Built by a former CNN correspondent · 73 years old · 3 weeks with Claude"
