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
- Backend: Google Apps Script (Google Sheets)
- Stripe: subscription + trial management
- Subscribe modal restore mode: `openSubscribeModal('restore')`

## Hero Headline
"Your Passage Planner. / Bridges, Weather, Docks & Food."

## Founder Story
"Built by a former CNN correspondent · 73 years old · 3 weeks with Claude"
