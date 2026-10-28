import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";

export async function POST(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const stripe = getStripe();
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.redirect(`${origin}/login?next=/pricing`, 303);
  if (!stripe) return NextResponse.redirect(`${origin}/pricing?billing=unavailable`, 303);

  // Readable under RLS: users can see their own subscription row.
  const { data: sub } = await supabase.from("subscriptions").select("stripe_customer_id").maybeSingle();
  if (!sub?.stripe_customer_id) return NextResponse.redirect(`${origin}/pricing`, 303);

  const portal = await stripe.billingPortal.sessions.create({
    customer: sub.stripe_customer_id,
    return_url: `${origin}/pricing`,
  });
  return NextResponse.redirect(portal.url, 303);
}
