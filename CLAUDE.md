# SailWindow Project

## Location
Project is on the Desktop (non-standard): `/Users/howardshellabarge/Desktop/SailWindow/`

## Two Products
SailWindow is now two separate editions, each its own subscription product:
- **Gulf Edition** (live, primary) — `dist/index.html` — Texas to the Florida Keys, 35 NOAA stations. Also covers both of Florida's coastlines internally (hero badge: "FL Gulf & Atlantic Coasts" — this is *not* the same thing as the Atlantic Edition below; the wording was fixed 2026-07-19 after it read as if the two products overlapped).
- **Atlantic Edition** (in development, not yet deployed) — `dist-atlantic/index.html` — Georgia to Maine, 21 NOAA stations, 45 curated marinas. See "Atlantic Edition" section below for details and open items.

## Long-Range Roadmap: The Great Loop
Russ's stated plan (2026-07-20): after finishing Atlantic Edition (GA→ME), build a **Great Lakes Edition**, then a **Mississippi River Edition** — together with Gulf + Atlantic, this completes coverage of **America's Great Loop** (the closed circumnavigation route recreational boaters run: Gulf ICW → Atlantic ICW → Hudson/Erie Canal or Trent-Severn → Great Lakes → Chicago/Illinois River or Tenn-Tom Waterway → Mississippi/Tennessee River system → back to the Gulf). Four editions total. Not yet started — Great Lakes and Mississippi have no code, no data sourcing, nothing beyond this note.

**Before forking a third copy, stop and consolidate.** The current pattern — each edition is a full standalone ~250KB copy of the entire single-file app, hand-edited region by region — already produced real bugs during the Gulf→Atlantic fork this session: leftover "Gulf Coast Edition" text in the Atlantic help panel, a hero badge that read as if the two products overlapped, and a whole second bridge-reference database (`BRIDGE_DATA`) that never got swapped out and showed Gulf/Texas bridges inside the Atlantic build (fixed 2026-07-20 by deriving it from `DRAWBRIDGES` instead of hand-duplicating — see App Coverage below). That's with only 2 editions. At 4 editions, every future fix (CSS tweak, trial-system change, subscribe-modal change) has to be manually replicated 4 times, and drift compounds. Recommend refactoring to one shared engine (scoring logic, tide/weather fetch, marina cards, subscribe modal, trial system) driven by a per-edition config/data file (stations, marinas, bridges/locks, hero copy, Stripe links, FREE_KEYS, domain, SEO meta) — before Great Lakes work starts, not after.

