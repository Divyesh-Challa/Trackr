import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./supabase/database.types";
import { termLabel } from "./feed";
import type { ProfileFacts } from "./apply-kit";

/**
 * What the profile knows, for filling forms. Filters by user id explicitly so the service-role
 * client (API token requests) reads the same rows as the user's own session would.
 */
export async function loadProfileFacts(
  supabase: SupabaseClient<Database>,
  userId: string,
  fallbackEmail = ""
): Promise<{ facts: ProfileFacts; hasProfile: boolean }> {
  const [{ data: p }, { data: a }] = await Promise.all([
    supabase.from("profiles").select("full_name, email, phone, linkedin_url, github_url, website_url, school, grad_term").eq("id", userId).single(),
    supabase.from("application_profiles").select("*").eq("user_id", userId).maybeSingle(),
  ]);
  return {
    hasProfile: Boolean(a),
    facts: {
      full_name: p?.full_name ?? "",
      email: p?.email || fallbackEmail,
      phone: p?.phone ?? "",
      linkedin_url: p?.linkedin_url ?? "",
      github_url: p?.github_url || p?.website_url || "",
      school: p?.school ?? "",
      grad_label: p?.grad_term ? termLabel(p.grad_term) : "",
      street: a?.street ?? "",
      city: a?.city ?? "",
      region: a?.region ?? "",
      postal_code: a?.postal_code ?? "",
      country: a?.country ?? "Canada",
      work_auth: (a?.work_auth ?? {}) as ProfileFacts["work_auth"],
      willing_to_relocate: a?.willing_to_relocate ?? null,
      in_person_ok: a?.in_person_ok ?? null,
      earliest_start: a?.earliest_start ?? "",
      eeo: { gender: a?.gender, race_ethnicity: a?.race_ethnicity, indigenous: a?.indigenous, veteran: a?.veteran, disability: a?.disability },
    },
  };
}
