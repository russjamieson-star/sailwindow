const express = require("express");
const Stripe = require("stripe");
const { Firestore } = require("@google-cloud/firestore");

const PORT = process.env.PORT || 8080;
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "https://sailwindow.com")
  .split(",")
  .map(s => s.trim());

if (!STRIPE_SECRET_KEY) throw new Error("Missing STRIPE_SECRET_KEY env var");
if (!STRIPE_WEBHOOK_SECRET) throw new Error("Missing STRIPE_WEBHOOK_SECRET env var");

const stripe = new Stripe(STRIPE_SECRET_KEY);
const db = new Firestore();
const subscribers = db.collection("subscribers");

const app = express();

function withCors(req, res) {
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes(origin)) res.set("Access-Control-Allow-Origin", origin);
  res.set("Vary", "Origin");
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
        currentPeriodEnd: subscription.current_period_end,
      });
      break;
    }
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = event.data.object;
      await upsertSubscriber(subscription.customer, {
        status: subscription.status,
        plan: planFromSubscription(subscription),
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
