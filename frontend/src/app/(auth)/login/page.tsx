"use client";

import React, { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Mail, Loader2, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { safeNextPath } from "@/lib/safe-redirect";

function LoginForm() {
  const searchParams = useSearchParams();
  const next = safeNextPath(searchParams.get("next"));
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(
    searchParams.get("error") ? "That sign-in link is invalid or has expired. Try again." : null
  );

  const redirectTo = () =>
    `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

  const sendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setStatus("sending");
    const { error } = await createClient().auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: redirectTo() },
    });
    if (error) {
      setError(error.message);
      setStatus("idle");
    } else {
      setStatus("sent");
    }
  };

  const signInWithGoogle = async () => {
    setError(null);
    const { error } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: redirectTo() },
    });
    if (error) setError(error.message);
  };

  return (
    <div className="mx-auto mt-16 w-full max-w-sm rounded-2xl border border-slate-200 bg-surface p-6 shadow-sm">
      <h1 className="text-xl font-semibold text-slate-900">Sign in to Trackr</h1>
      <p className="mt-1 text-sm text-slate-600">
        Track your internship applications in one place.
      </p>

      {status === "sent" ? (
        <div className="mt-6 flex gap-3 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800" role="status">
          <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden />
          <p>
            Check <strong>{email}</strong> for a sign-in link.
          </p>
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={signInWithGoogle}
            className="mt-6 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-50"
          >
            Continue with Google
          </button>

          <div className="my-5 flex items-center gap-3 text-xs text-slate-500">
            <span className="h-px flex-1 bg-slate-200" />
            or
            <span className="h-px flex-1 bg-slate-200" />
          </div>

          <form onSubmit={sendMagicLink} className="space-y-3">
            <label htmlFor="email" className="block text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-[#0066FF] focus:outline-none focus:ring-2 focus:ring-[#0066FF]/20"
            />
            <button
              type="submit"
              disabled={status === "sending"}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0066FF] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#0052cc] disabled:opacity-60"
            >
              {status === "sending" ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Mail className="h-4 w-4" aria-hidden />
              )}
              Email me a sign-in link
            </button>
          </form>
        </>
      )}

      {error && (
        <p className="mt-4 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
