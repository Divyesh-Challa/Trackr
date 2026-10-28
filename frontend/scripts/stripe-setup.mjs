// One-time Stripe setup (test or live, depending on the key in frontend/.env.local):
//   node scripts/stripe-setup.mjs [https://your-site.example]
// Creates the "Trackr Pro" product with monthly/yearly CAD prices (found later by lookup
// key), a customer-portal configuration, and the webhook endpoint. Writes
// STRIPE_WEBHOOK_SECRET into frontend/.env.local without printing it. Safe to re-run.
import { readFileSync, writeFileSync } from "node:fs";
import Stripe from "stripe";

const ENV = new URL("../.env.local", import.meta.url);
const env = readFileSync(ENV, "utf8");
const key = env.match(/^STRIPE_SECRET_KEY=(.+)$/m)?.[1]?.trim();
if (!key) throw new Error("Put STRIPE_SECRET_KEY in frontend/.env.local first.");
const site = (process.argv[2] ?? "https://trackr-vercel-app.vercel.app").replace(/\/$/, "");
const stripe = new Stripe(key);

const PRICES = [
  { lookup_key: "trackr_pro_monthly", unit_amount: 1500, recurring: { interval: "month" }, nickname: "Pro monthly" },
  { lookup_key: "trackr_pro_yearly", unit_amount: 14400, recurring: { interval: "year" }, nickname: "Pro yearly" },
];

const existing = await stripe.prices.list({ lookup_keys: PRICES.map((p) => p.lookup_key), limit: 10 });
let productId = existing.data[0]?.product;
if (!productId) {
  const product = await stripe.products.create({ name: "Trackr Pro", description: "Unlimited applications and AI tools for your internship search." });
  productId = product.id;
}
for (const p of PRICES) {
  if (existing.data.some((e) => e.lookup_key === p.lookup_key)) continue;
  await stripe.prices.create({ ...p, product: typeof productId === "string" ? productId : productId.id, currency: "cad" });
  console.log(`Created price ${p.lookup_key}`);
}

const configs = await stripe.billingPortal.configurations.list({ limit: 1, is_default: true });
if (!configs.data.length) {
  await stripe.billingPortal.configurations.create({
    business_profile: { privacy_policy_url: `${site}/privacy`, terms_of_service_url: `${site}/terms` },
    features: {
      invoice_history: { enabled: true },
      payment_method_update: { enabled: true },
      subscription_cancel: { enabled: true, mode: "at_period_end" },
    },
  });
  console.log("Created customer portal configuration");
}

const url = `${site}/api/stripe/webhook`;
const hooks = await stripe.webhookEndpoints.list({ limit: 100 });
if (hooks.data.some((h) => h.url === url)) {
  console.log(`Webhook for ${url} already exists (its secret was written on first run).`);
} else {
  const hook = await stripe.webhookEndpoints.create({
    url,
    enabled_events: ["checkout.session.completed", "customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted"],
  });
  const line = `STRIPE_WEBHOOK_SECRET=${hook.secret}`;
  writeFileSync(ENV, /^STRIPE_WEBHOOK_SECRET=.*$/m.test(env) ? env.replace(/^STRIPE_WEBHOOK_SECRET=.*$/m, line) : `${env.trimEnd()}\n${line}\n`);
  console.log(`Created webhook for ${url}; STRIPE_WEBHOOK_SECRET saved to frontend/.env.local.`);
}
console.log("Done. Add STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET and SUPABASE_SERVICE_ROLE_KEY to Vercel (Production).");
