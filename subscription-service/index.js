const express = require("express");
const Stripe = require("stripe");
const { Firestore } = require("@google-cloud/firestore");

const PORT = process.env.PORT || 8080;
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
// Matches sailwindow.com and any subdomain (atlantic., greatlakes., mississippi., ...)
// over https, so a new edition subdomain never needs a redeploy of this allowlist.
const ALLOWED_ORIGIN_PATTERN = process.env.ALLOWED_ORIGIN_PATTERN
  ? new RegExp(process.env.ALLOWED_ORIGIN_PATTERN)
  : /^https:\/\/([a-z0-9-]+\.)*sailwindow\.com$/;

if (!STRIPE_SECRET_KEY) throw new Error("Missing STRIPE_SECRET_KEY env var");
if (!STRIPE_WEBHOOK_SECRET) throw new Error("Missing STRIPE_WEBHOOK_SECRET env var");

const stripe = new Stripe(STRIPE_SECRET_KEY);
const db = new Firestore();
const subscribers = db.collection("subscribers");

const app = express();

function withCors(req, res) {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGIN_PATTERN.test(origin)) res.set("Access-Control-Allow-Origin", origin);
  res.set("Vary", "Origin");
}

// Which edition(s) a subscription unlocks is read from the Stripe Price's own
// metadata (key "editions", comma-separated, e.g. "gulf" or "gulf,atlantic")
// rather than hardcoded here — so adding/rewiring an edition or bundle is a
// Stripe Dashboard edit, not a code deploy. See DEPLOY.md for the one-time
// step of tagging each existing Price.
function editionsFromSubscription(subscription) {
  const price = subscription.items?.data?.[0]?.price;
  const raw = price?.metadata?.editions || "";
  return raw.split(",").map(s => s.trim()).filter(Boolean);
}

app.get("/", (req, res) => res.status(200).send("ok"));

// Looks up subscription status by email. Client calls this after Stripe
// checkout (and on subsequent app loads) instead of trusting a local flag.
app.get("/subscription-status", async (req, res) => {
  withCors(req, res);
  const email = String(req.query.email || "").trim().toLowerCase();
  if (!email) return res.status(400).json({ error: "email is required" });

  const snap = await subscribers.where("email", "==", email).limit(1).get();
  if (snap.empty) return res.json({ status: "none" });

  const sub = snap.docs[0].data();
  return res.json({
    status: sub.status,
    plan: sub.plan || null,
    editions: sub.editions || [],
    currentPeriodEnd: sub.currentPeriodEnd || null,
  });
});

app.options("/subscription-status", (req, res) => {
  withCors(req, res);
  res.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.status(204).send();
});

// Stripe webhook needs the raw request body to verify the signature, so this
// route is mounted with express.raw() instead of the app-wide json parser.
app.post("/stripe-webhook", express.raw({ type: "application/json" }), async (req, res) => {
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, req.headers["stripe-signature"], STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    await handleStripeEvent(event);
    res.status(200).send();
  } catch (err) {
    console.error(`Error handling event ${event.id} (${event.type}):`, err);
    res.status(500).send();
  }
});

async function handleStripeEvent(event) {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      if (session.mode !== "subscription") return;
      const email = (session.customer_details?.email || session.customer_email || "").toLowerCase();
      if (!email || !session.customer) return;
      const subscription = await stripe.subscriptions.retrieve(session.subscription);
      await upsertSubscriber(session.customer, {
        email,
        status: subscription.status,
        plan: planFromSubscription(subscription),
        editions: editionsFromSubscription(subscription),
        currentPeriodEnd: subscription.current_period_end,
      });
      break;
    }
    case "invoice.paid": {
      const invoice = event.data.object;
      if (!invoice.customer || !invoice.subscription) return;
      const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
      await upsertSubscriber(invoice.customer, {
        status: subscription.status,
        plan: planFromSubscription(subscription),
        editions: editionsFromSubscription(subscription),
        currentPeriodEnd: subscription.current_period_end,
      });
      break;
    }
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = event.data.object;
      // On cancellation this still records which editions the (now-inactive)
      // plan covered; the client gates on `status`, not on editions being
      // empty, so a lapsed subscriber correctly loses access either way.
      await upsertSubscriber(subscription.customer, {
        status: subscription.status,
        plan: planFromSubscription(subscription),
        editions: editionsFromSubscription(subscription),
        currentPeriodEnd: subscription.current_period_end,
      });
      break;
    }
    default:
      // ignore anything else Stripe sends to this endpoint
      break;
  }
}

function planFromSubscription(subscription) {
  return subscription.items?.data?.[0]?.price?.recurring?.interval || null;
}

async function upsertSubscriber(customerId, fields) {
  await subscribers.doc(customerId).set(
    { stripeCustomerId: customerId, updatedAt: Firestore.FieldValue.serverTimestamp(), ...fields },
    { merge: true }
  );
}

app.listen(PORT, () => console.log(`sailwindow-subscription-service listening on ${PORT}`));
