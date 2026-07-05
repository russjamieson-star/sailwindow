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
be the live key, not test. Keep it somewhere safe; you'll paste it in step 4.

## 4. Deploy the Cloud Run service

From Cloud Shell, upload or `git clone` this `subscription-service/` folder
(or use the Cloud Shell Editor's upload button), then from inside that
folder:

```
gcloud run deploy sailwindow-subscription \
  --source=. \
  --region=us-east1 \
  --project=PROJECT_ID \
  --allow-unauthenticated \
  --set-env-vars=STRIPE_SECRET_KEY=sk_live_...,STRIPE_WEBHOOK_SECRET=placeholder,ALLOWED_ORIGINS=https://sailwindow.com
```

This builds and deploys straight from source — no Docker install needed.
When it finishes it prints a **service URL** like
`https://sailwindow-subscription-xxxxx-ue.a.run.app`. Save that — you need it
in step 6 and 8.

(`STRIPE_WEBHOOK_SECRET` is a placeholder for now because Stripe won't give
you the real one until the endpoint exists — that's step 5.)

## 5. Create the Stripe webhook endpoint

Stripe Dashboard → Developers → Webhooks → Add endpoint:
- **URL:** `<your Cloud Run URL>/stripe-webhook`
- **Events to send:** `checkout.session.completed`, `invoice.paid`,
  `customer.subscription.updated`, `customer.subscription.deleted`

After creating it, click into the endpoint and reveal the **signing secret**
(`whsec_...`).

## 6. Update Cloud Run with the real webhook secret

```
gcloud run services update sailwindow-subscription \
  --region=us-east1 --project=PROJECT_ID \
  --update-env-vars=STRIPE_WEBHOOK_SECRET=whsec_...
```

## 7. Test the webhook

In the Stripe webhook endpoint page, use "Send test webhook" for
`checkout.session.completed`. Then check Cloud Run logs:

```
gcloud run services logs read sailwindow-subscription --region=us-east1 --project=PROJECT_ID
```

You should see a 200, and a new document under the `subscribers` collection
in the Firestore console (Firestore → Data).

## 8. Grandfather the current 4-5 subscribers

So they never see a "please verify" wall: pull their emails and Stripe
customer IDs from Stripe Dashboard → Customers, and build a small JSON file:

```json
[
  { "email": "captain@boat.com", "customerId": "cus_ABC123", "plan": "month" }
]
```

From your machine (needs `gcloud` installed locally, or run it from Cloud
Shell after uploading the file):

```
gcloud auth application-default login
cd subscription-service
npm install
node scripts/grandfather.js subscribers.json
```

## 9. Point the client at the real backend

Send me the Cloud Run URL from step 4 and I'll update `BACKEND_URL` in
`index.html` (currently a placeholder at index.html:2280) and we'll publish it
together through whatever your Cloudflare Pages deploy process turns out to
be.

## 10. End-to-end check before calling it done

- Incognito window → go through a real checkout → confirm "Verify & Activate"
  unlocks the app.
- Same email, a *different* browser/device → click "Already subscribed?
  Verify your email" → confirms cross-device access works without a new
  checkout.
- Cancel a test subscription in Stripe → confirm the app locks back down
  next time it loads (via `refreshSubscriptionStatus()`).
