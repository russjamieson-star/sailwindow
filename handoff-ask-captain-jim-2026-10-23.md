# active-memory handoff: Ask Captain Jim — Daily Brief run + fuel-price/points idea

**Handoff #1** · 2026-10-23 · Lineage: #1 (2026-10-23): Gulf Daily Brief run and published to Facebook; brainstormed the AIS lock-traffic idea and the fuel-price + points rewards idea (sketch only)

## 0. Instructions for Claude (read first)

You are continuing work from a previous chat. That chat is gone; this file is the complete context and the source of truth.

1. Read this whole file before replying.
2. Follow sections 3 (Style), 4 (Hard rules) and 5 (Corrections) in every reply, for the rest of this chat. They override your defaults.
3. Use the values in section 8 exactly. Never round, re-estimate, or "correct" them.
4. Do not suggest anything listed in section 7 (Changed / rejected) again unless the user brings it up.
5. Code word: None active. If the user types /amcodeword, start every reply with the phrase they choose (default "Yes Boss!").
6. Your first reply: at most 5 lines covering the goal, the current state, and the next step (section 11). Mention any files from section 13 that were not attached. Ask the questions in section 12 if there are any. End with "Ready to continue with <next step>?" Then wait for the user's go.

## 1. Mission
- **Goal:** keep running Ask Captain Jim (formerly SailWindow), a passage-planning web app for recreational boaters, and grow it. This chat (a) ran the automated Gulf Coast Daily Brief and (b) sketched future features: AIS lock-traffic and crowdsourced marina fuel prices with a points rewards program.
- **Done looks like (ideas):** a clear, simple sketch Russ can come back to. No build was requested: "no actual plans other than to sketch this out and see if Stripe permits it or how we can do it."
- **Why it matters:** fresh marina fuel prices are data no competitor reliably has. Rewards keep subscribers engaged.

## 2. About the user (as relevant to this work)
- Russ Jamieson (russjamieson@gmail.com), founder and builder of the app. Former CNN correspondent, 73. Not technical, so explain in plain English.
- App: Gulf Edition is live at askcaptainjim.com (Cloudflare Pages project `sailwindow`). Atlantic Edition is at atlantic.sailwindow.com.
- Code lives in `/Users/howardshellabarge/Desktop/SailWindow/` (the only place edits happen). `~/Projects/SailWindow` is the GitHub mirror and is never edited directly.
- Social: posts go through Buffer to the "Ask Captain Jim" Facebook page and to sailing Facebook groups.

## 3. Style & communication
- **Language:** English.
- **Tone:** warm, practical, plain English, no jargon. Russ is not technical.
- **Reply length:** moderate. Short sections, bullets, bold lead-ins.
- **Formatting:** headings or bold labels, bullet lists, an occasional sample block. No code unless asked.
- **Working style:** brainstorm and sketch. Russ thinks out loud and refines quickly; follow his simplifications. Back claims with quick research and cite links. Save each idea to the project memory notes when he agrees.
- **Avoid:** over-engineering. Russ cut the fuel-range calculator as "overly complicated".

