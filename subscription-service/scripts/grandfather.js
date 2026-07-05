// One-off script to seed Firestore with the existing subscribers who already
// have access via the old localStorage-trust flow, so they don't lose access
// or hit a re-verification wall when the client switches to backend checks.
//
// Usage:
//   gcloud auth application-default login
//   node scripts/grandfather.js subscribers.json
//
// subscribers.json is an array of:
//   [{ "email": "captain@boat.com", "customerId": "cus_ABC123", "plan": "month" }, ...]
//
// customerId should be the real Stripe customer ID (found in the Stripe
// dashboard under Customers) so future webhook events for that customer merge
// into the same record. If you don't have it yet, use a placeholder like
// "manual_captain-boat-com" — it'll get overwritten once that customer's
// Stripe events start flowing in, since events are looked up by email in
// /subscription-status regardless of the doc ID.

const fs = require("fs");
const { Firestore } = require("@google-cloud/firestore");

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error("Usage: node scripts/grandfather.js <subscribers.json>");
    process.exit(1);
  }

  const entries = JSON.parse(fs.readFileSync(file, "utf8"));
  const db = new Firestore();
  const subscribers = db.collection("subscribers");

  for (const entry of entries) {
    const email = String(entry.email || "").trim().toLowerCase();
    const customerId = entry.customerId || `manual_${email.replace(/[^a-z0-9]/g, "-")}`;
    if (!email) {
      console.warn("Skipping entry with no email:", entry);
      continue;
    }
    await subscribers.doc(customerId).set(
      {
        stripeCustomerId: customerId,
        email,
        status: "active",
        plan: entry.plan || null,
        currentPeriodEnd: null,
        grandfathered: true,
        updatedAt: Firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    console.log(`Seeded ${email} -> ${customerId}`);
  }

  console.log(`Done. Seeded ${entries.length} subscriber(s).`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
