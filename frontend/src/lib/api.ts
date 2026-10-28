// Typed data access for the tracker and jobs feed. Every call goes straight to
// Supabase with the signed-in user's session; row-level security does the scoping.
import { createClient } from "./supabase/client";
import {
  toApplication,
  toDiscoveredJob,
  toTransition,
  statusToDb,
  workModelToDb,
} from "./mappers";
import {
  Application,
  ApplicationStatus,
  ApplicationStateTransition,
  ApplicationTask,
  ApplicationContact,
  ApplicationNote,
  DiscoveredJob,
  Profile,
} from "../types";
import type { ImportRow } from "./csv";

const supabase = () => createClient();

function unwrap<T>(result: { data: T; error: { message: string } | null }, what: string): NonNullable<T> {
  if (result.error) throw new Error(`${what}: ${result.error.message}`);
  if (result.data == null) throw new Error(`${what}: no data returned`);
  return result.data;
}

const APPLICATION_SELECT =
  "*, application_tasks(is_completed, due_date), application_contacts(count), application_notes(count)";

// -----------------------------------------------------------------------------
// Applications
// -----------------------------------------------------------------------------

export async function fetchApplications(): Promise<Application[]> {
  const rows = unwrap(
    await supabase()
      .from("applications")
      .select(APPLICATION_SELECT)
      .order("position")
      .order("updated_at", { ascending: false }),
    "Failed to load applications"
  );
  return rows.map(toApplication);
}

export async function fetchApplication(id: string): Promise<Application> {
  const row = unwrap(
    await supabase().from("applications").select(APPLICATION_SELECT).eq("id", id).single(),
    "Failed to load application"
  );
  return toApplication(row);
}

export async function createApplication(payload: {
  company_name: string;
  role_title: string;
  status?: string;
  salary_range?: string | null;
  job_location?: string;
  work_model?: "REMOTE" | "HYBRID" | "ONSITE";
  job_id?: string;
  job_url?: string;
  deadline_at?: string | null;
  follow_up_at?: string | null;
  description?: string;
  position?: number;
}): Promise<Application> {
  const status = statusToDb(payload.status ?? "WISHLIST");
  const row = unwrap(
    await supabase()
      .from("applications")
      .insert({
        company_name: payload.company_name,
        role_title: payload.role_title,
        status,
        salary_text: payload.salary_range || null,
        location: payload.job_location || null,
        work_model: workModelToDb(payload.work_model),
        job_id: payload.job_id ?? null,
        job_url: payload.job_url ?? null,
        applied_at: status === "wishlist" ? null : new Date().toISOString().slice(0, 10),
        deadline_at: payload.deadline_at || null,
        follow_up_at: payload.follow_up_at || null,
        description: payload.description || null,
        ...(payload.position !== undefined ? { position: payload.position } : {}),
      })
      .select(APPLICATION_SELECT)
      .single(),
    "Failed to create application"
  );
  return toApplication(row);
}

export async function deleteApplication(id: string): Promise<void> {
  const { error } = await supabase().from("applications").delete().eq("id", id);
  if (error) throw new Error(`Failed to delete application: ${error.message}`);
}

/**
 * Move a card to a column and position. Status history rows are written by a database
 * trigger, so this is the only call a move makes.
 */
export async function moveApplication(
  id: string,
  toStatus: ApplicationStatus | string,
  position?: number
): Promise<Application> {
  const status = statusToDb(toStatus);
  const patch: { status: typeof status; position?: number } = { status };
  if (position !== undefined) patch.position = position;
  const row = unwrap(
    await supabase().from("applications").update(patch).eq("id", id).select(APPLICATION_SELECT).single(),
    "Failed to move application"
  );
  // First move out of the wishlist records when you applied, unless you set it yourself.
  if (status !== "wishlist" && !row.applied_at) {
    return updateApplication(id, { applied_at: new Date().toISOString().slice(0, 10) });
  }
  return toApplication(row);
}

export const updateApplicationStatus = (id: string, toStatus: ApplicationStatus | string) =>
  moveApplication(id, toStatus);

export type ApplicationPatch = Partial<{
  company_name: string;
  role_title: string;
  location: string | null;
  work_model: "REMOTE" | "HYBRID" | "ONSITE" | null;
  salary_text: string | null;
  job_url: string | null;
  description: string | null;
  applied_at: string | null;
  deadline_at: string | null;
  follow_up_at: string | null;
}>;

export async function updateApplication(id: string, patch: ApplicationPatch): Promise<Application> {
  const { work_model, ...rest } = patch;
  const row = unwrap(
    await supabase()
      .from("applications")
      .update({ ...rest, ...(work_model !== undefined ? { work_model: workModelToDb(work_model) } : {}) })
      .eq("id", id)
      .select(APPLICATION_SELECT)
      .single(),
    "Failed to save application"
  );
  return toApplication(row);
}

