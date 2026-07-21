# Deploying the subscription service

These are the manual steps only you can do (GCP project access, Stripe account
access). Do them in order — each one unblocks the next. Easiest path: open
https://console.cloud.google.com, pick the SailWindow project, and click the
`>_` "Activate Cloud Shell" icon in the top right. Cloud Shell already has
`gcloud` installed and authenticated as you, so you don't need to install
anything locally.

Confirm your exact project ID first (Cloud Console → top bar, next to the
project name) and swap it in everywhere below as `PROJECT_ID`.

## 1. Enable the required APIs

```
gcloud services enable run.googleapis.com firestore.googleapis.com \
  cloudbuild.googleapis.com artifactregistry.googleapis.com \
  --project=PROJECT_ID
```

## 2. Create the Firestore database

Console → Firestore → Create Database → **Native mode** → pick a region
close to your Cloud Run region (e.g. `us-east1`). Or:

```
gcloud firestore databases create --location=us-east1 --project=PROJECT_ID
```

## 3. Get your Stripe secret key

Stripe Dashboard → Developers → API keys → reveal the **live** secret key
(`sk_live_...`) — your Payment Links in the code are live, so this needs to
be the live key, not test. Keep it somewhere safe; you'll paste it in step 5.

## 4. Tag each Stripe Price with which edition(s) it unlocks

The service figures out what a subscriber is entitled to from the **Price**
they paid for, not from code — so a new edition or bundle later is a Stripe
edit, not a redeploy. For every live Price (Products → each product → each
Price), Stripe Dashboard → edit the Price → **Metadata** → add:

| Price | metadata key | value |
|---|---|---|
| SailWindow Pro (monthly + annual) | `editions` | `gulf` |
| SailWindow Atlantic (monthly + annual) | `editions` | `atlantic` |
| SailWindow Bundle ($10/mo) | `editions` | `gulf,atlantic` |
| SailWindow Great Lakes | `editions` | `greatlakes` |
| SailWindow Mississippi | `editions` | `mississippi` |
| 3-Edition Bundle | `editions` | *(whichever 3 — not yet decided, see TODO.md)* |
| 4-Edition Bundle (Grand Loop) | `editions` | `gulf,atlantic,greatlakes,mississippi` |

Comma-separated, no spaces needed (the service trims each value). Skip any
Price with no app content live yet (Great Lakes/Mississippi/Trio today) —
add its metadata whenever that edition actually ships, no code change needed
on this end.

## 5. Deploy the Cloud Run service

From Cloud Shell, upload or `git clone` this `subscription-service/` folder
(or use the Cloud Shell Editor's upload button), then from inside that
folder:

```
gcloud run deploy sailwindow-subscription \
  --source=. \
  --region=us-east1 \
  --project=PROJECT_ID \
  --allow-unauthenticated \
  --set-env-vars=STRIPE_SECRET_KEY=sk_live_...,STRIPE_WEBHOOK_SECRET=placeholder
```

No `ALLOWED_ORIGINS` var needed — the service now allows any `https://*.sailwindow.com`
origin by default (so a future `greatlakes.`/`mississippi.` subdomain just works).
Only set `ALLOWED_ORIGIN_PATTERN` if you ever need to override that.

This builds and deploys straight from source — no Docker install needed.
When it finishes it prints a **service URL** like
`https://sailwindow-subscription-xxxxx-ue.a.run.app`. Save that — you need it
in step 6 and 10.

(`STRIPE_WEBHOOK_SECRET` is a placeholder for now because Stripe won't give
you the real one until the endpoint exists — that's step 6.)

## 6. Create the Stripe webhook endpoint

Stripe Dashboard → Developers → Webhooks → Add endpoint:
- **URL:** `<your Cloud Run URL>/stripe-webhook`
- **Events to send:** `checkout.session.completed`, `invoice.paid`,
  `customer.subscription.updated`, `customer.subscription.deleted`

After creating it, click into the endpoint and reveal the **signing secret**
(`whsec_...`).

## 7. Update Cloud Run with the real webhook secret

```
gcloud run services update sailwindow-subscription \
  --region=us-east1 --project=PROJECT_ID \
  --update-env-vars=STRIPE_WEBHOOK_SECRET=whsec_...
```

## 8. Test the webhook

In the Stripe webhook endpoint page, use "Send test webhook" for
`checkout.session.completed`. Then check Cloud Run logs:

```
gcloud run services logs read sailwindow-subscription --region=us-east1 --project=PROJECT_ID
```

You should see a 200, and a new document under the `subscribers` collection
in the Firestore console (Firestore → Data) — including an `editions` array
matching whatever you tagged on that test event's Price in step 4.

## 9. Grandfather the current 4-5 subscribers

So they never see a "please verify" wall: pull their emails and Stripe
customer IDs from Stripe Dashboard → Customers, and build a small JSON file:

```json
[
  { "email": "captain@boat.com", "customerId": "cus_ABC123", "plan": "month", "editions": ["gulf"] }
]
```

`editions` defaults to `["gulf"]` if omitted (everyone grandfathered predates
Atlantic), so only spell it out for anyone who should unlock more than one.

From your machine (needs `gcloud` installed locally, or run it from Cloud
Shell after uploading the file):

```
gcloud auth application-default login
cd subscription-service
npm install
node scripts/grandfather.js subscribers.json
```

## 10. Point the client at the real backend

Take the Cloud Run URL from step 5 and paste it as `backendUrl` in place of
`"#"` in **four** places (all currently placeholders):
- `shared/config.gulf.js` and `shared/config.atlantic.js` (the canonical copies)
- the inline `EDITION_CONFIG` block in `dist/index.html`, `dist-v8/index.html`,
  and `dist-atlantic/index.html` (the deployed copies — these are what actually
  ship; the `shared/` files are reference only, same pattern as `engine.js`)

Then redeploy each Cloudflare Pages project so the change goes live.

## 11. End-to-end check before calling it done

- Incognito window → go through a real checkout → confirm "I've paid —
  Activate" (now asking for the checkout email) unlocks the app after a
  successful `/subscription-status` check.
- Same email, a *different* browser/device → tap "Already a subscriber?
  Restore access" → enter the same email → confirms cross-device access works
  without a new checkout.
- A Bundle subscriber's email, checked on the *other* edition's site →
  confirms it unlocks there too (this is what makes an in-app edition
  switcher trustworthy later).
- An email with an active subscription that doesn't cover this edition (e.g.
  Gulf-only, checked on Atlantic) → confirms the "doesn't include Atlantic
  yet" upsell message shows instead of unlocking.
- Cancel a test subscription in Stripe → confirm the app locks back down
  next time it loads (via `refreshSubscriptionStatus()`), without the user
  doing anything.
