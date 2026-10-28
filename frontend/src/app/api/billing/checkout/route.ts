import { NextResponse, type NextRequest } from "next/server";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PLANS, getStripe, type Plan } from "@/lib/stripe";

export async function POST(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const stripe = getStripe();
  const admin = createAdminClient();
  if (!stripe || !admin) return NextResponse.redirect(`${origin}/pricing?billing=unavailable`, 303);

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.redirect(`${origin}/login?next=/pricing`, 303);

  const form = await request.formData();
  const plan = (form.get("plan") === "yearly" ? "yearly" : "monthly") as Plan;
  try {
    return NextResponse.redirect(await createCheckout(stripe, admin, auth.user, plan, origin), 303);
  } catch (err) {
    // A bad key or a Stripe outage shouldn't be a blank 500; the error still reaches the logs.
    console.error("checkout failed", err);
    return NextResponse.redirect(`${origin}/pricing?billing=error`, 303);
  }
}

async function createCheckout(
  stripe: NonNullable<ReturnType<typeof getStripe>>,
  admin: NonNullable<ReturnType<typeof createAdminClient>>,
  user: User,
  plan: Plan,
  origin: string
): Promise<string> {
  const { data: prices } = await stripe.prices.list({ lookup_keys: [PLANS[plan].lookupKey], active: true, limit: 1 });
  const price = prices[0];
  if (!price) return `${origin}/pricing?billing=unavailable`;

  // Reuse the user's Stripe customer so their history and portal stay in one place.
  const { data: existing } = await admin
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();
  let customerId = existing?.stripe_customer_id ?? null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { user_id: user.id },
    });
    customerId = customer.id;
    await admin.from("subscriptions").upsert({ user_id: user.id, stripe_customer_id: customerId });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    client_reference_id: user.id,
    line_items: [{ price: price.id, quantity: 1 }],
    subscription_data: { metadata: { user_id: user.id } },
    allow_promotion_codes: true,
    success_url: `${origin}/board?upgraded=1`,
    cancel_url: `${origin}/pricing`,
  });
  return session.url!;
}
