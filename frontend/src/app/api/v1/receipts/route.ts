import { authenticateApi } from "@/lib/api-auth";
import { findApplication } from "@/lib/api-applications";
import { saveReceipt } from "@/lib/receipts";

// POST /api/v1/receipts {job_url, answers, cover_letter?, company?, role?}: what the extension saw
// in the form when the user pressed Submit. Adds the job to the tracker if it isn't there yet.
export async function POST(req: Request) {
  const caller = await authenticateApi(req);
  if (caller instanceof Response) return caller;
  const { db, userId } = caller;

  const body = (await req.json().catch(() => null)) as {
    job_url?: unknown; answers?: unknown; cover_letter?: unknown; company?: unknown; role?: unknown;
  } | null;
  const jobUrl = typeof body?.job_url === "string" ? body.job_url : "";
  if (!/^https?:\/\//i.test(jobUrl) || jobUrl.length > 2048 || !Array.isArray(body?.answers)) {
    return Response.json({ error: "Send job_url and an answers array." }, { status: 400 });
  }

  const { job, app } = await findApplication(db, userId, jobUrl);
  let applicationId = app?.id;
  if (!applicationId) {
    const company = (job?.company_name ?? (typeof body.company === "string" ? body.company : "")).trim().slice(0, 200);
    const role = (job?.title ?? (typeof body.role === "string" ? body.role : "")).trim().slice(0, 200);
    if (!company || !role) return Response.json({ error: "Couldn't tell which job this is. Add it to Trackr first." }, { status: 404 });
    const { data, error } = await db
      .from("applications")
      .insert({
        user_id: userId,
        company_name: company,
        role_title: role,
        job_id: job?.id ?? null,
        job_url: job?.job_url ?? jobUrl,
        location: job?.locations[0]?.slice(0, 200) ?? null,
        work_model: job?.work_model ?? null,
      })
      .select("id")
      .single();
    if (error) return Response.json({ error: "Couldn't add the job to your tracker." }, { status: 500 });
    applicationId = data.id;
  }

  const saved = await saveReceipt(db, userId, {
    applicationId,
    answers: body.answers as { section: string; label: string; value: string; options?: string[] }[],
    resumeBullets: null,
    coverLetter: typeof body.cover_letter === "string" ? body.cover_letter : null,
    jobUrl,
    source: "extension",
  });
  if (!saved) return Response.json({ error: "Couldn't save the receipt." }, { status: 500 });
  return Response.json({ ok: true, application_id: applicationId }, { status: 201 });
}
