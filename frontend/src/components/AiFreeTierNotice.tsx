import Link from "next/link";

/** Shown wherever AI runs on a free model tier, before the user sends anything. */
export function AiFreeTierNotice() {
  return (
    <p className="text-xs text-slate-500">
      Free during early access. These tools run on Google&apos;s Gemini free tier, and Google may use what you send
      (job text, your resume bullets and your questions) to improve its products. <Link href="/privacy" className="underline">Details</Link>
    </p>
  );
}
