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

const supabase = () => createClient();

function unwrap<T>(result: { data: T; error: { message: string } | null }, what: string): NonNullable<T> {
  if (result.error) throw new Error(`${what}: ${result.error.message}`);
  if (result.data == null) throw new Error(`${what}: no data returned`);
  return result.data;
}

const APPLICATION_SELECT =
  "*, application_tasks(is_completed), application_contacts(count), application_notes(count)";

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

/** Status history rows are written by a database trigger, not here. */
export async function updateApplicationStatus(
  id: string,
  toStatus: ApplicationStatus | string
): Promise<Application> {
  const status = statusToDb(toStatus);
  const client = supabase();
  const patch: { status: typeof status; applied_at?: string } = { status };
  if (status === "applied") {
    const current = unwrap(
      await client.from("applications").select("applied_at").eq("id", id).single(),
      "Failed to load application"
    );
    if (!current.applied_at) patch.applied_at = new Date().toISOString().slice(0, 10);
  }
  const row = unwrap(
    await client.from("applications").update(patch).eq("id", id).select(APPLICATION_SELECT).single(),
    "Failed to update status"
  );
  return toApplication(row);
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
