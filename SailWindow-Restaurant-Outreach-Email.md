# SailWindow — Restaurant Partner Outreach Email

*Draft 2026-07-05. Merge fields match the "Sailwindow Restajurants" Google
Sheet / Mailmeteor tab columns — see `docs/sailwindow-restaurants-import.md`.
Paste directly into Mailmeteor; `{{first_name}}` defaults to "there" for
rows with no known contact name.*

---

**Subject:** A free way to reach sailors the moment they dock near {{marina_name}}

Hi {{first_name}},

I'm Russ Jamieson, builder of SailWindow (sailwindow.com) — an app used by sailors up and down the Gulf Coast to plan their day on the water. When one of our subscribers docks near {{marina_name}}, the app shows them a short list of nearby places to eat before they even step off the boat, and I'd like {{restaurant_name}} to be one of them.

**Here's the offer:** tell me any discount you're comfortable giving SailWindow sailors — 10% off, a free appetizer, whatever makes sense for you — and we'll feature {{restaurant_name}} at the top of that list, ahead of the regular listings, every time a sailor's nearest marina is {{marina_name}}.

**How it works day to day:**
- There's no cost to participate — no fee, no contract.
- The sailor shows their phone screen to your staff; you honor the discount. No codes to track, nothing to report back to us.
- If it's ever not working for you, one email and we'll pull your listing within 48 hours — no hard feelings, either direction.

If you're interested, just reply with the offer you'd like to run and I'll get {{restaurant_name}} set up. I'll send over a one-page guide for your staff once it's live, so anyone at the register knows exactly what to look for.

Fair winds,

Russ Jamieson
SailWindow · sailwindow.com · 404-585-1950

---
*If you'd rather not hear from us again, just reply "no thanks" — no hard feelings.*
*Rj Marketing d/b/a SailWindow · [business mailing address]*

## Compliance footnote (commercial email)

Same CAN-SPAM basics as the yacht-club templates: truthful subject line,
physical business address in the footer, a working opt-out honored
promptly. Keep the last two lines in every send.

## After they say yes

Fill in their confirmed offer on `dist-v6/partner-guide.html` (or generate
one per restaurant) and send it along — that's the one-page guide
referenced above. Then add the row to the `marina_data.json` seed via
`scripts/convert-sailwindow-restaurants.js` with `partner: true` and the
matching `discount_offer` text so it shows up correctly in the app.
