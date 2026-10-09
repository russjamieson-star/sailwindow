# active-memory handoff: Ask Captain Jim — Daily Brief, Facebook posting, app polish, Windcraft outreach

**Handoff #1** · 2026-10-08 · Lineage: #1 (2026-10-06 → 10-08): daily brief upgraded to match ChatGPT, Buffer/Facebook card + promo pipeline built, Help + full guide rewritten, wave period on wind map, weather icons + slider preferences shipped live, Tommy Clark (Windcraft) email sent

## 0. Instructions for Claude (read first)

You are continuing work from a previous chat. That chat is gone; this file is the complete context and the source of truth.

1. Read this whole file before replying.
2. Follow sections 3 (Style), 4 (Hard rules) and 5 (Corrections) in every reply, for the rest of this chat. They override your defaults.
3. Use the values in section 8 exactly. Never round, re-estimate, or "correct" them.
4. Do not suggest anything listed in section 7 (Changed / rejected) again unless the user brings it up.
5. Code word: Start every reply with exactly "Yes Boss!"
6. Your first reply: at most 5 lines covering the goal, the current state, and the next step (section 11). Mention any files from section 13 that were not attached. Ask the questions in section 12 if there are any. End with "Ready to continue with <next step>?" Then wait for the user's go.

## 1. Mission
- **Goal:** Grow Ask Captain Jim (askcaptainjim.com, a Gulf Coast sailing-window app): daily research brief → Google Sheet → Facebook posts via Buffer; keep the app polished and its Help accurate; win Windcraft Multihulls as an evaluator/distributor.
- **Done looks like:** daily Buffer drafts Russ only has to approve; app looks and reads current; a partnership with Tommy Clark.
- **Context:** later a subscriber-only "Captain's Daily Brief" and an in-app Daily Brief section (website has no Daily Brief link yet).

## 2. About the user
- Russ Jamieson, 73, former CNN correspondent, built the app with Claude. Not technical — wants plain English.
- Mac user; project lives on the Desktop: `/Users/howardshellabarge/Desktop/SailWindow/` (only place edits happen); GitHub mirror `~/Projects/SailWindow`.
- Posts to Facebook through Buffer; makes his own promo images (AI-generated vintage sailing art).
- Told Tommy he's "just starting out" and asked for evaluation and possible distribution.

## 3. Style & communication
- **Language:** English.
- **Tone:** plain, friendly, practical; explain technical things simply.
- **Reply length:** short to medium; lead with what was done and what he needs to do.
- **Formatting:** short headings/bullets fine; tables for lists of channels/items; numbered steps for anything he must click.
- **Working style:** he says "yes"/"do it"/"perfect" to go ahead; show previews/mock-ups before changing the live app when it's a visual change; verify on the live site afterwards.
- **Avoid:** jargon without explanation; unconfirmed facts (e.g. "100-year-old", "wooden").

## 4. Hard rules (word for word where given)
1. Nothing posts to Facebook without Russ's approval — Buffer items are always **drafts**.
2. Never state a fact that wasn't confirmed from a source; flag uncertainty instead.
3. Ask before deleting anything or copying one file over another (see correction 2).
4. Edits happen in `~/Desktop/SailWindow`; GitHub copy `~/Projects/SailWindow` is a mirror (rsync, diff before commit). Don't push unless asked.
5. `dist-v8/index.html` is NOT a mirror of `dist/` — never copy over it.
6. Bump the `?v=` number on any changed `.js` script tag (browser caches 4 h).

## 5. Corrections log
| # | Claude did | The user wanted |
|---|---|---|
| 1 | Limited group posts to one per group per day "to avoid spam" | Russ posts to the groups with their approval → each card to **every group it fits, no daily limit** (option 2) |
| 2 | Copied `dist/index.html` over `dist-v8/index.html` assuming a mirror | Reverted from GitHub copy; never overwrite without checking (CLAUDE.md fixed) |
| 3 | Card headline repeated ChatGPT's "100-year-old" and "wooden" for the Fish class | Removed — unverified; only confirmed facts on cards |
| 4 | Promo posts set to Tue + Fri | Russ: "make the posts every tuesday, thursday and friday" |

## 6. Decisions
| Decision | Why |
|---|---|
| Daily brief matches ChatGPT agent: 7 categories (ICW Alert, Route Open, Coastal Construction, Marina Deal, On the Water, Boat Show, Festival), Corps of Engineers bulletins via irpt.net, sailing calendars, "Why it matters:" / "What to do:" voice | Russ liked ChatGPT's findings |
| Daily task makes up to 3 cards from templates, Buffer drafts to Ask Captain Jim page + every fitting group (groups = Buffer "notification" mode) | user's call |
| Promo image post Tue/Thu/Fri, one draft, page only | user's call |
| Help screen + full guide (`SailWindow-Instructions.html`) rewritten to match app; deployed | "yes to everything" |
| Wave period added to wind map readout ("short, steep chop" = ≥2 ft and <5 s; "choppy" <6 s; else "longer swell") | multihull angle for Tommy |
| Meteocons weather icons + slider/segmented Sailing Preferences shipped live (`dist/sky-icons.js`) | "much nicer, add them to the app" |
| Astryx not adopted; ideas borrowed only | it's React; app is plain HTML |

## 7. Changed / rejected
- One group post per day → every fitting group, no limit (Russ: groups approve his posts)
- Promo Tue + Fri → Tue, Thu, Fri
- ❌ Astryx (Meta React design system) — needs React rebuild
- ❌ Shoelace for sliders — native browser controls were enough
- ❌ Navigation Advisory section in guide — feature removed from app in July

