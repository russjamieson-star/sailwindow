# SailWindow — Project Brief
*Updated June 12, 2026 — generated from the Claude Code working session. Ask Claude Code on the Mac to refresh this after big milestones.*

## What SailWindow is
Browser-based Gulf Coast sailing-conditions app at **https://sailwindow.com** (Rj Marketing d/b/a SailWindow, sole founder Howard). It scores the day 0–10 ("sailability") against the user's own wind/gust comfort range and tide preference, and shows the best departure window for today. Live hourly wind from NWS, tide predictions from NOAA, 7-day outlook from Open-Meteo. No login; preferences stay in the browser. Covers 35 NOAA stations, Port Isabel TX to Key West FL.

- **V5 is the live site** (deployed on Cloudflare Pages, custom domain active).
- **V6 in development on the Mac** (not deployed): adds Choctawhatchee Bay — Niceville/Rocky Bayou/Destin stations — plus fixes; backlog below.

## Pricing & Stripe (live)
- $5.99/mo or $49/yr via Stripe payment links inside the app. 7-day free trial; free-tier stations: Tampa (3) and Pensacola (2). Activation is honor-system for now; real entitlements (Cloudflare Worker + Stripe webhooks) are a planned phase.
- Annual checkout link: https://buy.stripe.com/4gM8wJf521HW8MmeeY7Re01 · Monthly: https://buy.stripe.com/28EeV73mk86kaUuc6Q7Re00
- **Referral program (live):** promo codes work on both payment links; $0 checkouts skip card entry.
  - Club members — 20% off forever: NAVYYC20, PYC20, GLYC20, PBYC20, PSC20, SAILPENS20 (one per Pensacola club, redemptions trackable per code)
  - Club captains — free forever, single-use: CAPT-NAVYYC, CAPT-PYC, CAPT-GLYC, CAPT-PBYC, CAPT-PSC, CAPT-SAILPENS
  - Friends — free forever, single-use: FRIEND-JIM, FRIEND-MARJORIE (both Florida sailors; Jim = 28-year sailing buddy in Niceville, first beta tester)

## Outreach status
- Pensacola campaign: cold-email list and template ready for 6 clubs (Navy YC, Pensacola YC, Grand Lagoon YC, Pensacola Beach YC, Pensacola Sailing Club, Sail Pensacola). Pitch: Pensacola is a free region — "your members can use it today at no cost," plus club code + captain comp.
- **Meeting June 16, 2026: Frank Bean, Commodore, Navy Yacht Club Pensacola — general membership meeting at Grand Lagoon YC.**
- Stretch goal: Gulf Yachting Association intro after 1–2 Pensacola clubs sign on.

## Positioning (firm rule — do not violate in any drafting or planning)
Do **not** copy or mimic the "Big Boys" (PredictWind, savvy navvy): no routing, no passage planning, no offshore/global features, ever. *They sell to the trip; SailWindow sells to the morning* — "is today worth it, for me, on my water." Feature filter: everything must serve the daily decision of a local bay sailor. Destination info is live, local, captain-vouched knowledge — a complement to Waterway Guide (the reference vs. our live pulse), and never scraped/transcribed from Waterway Guide or ActiveCaptain (licensing).

## V6 backlog (validated by first user feedback from Jim, June 2026)
Jim's verdict: offshore long-range views are low value; recreational boats live on the ICW and want destinations.
1. Captain's pre-sail checklist (free safety feature; auto-checks weather/tide items; float-plan share)
2. Sea Tow assist page with tracked referral (safety-first: VHF 16/USCG always leads)
3. sailwindow.com short links with click counts (e.g. /crew, /club → checkout)
4. Marina layer: transient-slip status, anchorages, dock-and-dine, fuel prices — manually seeded + captain-crowdsourced (Cloudflare KV), never scraped
5. ICW drawbridge cards: schedules/restricted hours, tender phone, VHF 09 — public-domain source is 33 CFR Part 117 (USCG regs); reference card only, no opening-time routing
6. "Home dock" personalization (custom GPS already picks nearest station; make it friendlier)

## Business/admin status
- GA incorporation paperwork pending at Secretary of State, expected ~week of June 15, 2026. Business bank account to be attached to Stripe after; make Stripe legal-entity details match the new entity/bank name.
- Stripe still to-do: confirm statement descriptor (SAILWINDOW), enable Customer Portal.
- Email: all @sailwindow.com addresses route via Cloudflare to Gmail; send-as configured (support/marketing/ahoy).
