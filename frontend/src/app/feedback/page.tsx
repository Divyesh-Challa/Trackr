"use client";

import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

const KINDS = [
  { code: "bug", label: "Bug report" },
  { code: "feature", label: "Feature request" },
  { code: "job_data", label: "Wrong job data" },
  { code: "design", label: "Design" },
  { code: "other", label: "Other" },
] as const;

export default function FeedbackPage() {
  const [kind, setKind] = useState<(typeof KINDS)[number]["code"]>("bug");
  const [message, setMessage] = useState("");
  const [wantsReply, setWantsReply] = useState(false);
  const send = useMutation({
    mutationFn: async () => {
      const { error } = await createClient().from("feedback").insert({ kind, message: message.trim(), wants_reply: wantsReply });
      if (error) {
        throw new Error(error.message.includes("feedback_daily_limit") ? "You've sent a lot today. Please try again tomorrow." : "Couldn't send that. Please try again.");
      }
    },
  });

  if (send.isSuccess) {
    return (
      <div className="mx-auto max-w-xl py-12 text-center">
        <h1 className="font-serif text-3xl font-semibold text-slate-900">Thank you</h1>
        <p className="mt-2 text-slate-600">Your feedback was sent. {wantsReply ? "You'll get a reply at your account email." : ""}</p>
        <button type="button" onClick={() => { setMessage(""); send.reset(); }} className="mt-6 text-sm font-medium text-accent underline">
          Send another
        </button>
      </div>
    );
  }

  return (
    <form
      className="mx-auto max-w-xl space-y-5 py-8"
      onSubmit={(e) => {
        e.preventDefault();
        send.mutate();
      }}
    >
      <header>
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-slate-900">Share feedback</h1>
        <p className="mt-1 text-sm text-slate-600">Found a bug, a wrong listing, or something missing? Tell us.</p>
      </header>
      <fieldset>
        <legend className="text-sm font-medium text-slate-700">What kind of feedback?</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {KINDS.map((k) => (
            <button
              key={k.code}
              type="button"
              aria-pressed={kind === k.code}
              onClick={() => setKind(k.code)}
              className={`rounded-xl border px-3 py-1.5 text-[13px] font-medium ${
                kind === k.code ? "border-accent bg-blue-50 text-accent" : "border-slate-200 bg-surface text-slate-700 hover:bg-slate-50"
              }`}
            >
              {k.label}
            </button>
          ))}
        </div>
      </fieldset>
      <div>
        <label htmlFor="feedback-message" className="text-sm font-medium text-slate-700">Details</label>
        <textarea
          id="feedback-message"
          required
          minLength={5}
          maxLength={4000}
          rows={6}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="mt-2 w-full rounded-xl border border-slate-300 bg-surface p-3 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" checked={wantsReply} onChange={(e) => setWantsReply(e.target.checked)} />
        I&apos;d like a reply
      </label>
      {send.isError && <p role="alert" className="text-sm text-red-600">{send.error.message}</p>}
      <button
        type="submit"
        disabled={send.isPending || message.trim().length < 5}
        className="rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-accent-ink hover:bg-accent-hover disabled:opacity-60"
      >
        {send.isPending ? "Sending…" : "Send feedback"}
      </button>
    </form>
  );
}