**Data model doesn't transfer cleanly to the new waters — plan for this, don't discover it mid-build:**
- *Great Lakes:* no tidal predictions (NOAA Tides & Currents mostly doesn't apply on freshwater; water levels use a different datum, IGLD). Seasonal closure (ice, roughly Nov–Apr). The ICW "drawbridge" concept mostly doesn't apply — the real chokepoints are **locks** (Soo Locks, Welland Canal, Chicago Sanitary & Ship Canal), which have transit fees, scheduling, and lockmaster VHF contact — a different data shape than a bridge opening schedule. Some Great Loop routings (Georgian Bay/North Channel, Trent-Severn) cross into Canadian waters — worth confirming intended route/scope before sourcing data, since that adds a customs/CBP dimension the app has never had to handle.
- *Mississippi/river system:* dominated by Corps-of-Engineers-operated locks and dams, heavy commercial barge traffic (different safety/right-of-way considerations than recreational ICW), and river stage/current from USGS/Corps gauges instead of NOAA tide stations — again a different core data feed, not a drop-in swap of the existing tide-fetch code. Marina spacing is sparser and more informal than the coastal editions; some stretches have long no-services gaps worth flagging to users.
- Net effect: the `DRAWBRIDGES` abstraction (name/waterway/mile/clearance/VHF/schedule) probably needs to generalize to something like "transit points" that covers both bridges and locks, and the tide-fetch code needs a river-stage/lake-level variant. Worth designing that abstraction once, now, rather than bolting on lock support ad hoc later.

**Pricing/entitlement won't scale past the current 2-edition pattern.** Today's $10/mo Gulf+Atlantic bundle already required a manual "activate once on each subdomain" workaround because there's no shared backend — that's tolerable at 2 editions, but at 4 the combinatorics (any-two bundles, a "Grand Loop All-Access" full bundle) make the no-backend honor-system approach unsustainable. Worth building a small shared verification backend (a lightweight worker checking one Stripe customer's subscriptions, callable from all subdomains) before adding a third paid product, rather than retrofitting it across 4 live codebases later.

**Naming/URL convention:** decide now, not ad hoc per launch. Likely pattern: keep `sailwindow.com` as Gulf (already live), then `atlantic.`, `greatlakes.`, `mississippi.` subdomains, plus a master page explaining the full Grand Loop lineup and bundle options once there's more than two.

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
- **Atlantic Edition promo (added 2026-07-19):** a "Coming Soon: Atlantic Edition" banner sits as the first child inside `#sw-hero-overlay` (across the top, above `#sailwindow-hero`), and an `#atlantic-waitlist` signup form sits right after the hero content closes. The banner's "Get Notified" button anchor-links to the form. Its card icon is a Font Awesome ship (`fa-ship`, brand blue) — not the wave emoji, which read too much like the Hokusai "Great Wave."
- **Waitlist backend (added 2026-07-20) — shared across all future editions.** One Google Sheet ("SailWindow — Waitlist", under russjamieson@gmail.com, id `1pnTDkLUuZNSfu8kJ9U3QKLvvxf--tShnWcDgPO02nco`) + one Apps Script `doPost()` (see `waitlist-Code.gs`) serve every edition's waitlist, not just Atlantic's — each row is tagged with an `Edition` column. The form posts JSON via `fetch()` (not a native form submit, which would both fail `JSON.parse` server-side and redirect the visitor off-site to a bare Apps Script response page) using `Content-Type: text/plain` specifically to dodge a CORS preflight Apps Script Web Apps can't handle. Client-side function `submitWaitlist(event, edition)` in `dist/index.html` is edition-parameterized on purpose: adding a Great Lakes or Mississippi waitlist later is copy the same form block, change `id="waitlist-form-atlantic"` → `-greatlakes`/`-mississippi` and the `submitWaitlist(event,'atlantic')` argument — no new script, no new sheet, no new deploy. `WAITLIST_SCRIPT_URL` is a `"#"` placeholder until the Apps Script is deployed as a Web App and the URL pasted in — see TODO.md for the manual deploy steps (can't be done from here; Apps Script deployment requires the Apps Script editor UI).

## Hero CTAs
- `heroStartTrial()` — "Check Your Window — Free for 7 Days →"
- `heroSubscribe()` — "Subscribe Now"
- `heroRestoreAccess()` — "Already a subscriber? Restore access →"

## Pricing
Each edition is its own subscription, plus combined bundles:
- **Any single edition (Gulf, Atlantic, Great Lakes, or Mississippi) alone:** $5.99/mo or $49/yr (7-day free trial), same structure across all four editions.
- **2-edition Bundle (Gulf + Atlantic):** $10/mo flat. Surfaced as a third "Best Value" price card in the subscribe modal on both sites, plus in the hero pricing bar and the Atlantic waitlist copy.
- **3-Edition Bundle:** $15/mo flat (product created 2026-07-20; which three editions it covers — presumably Gulf + Atlantic + one of Great Lakes/Mississippi, or a distinct combination — not yet defined/documented since Great Lakes and Mississippi have no app content yet).
- **4-Edition Bundle ("Grand Loop All-Access"):** $20/mo flat, all four editions (product created 2026-07-20).
- Stripe Payment Links: `STRIPE_MONTHLY` / `STRIPE_ANNUAL` (per-edition) and `STRIPE_BUNDLE` (2-edition — shared identical link value in `dist/index.html`, `dist-v8/index.html`, and `dist-atlantic/index.html`). **Fixed 2026-07-20:** created real Stripe products/prices/Payment Links for both "SailWindow Atlantic" ($5.99/mo, $49/yr) and "SailWindow Bundle" ($10/mo), wired into the code — Atlantic no longer points at Gulf's links, and `STRIPE_BUNDLE` is no longer a `"#"` placeholder. Account is Rj & HRS Marketing LLC (Stripe acct `acct_1TfTvK80XXRgQXiK`); Gulf's own product remains "SailWindow Pro" (unchanged).
- **New 2026-07-20 — Great Lakes, Mississippi, and Trio/Quad bundle Stripe products created (pricing-only; no app content yet).** Four new live Stripe products with real Payment Links, created ahead of the actual Great Lakes/Mississippi edition builds so pricing infrastructure is ready when those editions are built:
  - "SailWindow Great Lakes" — $5.99/mo: https://buy.stripe.com/4gMcMZaOMfyMfaKb2M7Re05 · $49/yr: https://buy.stripe.com/9B69AN0a81HW9Qqb2M7Re06
  - "SailWindow Mississippi" — $5.99/mo: https://buy.stripe.com/00w14haOM3Q46Ee5Is7Re07 · $49/yr: https://buy.stripe.com/3cI9AN2igcmAfaK4Eo7Re08
  - "SailWindow 3-Edition Bundle" — $15/mo: https://buy.stripe.com/3cI5kxcWU3Q46Eec6Q7Re09
  - "SailWindow 4-Edition Bundle (Grand Loop All-Access)" — $20/mo: https://buy.stripe.com/7sY5kx5usaes4w63Ak7Re0a

  None of these four are wired into any code yet — no `dist-greatlakes/` or `dist-mississippi/` app exists, and no Trio/Quad option has been added to the existing subscribe-modal plan selector (`selectPlan()` / `handleStripeCheckout()` / `activateSubscription()` in the Gulf/Atlantic files only know `'monthly'`, `'annual'`, `'bundle'`). Wiring the Trio/Quad links into the live Gulf/Atlantic pricing UI now would expose real purchasable bundle tiers for editions that don't exist yet — worth confirming with Russ before doing that, rather than assuming.
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
- `DRAWBRIDGES` (nearby-bridges widget): **32 real bridges, GA → ME (added 2026-07-20)** — 15 from Russ's `atlantic_icw_drawbridges.xls` (GA–NJ) plus 17 from `Northeast_Movable_Bridges_Sailwindow.xlsx` (NJ–ME, District 1). The Northeast batch's coordinates weren't in the source sheet — researched via Wikipedia/Waterway Guide by a subagent, all tagged "exact." One caveat: Route 52 (Ocean City, NJ) is now a fixed span (rebuilt ~2012) — the source sheet's 55ft bascule clearance likely describes the prior bridge, flagged as unconfirmed in the UI copy rather than stated as fact. Each entry now has a `restrictions_apply` boolean (per Russ's CFR 33 Part 117 point — bridges with a real closed/rush-hour window vs. always-on-demand ones), surfaced in the UI as a "⏰ restricted hours" tag. New England's lift bridges (Buzzards Bay, Sarah Mildred Long, Carlton) share a 135ft standard raised clearance, called out in the Bridge Schedules help text alongside the southern 65ft fixed-span standard.
- `BRIDGE_DATA` (Bridge Schedules reference panel): **fixed 2026-07-20** — was still the old 48-entry Gulf/TX/LA/MS/AL/FL database, never swapped out during the fork. Now computed as `DRAWBRIDGES.map(...)` instead of hand-duplicated, so it can't drift from the nearby-bridges widget again; a `legForBridge()` helper classifies each bridge into the same 6-leg taxonomy used for NOAA stations/marinas (Georgia to North Carolina, Mid-Atlantic & Chesapeake, C&D Canal & New Jersey, NY Harbor & Long Island Sound, Rhode Island to Massachusetts, Maine Coastline), replacing the Gulf-specific filter chips. Verified via Node: 32/32 entries mapped, no drift, no id collisions. Also fixed in the same pass: a duplicate DOM `id="bridge-list"` used by both the full Bridge Schedules view and the nearby-widget list (inherited from Gulf, unrelated to the fork) — the widget's instance is now `id="bridge-list-nearby"`.
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
