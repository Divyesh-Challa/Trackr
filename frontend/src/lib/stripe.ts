import "server-only";
import Stripe from "stripe";

// Prices are found by lookup key, so no price IDs need to live in env vars.
export const PLANS = {
  monthly: { lookupKey: "trackr_pro_monthly", label: "$15 CAD / month" },
  yearly: { lookupKey: "trackr_pro_yearly", label: "$144 CAD / year" },
} as const;
export type Plan = keyof typeof PLANS;

let client: Stripe | null | undefined;

/** The Stripe client, or null while billing isn't configured (no secret key). */
export function getStripe(): Stripe | null {
  if (client === undefined) {
    const key = process.env.STRIPE_SECRET_KEY;
    client = key ? new Stripe(key) : null;
  }
  return client;
}

export function billingConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY);
}
