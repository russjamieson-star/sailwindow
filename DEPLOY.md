# Deploying SailWindow

## Cloudflare Pages — DEPLOYED ✓ (June 10, 2026)

- Live: **https://sailwindow.com** + www (custom domains active) and https://sailwindow-8l3.pages.dev (project `sailwindow`)
- Wrangler is logged in on this Mac.
- Note: Pages custom domains must be activated via the dashboard wizard ("Set up a custom domain") — API attachment alone stays pending forever.

**To ship an update** (after editing SailWindow-V5.html or the guide):
```bash
cd ~/Desktop/SailWindow
cp SailWindow-V5.html dist/index.html && cp SailWindow-V5.html dist/ && cp SailWindow-Instructions.html dist/
npx wrangler pages deploy dist --project-name=sailwindow --branch main
```
(The battlecard is internal — never copy it into dist/.)

## Stripe (already configured — LIVE mode)

| Object | ID |
|---|---|
| Product | `prod_UgHhvJ9JaSrSpE` (SailWindow Pro) |
| Price monthly $5.99 | `price_1Tgv8Z80XXRgQXiKJxGSct7k` |
| Price annual $49 | `price_1Tgv8i80XXRgQXiKu1l0XxcA` |
| Payment link monthly | https://buy.stripe.com/28EeV73mk86kaUuc6Q7Re00 |
| Payment link annual | https://buy.stripe.com/4gM8wJf521HW8MmeeY7Re01 |

The app's subscribe modal opens these links; after paying, the user taps
"I've paid — Activate" (honor-system unlock stored in localStorage).

**Recommended dashboard follow-ups (5 min):**
- Settings → Business → statement descriptor: set to `SAILWINDOW` (account currently shows "Rj Marketing" — consider a separate Stripe account for SailWindow under the same login).
- Settings → Billing → Customer Portal: enable, so subscribers can cancel/update cards themselves (the guide already promises this).
- Payment link → After payment: optionally redirect to your Pages URL with a thank-you note.

## Phase 1 (later): real entitlement

When honor-system activation isn't enough: a small Cloudflare Worker +
KV that (1) creates Checkout sessions, (2) receives Stripe webhooks
(`checkout.session.completed`, `customer.subscription.updated/deleted`),
(3) answers "is this email subscribed?" for the app. Ask Claude to
scaffold it when you're ready — requires `npx wrangler login` first.