## 4. Hard rules (word for word)
1. Buffer: "Make cards and Buffer drafts — never publish or queue; Russ reviews every draft in Buffer himself." (Daily Brief task rule. Russ later approved publishing today's posts himself: "let's do them all now..")
2. Facebook groups need `schedulingType: "notification"`, because Facebook doesn't allow apps to post into groups. Russ shares group posts by hand.
3. "Never invent dates, prices, phone numbers or details; if a detail is uncertain, say so in Notes." (Daily Brief)
4. Fuel feature: "report the fuel prices and let [the captain] decide." Provide information, not calculations.

## 5. Corrections log
| # | Claude did | The user wanted |
|---|---|---|
| 1 | Proposed 25¢ off per approved fuel report | "think of this as my Kroger membership... gather points and then cash them in" |
| 2 | Proposed a fuel-range route planner (tank size, gallons/hour, reserve, fuel window) | "this may be overly complicated... report the fuel prices and then let him decide" |
| 3 | Framed fuel as the main thing marinas want to advertise | Russ: slips are the gravy, and "gas and slips are intertwined for overnight stays" |

## 6. Decisions
| Decision | Why |
|---|---|
| Rewards = points you collect and cash in (Kroger / fuel points / airline miles style) | Russ's call: boaters already know the model |
| Fuel feature = show price + date reported + distance to the next fuel dock along the route; captain decides | Russ's call: keep it simple |
| Reporting = snap a photo of the pump or price board; AI reads the price, and the photo plus live location is the proof | Russ: many marina pumps are mechanical, so a photo is easiest |
| Fuel prices and transient-slip availability go together ("fuel & a slip tonight") | Russ: a fuel stop becomes the overnight stay |
| Fuel prices + subscriber rewards is a "plus feature" worth doing someday | Russ's call |
| AIS lock-traffic idea saved for later (after the engine consolidation) | Russ said "yes, please" to saving it |
| Today's Daily Brief posts published: 4 page posts now, 11 group posts sent as reminders | Russ: "let's do them all now.." |

## 7. Changed / rejected
- 25¢ credit per fuel report → points ledger, cash in at thresholds (Kroger model)
- ❌ Fuel-range calculator / gallons-per-hour route planner (too complicated; the captain decides)
- ❌ Plugging an SDR radio into the app (the app runs in a phone browser; AIS would have to come from a paid data provider)

## 8. Data & facts (exact)
**Stripe (from Stripe's docs, checked 2026-10-23):**
- Every customer has an "invoice balance". A credit (negative amount) automatically comes off the next subscription invoice and never takes a bill below $0.
- Dashboard: Customer → Customer invoice balance → Adjust balance. API: `POST /v1/customers/{id}/balance_transactions` with `amount=-25`, `currency=usd`.
- Credits can't be deleted, only reversed with an opposite adjustment.
- Automatic crediting needs the subscription backend (`subscription-service/`), which isn't deployed yet: `backendUrl: "#"` in `dist/index.html`.

**Pricing:** single edition $5.99/mo or $49/yr. Annual subscribers would only see a credit at renewal.

**Placeholder points numbers Claude suggested (NOT decided):** 10 pts per approved fuel price, 5 per Cruiser's Log post, 50 per referral; 250 pts = $1 off, 1,500 pts = a free month. Points need "no cash value / non-transferable" terms.

**Marina revenue (Trade Only Today, older data):** slips & storage ~40%; fuel 10–25% (the two sources disagree); maintenance ~15%; food ~10%; equipment ~10%. Fuel margins couldn't be confirmed.

**Existing marina programs:**
| Program | What |
|---|---|
| BoatUS cooperating marinas | flat member discount, e.g. 5–10¢/gal |
| Dockwa+ | $84/yr; up to 50% off transient dockage + fuel discounts |
| Safe Harbor membership | needs a slip/storage contract; fuel at cost |
| Ocean Havens "Ocean Access" (New England) | free tiers; 15–20¢/gal |
| MDL Marinas "Otium" (UK) | real earn-and-redeem points, 50+ partners (closest to Russ's model) |
| Bridge Marina | 10¢/gal |
None of the US programs rewards boaters for contributing data. That's the gap.

**Fuel-price sources today:** Waterway Guide Fuel Price Report; Garmin ActiveCaptain (crowdsourced, drops prices older than ~2 weeks, users say it's going stale); CruiserNet (phoned ICW marinas weekly); Panbo 2013 article "Marine fuel prices, why so hard?"

**Competitor boatfuelprice.com (SeaSure Inc., info@seasure.ai):**
- A login-walled map; prices come from web scraping plus staff calling docks.
- Crowdsourcing and the marina partner program are "Coming Soon".
- Plans $9.99/mo or $99/yr ($79/yr founding rate), currently free early access.
- Much of the page is labeled "Illustrative data"; only one real-looking price was shown (Sarasota Bayfront Fuel diesel $4.89).

**GasBuddy:**
- About 2–3M driver reports a day, ~150,000 stations.
- Points → raffle tickets for daily $100 gas-card drawings.
- Sells its data to energy companies (OPIS); also station business pages and a pay card (5¢/gal off).
- Bought by PDI Technologies in April 2021.

**Today's Daily Brief rows (2026-10-23):**
1. ICW Alert FL: gale watch, Fernandina Beach–Jupiter Inlet, Sat Oct 24 afternoon – Mon Oct 26 evening; NE 25–35 kt, gusts 40, seas 10–15 ft possible.
2. ICW Alert LA: UPDATE, Harvey Lock closed again Oct 22 (reverse head, no ETA). Source is an ACBL barge report only; detour via Algiers Lock.
3. On the Water MS: Melges 15 Gulf Coast Championship, Bay-Waveland YC, Oct 24–25 (club 228-467-4592).
4. Festival FL: Tarpon Springs Seafood Festival, Nov 7–8 (735 Dodecanese Blvd).

Unconfirmed: Leland Bowman Lock may have reopened; Colorado River Lock repairs were scheduled to end Oct 23.

## 9. People, terms & names
- **People:** Russ (user); Captain Jim (the brand persona).
- **Terms & nicknames:** "Kroger membership" = points you collect and cash in; "fuel & a slip tonight" = combined fuel price + transient-slip view; "Captain's Points" = a suggested name for the points balance (not decided); "the captain decides" = the guiding rule.
- **Names in use:** Daily Brief sheet ID `1m8SMyFaCdjggkqF5wBmNPCmOXK1nlkHbhayWHNiCCXo`; cards served at `https://askcaptainjim-cards.russjamieson.workers.dev/`; Buffer page channel `6a9da70dcd8b9c702c1a029d`; scheduled task `gulf-daily-brief`.

## 10. Work state
| Item | Status | Version / location | Notes |
|---|---|---|---|
| Daily Brief 2026-10-23 | done | sheet + `daily-brief/2026-10-23.csv` | 4 rows, receiver answered version 2 |
| Cards + promo | done | `daily-brief/graphics/out/2026-10-23-*.png`, `promo-2026-10-23.png` | promo image `Gemini_Generated_Image_i4chdvi4chdvi4ch`, headline "Windy weekend?" logged in `promos/used.csv` |
| Facebook page posts (4) | published ~2pm EDT | Ask Captain Jim page | gale watch post: https://www.facebook.com/122110040853439129/posts/122121155373439129 |
| Facebook group posts (11) | sent as reminders | Buffer | Russ must share each one by hand |
| AIS lock-traffic idea | saved | memory `ais-lock-traffic-idea.md` | later, after the engine consolidation |
| Fuel-price + points idea | sketch saved | memory `fuel-price-reports-idea.md` | blocked on the subscription backend deploy |
| Subscription backend | built, not deployed | `subscription-service/`, `DEPLOY.md` | `backendUrl` still `"#"` |

## 11. Next steps
1. **Next action:** nothing is pending from this chat. If Russ wants to move the fuel/points idea forward, the first real step is deploying `subscription-service` (needs Russ's GCP/Stripe access, per `subscription-service/DEPLOY.md`) and pasting its URL into `backendUrl`.
2. Later: a "Report fuel price" button on marina cards → Google Sheet with an Approved checkbox → price shown on the card → points.
3. Later: a weekly 10-second marina check-in ("Diesel still $X? Any transient slips open?"); a monthly raffle for reporters; partner marinas accepting points.

## 12. Open questions ⚠️
- Real points values and reward thresholds (only placeholders so far).
- How annual ($49/yr) subscribers redeem: a credit at renewal, or bonus days?
- Do non-subscribers / trial users earn points (e.g. extra trial days)?

## 13. Re-attach checklist
- Nothing to attach. The project's CLAUDE.md and memory notes load automatically in this folder.

---
<sub>Audit: 13/13 sections · 4 rules · 3 corrections · 40 data points · secrets removed: none found · generated by active-memory</sub>