## 8. Data & facts (exact)
- Daily Brief Google Sheet id `1m8SMyFaCdjggkqF5wBmNPCmOXK1nlkHbhayWHNiCCXo` — 15 columns (Date Found…Priority + Approved checkbox); receiver Apps Script is **v2** (redeployed 2026-10-07); config `~/.config/daily-brief/config.json` (token: [secret removed: re-enter it — never print]).
- Scheduled task file: `~/.claude/scheduled-tasks/gulf-daily-brief/SKILL.md` (not in GitHub backup).
- Card/promo image host: Worker `askcaptainjim-cards` → https://askcaptainjim-cards.russjamieson.workers.dev (serves `daily-brief/graphics/out/`; deploy `cd daily-brief/graphics && npx wrangler deploy`).
- Buffer org `6a3ac62ae4cb4256b16eda73`; channels:

| Channel | id | Gets |
|---|---|---|
| Ask Captain Jim (FB page) | 6a9da70dcd8b9c702c1a029d | all cards + promos |
| Intracoastal Waterway | 6a4183c85ab6d2f1068168fc | ICW alerts, route opens, ICW construction, Looper deals |
| Fl East Coast Sailors | 6a91c46accaf649a6734d86c | FL Atlantic coast / Keys only |
| Sailing | 6a91c19fccaf649a6734c7b0 | On the Water, boat shows, big closures |
| Sailing Community | 6a91c088ccaf649a6734bea6 | same as Sailing |
| Sailing & Cruising | 6a41832e5ab6d2f106816712 | On the Water, shows, marina deals, ICW, rallies |
| Sailing and Cruising | 6a8f247cccaf649a671f8fe6 | same as Sailing & Cruising |

- App facts: 35 NOAA stations; 32 marinas in chooser; 48 drawbridges (11 FL Gulf ICW, 23 FL Atlantic ICW, 4 Panhandle, 10 TX/LA/MS/AL); duration 1–12 h; hard no-go wind <4 or >26 kt; pricing $5.99/mo, $49/yr, $10/mo Gulf+Atlantic bundle; free tier after trial = 5 Tampa Bay & Pensacola stations.
- Live script versions: `sky-icons.js?v=3`, `wind.js?v=7` (wind-test only), `engine.js?v=20260930`.
- Wind map test page: askcaptainjim.com/wind-test ("Jump to…" box for Pensacola).
- FB page: 41 followers (don't oversell reach).

## 9. People, terms & names
- **People:** Tommy Clark — Sales Associate, Windcraft Multihulls, Gulf Breeze/Pensacola FL (Seawind importer for Gulf states; Corsair, Dragonfly, Rapido trimarans; selling 30% shares of a 2026 Seawind 1160XL in Pensacola). O (850) 266-8132. Russ emailed him 2026-10-08 (3 questions, wind-map preview, optional free access for buyers/co-owners).
- **Terms:** "Captain's Daily Brief" = future subscriber product; "On the Water" / "Marina Watch" = his card templates; "Route Open" = restriction lifted.
- **Names in use:** `make_card.py`, `make_promo.py`, `promos/used.csv`, templates `marina-watch.webp`, `on-the-water.webp`, promo images `sailor-rigging.webp`, `sailor-coffee.webp`.

## 10. Work state
| Item | Status | Version / location | Notes |
|---|---|---|---|
| Daily brief task | live, runs daily | scheduled task SKILL.md | first full Buffer run pending |
| Buffer drafts 2026-10-07 (Fish Class Worlds, Baytowne Looper) | approved by Russ | Buffer | — |
| Help + full guide | live | `dist/index.html`, `dist/SailWindow-Instructions.html` | — |
| Weather icons + sliders | live, verified | `dist/sky-icons.js`, `dist/icons/` | — |
| Wave period on map | live (test page) | `dist/wind.js` | — |
| Style mock-up | done | https://claude.ai/artifact/WowdJEFDRyheCu7U7aLf1r | reference only |
| Tommy email | sent 2026-10-08 | — | await reply |
| GitHub backup | 6+ commits ahead, not pushed | `~/Projects/SailWindow` | push only if asked |

## 11. Next steps
1. **Next action:** watch for Tommy's reply; if he answers the multihull questions, offer to turn his numbers into a one-tap "Boat type" setting.
2. Check that the first automatic daily run made correct card + Buffer drafts (and Thursday promo).
3. ICW Alert cards wired in (2026-10-08): `route-open` (green), `icw-alert-closed` (red) and `icw-alert-restricted` (orange) templates — all in use.
4. Small fixes offered, not yet approved: subscribe "welcome" toast says 32 stations (should be 35, `stationCount` in `dist/index.html`); simplified FB cover photo; "Texas to Maine" FB bio wording.

## 12. Open questions ⚠️
- Does marketing@sailwindow.com still receive mail? (restaurant-owner offer in app + guide points there)
- Atlantic edition's domain: stays atlantic.sailwindow.com, moves to askcaptainjim, or shelved?
- If Tommy wants buyer access: how long is the free period (4 months like the Saint brothers, or a year)?

## 13. Re-attach checklist
- Nothing to attach — all files are in `~/Desktop/SailWindow` (CLAUDE.md and TODO.md there hold project background).

---
<sub>Audit: 13/13 sections · 6 rules · 4 corrections · 30+ data points · secrets removed: yes · generated by active-memory</sub>
