import { type NextRequest } from "next/server";
import { authenticateApi } from "@/lib/api-auth";
import { findApplication } from "@/lib/api-applications";
import { loadProfileFacts } from "@/lib/profile-facts";
import { jobCountryOf } from "@/lib/apply-kit";
import type { KitPayload } from "@/lib/autofill";

// GET /api/v1/kit?url=<posting or application form URL>: profile facts plus the latest apply kit.
export async function GET(req: NextRequest) {
  const caller = await authenticateApi(req);
  if (caller instanceof Response) return caller;
  const { db, userId } = caller;

  const url = req.nextUrl.searchParams.get("url") ?? "";
  if (!/^https?:\/\//i.test(url) || url.length > 2048) return Response.json({ error: "Pass the posting's URL as ?url=." }, { status: 400 });

  // profiles.email can be empty; the sign-in email is the fallback, as in the apply kit.
  const { data: user } = await db.auth.admin.getUserById(userId);
  const [{ facts }, { app }] = await Promise.all([loadProfileFacts(db, userId, user.user?.email), findApplication(db, userId, url)]);
  const kit = (app?.kit ?? null) as { answers?: KitPayload["answers"]; cover_letter?: string } | null;
  const body: KitPayload = {
    facts,
    jobCountry: jobCountryOf(app?.job_url ?? url, facts.country),
    application: app ? { id: app.id, company: app.company_name, role: app.role_title } : null,
    answers: Array.isArray(kit?.answers) ? kit.answers : [],
    coverLetter: typeof kit?.cover_letter === "string" ? kit.cover_letter : "",
  };
  return Response.json(body, { headers: { "Cache-Control": "no-store" } });
}
