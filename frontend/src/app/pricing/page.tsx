import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { billingConfigured } from "@/lib/stripe";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Pricing | Trackr" };

const FREE = [
  "The full Canadian internship & co-op feed",
  "Up to 50 active applications",
  "Deadlines, follow-ups, contacts and notes",
  "CSV import and export",
];
const PRO = [
  "Everything in Free",
  "Unlimited applications",
  "AI resume tailoring and cover letters from your own experience",
  "AI interview practice with feedback",
  "Daily email alerts for saved searches (coming soon)",
];

export default async function PricingPage({ searchParams }: { searchParams: Promise<{ billing?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const { data: sub } = auth.user
    ? await supabase.from("subscriptions").select("status, price_lookup_key, current_period_end, cancel_at_period_end").maybeSingle()
    : { data: null };
  const isPro = Boolean(sub && ["active", "trialing", "past_due"].includes(sub.status));
  const enabled = billingConfigured();

  const cta = (plan: "monthly" | "yearly", label: string, primary: boolean) => {
    const cls = primary
      ? "w-full rounded-xl bg-[#0066FF] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#0052cc] disabled:opacity-50"
      : "w-full rounded-xl border border-slate-300 bg-surface px-4 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50";
    if (!auth.user) return <Link href="/login?next=/pricing" className={`${cls} block text-center`}>{label}</Link>;
    return (
      <form action="/api/billing/checkout" method="post">
        <input type="hidden" name="plan" value={plan} />
        <button type="submit" disabled={!enabled} className={cls}>{label}</button>
      </form>
    );
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8 py-8">
      <header className="text-center">
        <h1 className="font-serif text-4xl font-semibold tracking-tight text-slate-900">Simple pricing</h1>
        <p className="mt-2 text-slate-600">The jobs feed and tracker are free. Pro adds unlimited tracking and AI tools.</p>
        {(params.billing === "unavailable" || !enabled) && (
          <p role="status" className="mx-auto mt-4 max-w-md rounded-xl bg-amber-50 px-4 py-2 text-sm text-amber-800">
            Pro checkout isn&apos;t open yet. Everything in Free works today.
          </p>
        )}
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <section aria-labelledby="free-plan" className="rounded-2xl border border-slate-200 bg-surface p-6">
          <h2 id="free-plan" className="text-lg font-semibold text-slate-900">Free</h2>
          <p className="mt-1 text-3xl font-semibold text-slate-900">$0</p>
          <ul className="mt-5 space-y-2 text-sm text-slate-700">
            {FREE.map((f) => (
              <li key={f} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />{f}</li>
            ))}
          </ul>
          {!auth.user && (
            <Link href="/login?next=/board" className="mt-6 block rounded-xl border border-slate-300 px-4 py-2.5 text-center text-sm font-medium text-slate-800 hover:bg-slate-50">
              Start free
            </Link>
          )}
        </section>

        <section aria-labelledby="pro-plan" className="rounded-2xl border-2 border-[#0066FF] bg-surface p-6 shadow-simplify-glow">
          <h2 id="pro-plan" className="text-lg font-semibold text-slate-900">Pro</h2>
          <p className="mt-1 text-3xl font-semibold text-slate-900">
            $15 <span className="text-base font-normal text-slate-500">CAD / month</span>
          </p>
          <p className="text-sm text-slate-600">or $144 CAD / year (save 20%)</p>
          <ul className="mt-5 space-y-2 text-sm text-slate-700">
            {PRO.map((f) => (
              <li key={f} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#0066FF]" aria-hidden />{f}</li>
            ))}
          </ul>
          <div className="mt-6 space-y-2">
            {isPro ? (
              <>
                <p className="text-sm text-emerald-700">
                  You&apos;re on Pro
                  {sub?.current_period_end
                    ? ` · ${sub.cancel_at_period_end ? "ends" : "renews"} ${new Date(sub.current_period_end).toLocaleDateString()}`
                    : ""}
                </p>
                <form action="/api/billing/portal" method="post">
                  <button type="submit" className="w-full rounded-xl border border-slate-300 bg-surface px-4 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-50">
                    Manage billing
                  </button>
                </form>
              </>
            ) : (
              <>
                {cta("monthly", "Get Pro monthly", true)}
                {cta("yearly", "Get Pro yearly", false)}
              </>
            )}
          </div>
          <p className="mt-4 text-xs text-slate-500">
            Cancel anytime. Full refund within 14 days of your first payment. See the <Link href="/terms" className="underline">terms</Link>.
          </p>
        </section>
      </div>
    </div>
  );
}