export async function importApplications(rows: ImportRow[]): Promise<number> {
  const client = supabase();
  let inserted = 0;
  for (let i = 0; i < rows.length; i += 200) {
    const chunk = rows.slice(i, i + 200).map((r, j) => ({
      company_name: r.company_name,
      role_title: r.role_title,
      status: statusToDb(r.status),
      location: r.job_location ?? null,
      work_model: workModelToDb(r.work_model),
      applied_at: r.applied_at ?? (r.status === "WISHLIST" ? null : new Date().toISOString().slice(0, 10)),
      deadline_at: r.deadline_at ?? null,
      follow_up_at: r.follow_up_at ?? null,
      salary_text: r.salary_range ?? null,
      job_url: r.job_url ?? null,
      position: -(i + j + 1),
    }));
    const { error, count } = await client.from("applications").insert(chunk, { count: "exact" });
    if (error) throw new Error(`Import stopped after ${inserted} rows: ${error.message}`);
    inserted += count ?? chunk.length;
  }
  return inserted;
}

/** Every status change across the user's applications, oldest first (for insights). */
export async function fetchAllTransitions(): Promise<ApplicationStateTransition[]> {
  const rows = unwrap(
    await supabase()
      .from("application_state_transitions")
      .select("*")
      .order("transitioned_at")
      .limit(10_000),
    "Failed to load status history"
  );
  return rows.map(toTransition);
}

export async function fetchTransitions(applicationId: string): Promise<ApplicationStateTransition[]> {
  const rows = unwrap(
    await supabase()
      .from("application_state_transitions")
      .select("*")
      .eq("application_id", applicationId)
      .order("transitioned_at"),
    "Failed to load status history"
  );
  return rows.map(toTransition);
}

// -----------------------------------------------------------------------------
// Tasks, contacts, notes
// -----------------------------------------------------------------------------

export async function fetchTasks(applicationId: string): Promise<ApplicationTask[]> {
  return unwrap(
    await supabase()
      .from("application_tasks")
      .select("*")
      .eq("application_id", applicationId)
      .order("created_at"),
    "Failed to load tasks"
  );
}

export async function createTask(
  applicationId: string,
  title: string,
  dueDate?: string
): Promise<ApplicationTask> {
  return unwrap(
    await supabase()
      .from("application_tasks")
      .insert({ application_id: applicationId, title, due_date: dueDate || null })
      .select()
      .single(),
    "Failed to create task"
  );
}

export async function toggleTask(taskId: string, isCompleted: boolean): Promise<void> {
  const { error } = await supabase()
    .from("application_tasks")
    .update({ is_completed: isCompleted })
    .eq("id", taskId);
  if (error) throw new Error(`Failed to update task: ${error.message}`);
}

export async function deleteTask(taskId: string): Promise<void> {
  const { error } = await supabase().from("application_tasks").delete().eq("id", taskId);
  if (error) throw new Error(`Failed to delete task: ${error.message}`);
}

export async function fetchContacts(applicationId: string): Promise<ApplicationContact[]> {
  return unwrap(
    await supabase()
      .from("application_contacts")
      .select("*")
      .eq("application_id", applicationId)
      .order("created_at"),
    "Failed to load contacts"
  );
}

export async function createContact(
  applicationId: string,
  contact: {
    name: string;
    role_title?: string;
    email?: string;
    phone?: string;
    linkedin_url?: string;
    notes?: string;
  }
): Promise<ApplicationContact> {
  return unwrap(
    await supabase()
      .from("application_contacts")
      .insert({ application_id: applicationId, ...contact })
      .select()
      .single(),
    "Failed to create contact"
  );
}

export async function deleteContact(contactId: string): Promise<void> {
  const { error } = await supabase().from("application_contacts").delete().eq("id", contactId);
  if (error) throw new Error(`Failed to delete contact: ${error.message}`);
}

export async function fetchNotes(applicationId: string): Promise<ApplicationNote[]> {
  const rows = unwrap(
    await supabase()
      .from("application_notes")
      .select("*")
      .eq("application_id", applicationId)
      .order("created_at", { ascending: false }),
    "Failed to load notes"
  );
  return rows.map((n) => ({ ...n, title: n.title ?? "" }));
}

export async function createNote(
  applicationId: string,
  note: { title: string; content: string }
): Promise<ApplicationNote> {
  const row = unwrap(
    await supabase()
      .from("application_notes")
      .insert({ application_id: applicationId, title: note.title || null, content: note.content })
      .select()
      .single(),
    "Failed to create note"
  );
  return { ...row, title: row.title ?? "" };
}

export async function deleteNote(noteId: string): Promise<void> {
  const { error } = await supabase().from("application_notes").delete().eq("id", noteId);
  if (error) throw new Error(`Failed to delete note: ${error.message}`);
}

// -----------------------------------------------------------------------------
// Jobs feed (public)
// -----------------------------------------------------------------------------

export async function fetchDiscoveredJobs(): Promise<DiscoveredJob[]> {
  const rows = unwrap(
    await supabase()
      .from("jobs")
      .select("*")
      .eq("is_active", true)
      .order("posted_at", { ascending: false, nullsFirst: false })
      .limit(500),
    "Failed to load jobs"
  );
  return rows.map(toDiscoveredJob);
}

// -----------------------------------------------------------------------------
// Profile
// -----------------------------------------------------------------------------

export async function fetchProfile(): Promise<Profile> {
  return unwrap(await supabase().from("profiles").select("*").single(), "Failed to load profile");
}

export async function updateProfile(
  patch: Partial<Pick<Profile, "full_name" | "school" | "grad_term" | "target_roles" | "target_provinces">>
): Promise<Profile> {
  const client = supabase();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) throw new Error("Not signed in");
  return unwrap(
    await client.from("profiles").update(patch).eq("id", user.id).select().single(),
    "Failed to save profile"
  );
}
