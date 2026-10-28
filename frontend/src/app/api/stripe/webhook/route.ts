import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// The only writer of public.subscriptions. Every event is signature-verified.
export async function POST(request: NextRequest) {
  const stripe = getStripe();
  const admin = createAdminClient();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !admin || !secret) return NextResponse.json({ error: "billing not configured" }, { status: 503 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(await request.text(), request.headers.get("stripe-signature") ?? "", secret);
  } catch {
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  const save = async (sub: Stripe.Subscription, fallbackUserId?: string | null) => {
    const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
    let userId = sub.metadata?.user_id || fallbackUserId || null;
    if (!userId) {
      const { data } = await admin.from("subscriptions").select("user_id").eq("stripe_customer_id", customerId).maybeSingle();
      userId = data?.user_id ?? null;
    }
    if (!userId) throw new Error(`no user for customer ${customerId}`);
    const item = sub.items.data[0];
    const { error } = await admin.from("subscriptions").upsert({
      user_id: userId,
      stripe_customer_id: customerId,
      stripe_subscription_id: sub.id,
      status: sub.status,
      price_lookup_key: item?.price.lookup_key ?? null,
      current_period_end: item?.current_period_end ? new Date(item.current_period_end * 1000).toISOString() : null,
      cancel_at_period_end: sub.cancel_at_period_end,
    });
    if (error) throw new Error(error.message);
  };

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        if (session.mode === "subscription" && session.subscription) {
          const subId = typeof session.subscription === "string" ? session.subscription : session.subscription.id;
          await save(await stripe.subscriptions.retrieve(subId), session.client_reference_id);
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await save(event.data.object);
        break;
    }
  } catch (err) {
    // A 500 makes Stripe retry the event later.
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}
