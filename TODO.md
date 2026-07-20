# SailWindow — TODO
_Last updated: 2026-07-19_

## Atlantic Edition — before it can launch
- [ ] **Bridge Schedules reference panel is still the Gulf database.** The `BRIDGE_DATA` array (~48 entries, feeds the "ICW Bridge Schedules" help/reference panel with waterway filter chips) was never replaced during the fork — it still lists Texas, Louisiana, Mississippi, Alabama, and Florida bridges. This is separate from the `DRAWBRIDGES` array (the "nearby bridges" widget on the marina page), which *was* updated with the 15 real GA–NJ bridges. Anyone who opens Bridge Schedules on the Atlantic site right now sees the wrong coast.
- [ ] **Bridge coverage north of NJ is unresearched.** The 15 sourced bridges run GA → NJ. NY, CT, RI, MA, NH, and ME still have no drawbridge data. (Explicitly deferred by Russ — "pick up the rest tomorrow.")
- [ ] **Create separate Atlantic Stripe Payment Links.** `dist-atlantic/index.html`'s `STRIPE_MONTHLY` / `STRIPE_ANNUAL` currently point at the *Gulf edition's* real Stripe links (copied by accident during the fork) — an Atlantic subscriber would pay into the wrong product today.
- [ ] **Create the $10/mo Bundle Stripe Payment Link.** `STRIPE_BUNDLE` is a `"#"` placeholder in both `dist/index.html` and `dist-atlantic/index.html`. Once created in Stripe, paste the same link into both files.
- [ ] **Confirm or change the Atlantic `FREE_KEYS` placeholder.** Currently set to Annapolis + Newport as my placeholder choice (mirroring Gulf's Tampa + Pensacola pattern) — never confirmed by Russ.
- [ ] **Atlantic `marina_data.json` restaurant data is empty.** All 45 marinas have `restaurants: []` — the "Ashore" dining panel has nothing to show until this is sourced/enriched.
- [ ] Atlantic SEO location pages not generated (Gulf has 48 equivalent pages).
- [ ] `sitemap.xml` / `robots.txt` still reference only the Gulf domain.
- [ ] `dist-atlantic/` has never been deployed — no Cloudflare Pages project or `atlantic.sailwindow.com` subdomain exists yet. It only lives locally right now.
- [ ] 10 of 45 Atlantic marinas are geocoded to town-center precision rather than exact street address (Russ confirmed this is fine — captains will identify the marina by sight on approach).

## Gulf + Atlantic bundle (the $10/mo combined plan)
- [ ] **No shared entitlement backend.** Gulf and Atlantic are separate subdomains with separate browser storage, so a bundle subscriber has to tap "Activate" once on sailwindow.com *and* once on atlantic.sailwindow.com. The checkout flow now explains this, but it's a manual two-step, not seamless. A real fix needs a small shared verification backend (e.g. checking one Stripe subscription from both sites) if this friction becomes a problem.
- [ ] **Waitlist form has no real backend.** The `#atlantic-waitlist` form on the Gulf site (`action="#" method="POST"`) doesn't submit anywhere — signups aren't being captured. Needs a real destination: a Google Form, Mailchimp/ConvertKit embed, or a small Cloudflare Worker + KV store.

## Gulf Edition — open items
- [ ] **Live production is missing `marina_data.json`.** The file that powers the "Ashore" restaurant panel exists in the older `dist-v6/` build but not in the current live `dist/`. Flagged earlier this session; Russ hasn't confirmed whether to fix it yet.
- [ ] Sanity-check the new hero badge wording ("NOAA + ECMWF · FL Gulf & Atlantic Coasts") reads clearly to real visitors — it's a subtle rewording meant to stop confusion with the new Atlantic Edition banner sitting right above it.

## Backups
- [x] **Google Drive "SailWindow BU" location resolved (2026-07-20).** It's under russjamieson@gmail.com (the 5TB personal Drive), not sailwindow.com, and not the account synced to this Mac's local `Google Drive` folder — that's why it wasn't found there on 2026-07-19. Backing it up now goes through Claude's Google Drive connector directly (folder ID `1_JT5-Z5WhT5uI_KBFio4NHkJo4Gv-cML`), bypassing the local Mac mount entirely.
- [ ] GitHub push was blocked by TWO separate stale lock files this session (`index.lock`, then `HEAD.lock`) left behind by an interrupted git process. Confirm the push actually landed after clearing both — check with `git log -1` and `git status`.
