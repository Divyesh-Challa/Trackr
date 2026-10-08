import {
  Application,
  ApplicationMilestone,
  ApplicationStateTransition,
  ResumeBullet,
  ApplicationTask,
  ApplicationContact,
  ApplicationNote,
  DiscoveredJob,
  UserProfile,
  ATSAutofillExport,
} from "../types";

const DIRECT_API_BASE = "https://trackr-gateway.onrender.com/api/v1";
const PROXY_API_BASE = "/api/v1";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== "undefined" ? PROXY_API_BASE : DIRECT_API_BASE);

const nativeFetch = typeof window !== "undefined" ? window.fetch.bind(window) : globalThis.fetch;

async function resilientFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const urlStr = typeof input === "string" ? input : input.toString();

  try {
    const res = await nativeFetch(input, init);
    // If Render cold-starts (502/503/504) or 404, fallback to proxy or direct
    if (!res.ok && (res.status === 502 || res.status === 503 || res.status === 504)) {
      if (urlStr.includes(DIRECT_API_BASE)) {
        const altUrl = urlStr.replace(DIRECT_API_BASE, PROXY_API_BASE);
        return await nativeFetch(altUrl, init);
      } else if (urlStr.includes(PROXY_API_BASE)) {
        const altUrl = urlStr.replace(PROXY_API_BASE, DIRECT_API_BASE);
        return await nativeFetch(altUrl, init);
      }
    }
    return res;
  } catch (err) {
    if (urlStr.includes(DIRECT_API_BASE)) {
      const altUrl = urlStr.replace(DIRECT_API_BASE, PROXY_API_BASE);
      return await nativeFetch(altUrl, init);
    } else if (urlStr.includes(PROXY_API_BASE)) {
      const altUrl = urlStr.replace(PROXY_API_BASE, DIRECT_API_BASE);
      return await nativeFetch(altUrl, init);
    }
    throw err;
  }
}

// Shadow fetch for all functions in this module
const fetch = resilientFetch;

export async function fetchApplications(): Promise<Application[]> {
  const res = await fetch(`${API_BASE}/applications`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch applications");
  const json = await res.json();
  return json.data || [];
}

export async function fetchApplication(id: string): Promise<Application> {
  const res = await fetch(`${API_BASE}/applications/${id}`);
  if (!res.ok) throw new Error("Failed to fetch application");
  const json = await res.json();
  return json.data;
}

export async function createApplication(payload: {
  company_name: string;
  role_title: string;
  status?: string;
  salary_range?: string;
  job_location?: string;
  work_model?: "REMOTE" | "HYBRID" | "ONSITE";
}): Promise<Application> {
  const res = await fetch(`${API_BASE}/applications`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to create application");
  const json = await res.json();
  return json.data;
}

export async function deleteApplication(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/applications/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete application");
}

export async function updateApplicationStatus(
  id: string,
  toStatus: string,
  metadata?: Record<string, any>
): Promise<Application> {
  const res = await fetch(`${API_BASE}/applications/${id}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ to_status: toStatus, metadata: metadata || {} }),
  });
  if (!res.ok) throw new Error(`Status update failed: ${res.statusText}`);
  const json = await res.json();
  return json.data;
}

// Tasks API
export async function fetchTasks(applicationId: string): Promise<ApplicationTask[]> {
  const res = await fetch(`${API_BASE}/applications/${applicationId}/tasks`);
  if (!res.ok) return [];
  const json = await res.json();
  return json.data || [];
}

export async function createTask(
  applicationId: string,
  title: string,
  dueDate?: string
): Promise<ApplicationTask> {
  const res = await fetch(`${API_BASE}/applications/${applicationId}/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, due_date: dueDate || null }),
  });
  if (!res.ok) throw new Error("Failed to create task");
  const json = await res.json();
  return json.data;
}

export async function toggleTask(taskId: string, isCompleted: boolean): Promise<void> {
  const res = await fetch(`${API_BASE}/tasks/${taskId}/toggle`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ is_completed: isCompleted }),
  });
  if (!res.ok) throw new Error("Failed to toggle task");
}

export async function deleteTask(taskId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/tasks/${taskId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete task");
}

// Contacts API
export async function fetchContacts(applicationId: string): Promise<ApplicationContact[]> {
  const res = await fetch(`${API_BASE}/applications/${applicationId}/contacts`);
  if (!res.ok) return [];
  const json = await res.json();
  return json.data || [];
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
  const res = await fetch(`${API_BASE}/applications/${applicationId}/contacts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(contact),
  });
  if (!res.ok) throw new Error("Failed to create contact");
  const json = await res.json();
  return json.data;
}

export async function deleteContact(contactId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/contacts/${contactId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete contact");
}

// Notes API
export async function fetchNotes(applicationId: string): Promise<ApplicationNote[]> {
  const res = await fetch(`${API_BASE}/applications/${applicationId}/notes`);
  if (!res.ok) return [];
  const json = await res.json();
  return json.data || [];
}

export async function createNote(
  applicationId: string,
  note: { title: string; content: string }
): Promise<ApplicationNote> {
  const res = await fetch(`${API_BASE}/applications/${applicationId}/notes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(note),
  });
  if (!res.ok) throw new Error("Failed to create note");
  const json = await res.json();
  return json.data;
}

export async function deleteNote(noteId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/notes/${noteId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete note");
}

export async function ingestJobDescription(payload: {
  url?: string;
  text?: string;
}): Promise<{ status: string; application_id: string; message: string }> {
  const res = await fetch(`${API_BASE}/applications/ingest-jd`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to ingest job description");
  return res.json();
}

export async function fetchTransitions(
  applicationId: string
): Promise<ApplicationStateTransition[]> {
  const res = await fetch(`${API_BASE}/applications/${applicationId}/transitions`);
  if (!res.ok) return [];
  const json = await res.json();
  return json.data || [];
}

export async function fetchMilestones(): Promise<ApplicationMilestone[]> {
  const res = await fetch(`${API_BASE}/milestones`, { cache: "no-store" });
  if (!res.ok) return [];
  const json = await res.json();
  return json.data || [];
}

export async function toggleMilestone(
  id: string,
  isCompleted: boolean
): Promise<void> {
  await fetch(`${API_BASE}/milestones/${id}/toggle`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ is_completed: isCompleted }),
  });
}

export async function fetchResumeBullets(): Promise<ResumeBullet[]> {
  const res = await fetch(`${API_BASE}/resumes/bullets`, { cache: "no-store" });
  if (!res.ok) return [];
  const json = await res.json();
  return json.data || [];
}

export async function createResumeBullet(
  category: string,
  content: string
): Promise<ResumeBullet> {
  const res = await fetch(`${API_BASE}/resumes/bullets`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ category, content }),
  });
  if (!res.ok) throw new Error("Failed to create resume bullet");
  const json = await res.json();
  return json.data;
}

export async function uploadResumeFile(
  file: File
): Promise<{
  data: ResumeBullet[];
  count: number;
  filename: string;
  profile?: Partial<UserProfile>;
}> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE}/resumes/upload`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const errJson = await res.json().catch(() => ({}));
    throw new Error(errJson.error || "Failed to upload and parse resume");
  }

  return res.json();
}

export async function updateResumeBullet(
  id: string,
  content: string,
  category: string = "EXPERIENCE"
): Promise<ResumeBullet> {
  const res = await fetch(`${API_BASE}/resumes/bullets/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content, category }),
  });
  if (!res.ok) {
    const errJson = await res.json().catch(() => ({}));
    throw new Error(errJson.error || "Failed to update resume bullet");
  }
  const json = await res.json();
  return json.data;
}

export async function deleteResumeBullet(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/resumes/bullets/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete resume bullet");
}

export interface OutreachResponse {
  application_id: string;
  company_name: string;
  role_title: string;
  outreach_type: string;
  tone: string;
  subject: string;
  content: string;
  matched_bullets: Array<{
    id: string;
    category: string;
    content: string;
    similarity: number;
  }>;
}

export async function generateOutreach(
  applicationId: string,
  outreachType: "COVER_LETTER" | "LINKEDIN_NOTE" | "EMAIL_RECRUITER" = "COVER_LETTER",
  tone: "IMPACT_DRIVEN" | "CONCISE" | "TECHNICAL" = "IMPACT_DRIVEN"
): Promise<OutreachResponse> {
  const res = await fetch(`${API_BASE}/applications/${applicationId}/generate-outreach`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ outreach_type: outreachType, tone }),
  });
  if (!res.ok) {
    const errJson = await res.json().catch(() => ({}));
    throw new Error(errJson.error || "Failed to generate outreach");
  }
  return res.json();
}

export async function scrapeJobURL(url: string): Promise<{
  url: string;
  title: string;
  content: string;
  method: string;
  char_count: number;
}> {
  const res = await fetch(`${API_BASE}/scraper/scrape`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) {
    const errJson = await res.json().catch(() => ({}));
    throw new Error(errJson.error || "Failed to scrape job URL with headless browser");
  }
  return res.json();
}

// -----------------------------------------------------------------------------
// Simplify Platform: Discovered Jobs & Canadian Feed API
// -----------------------------------------------------------------------------

export async function fetchDiscoveredJobs(filters?: {
  province?: string;
  work_model?: string;
  type?: string;
  search?: string;
}): Promise<DiscoveredJob[]> {
  const params = new URLSearchParams();
  if (filters?.province && filters.province !== "ALL") params.append("province", filters.province);
  if (filters?.work_model && filters.work_model !== "ALL") params.append("work_model", filters.work_model);
  if (filters?.type && filters.type !== "ALL") params.append("type", filters.type);
  if (filters?.search) params.append("search", filters.search);

  const url = `${API_BASE}/jobs/feed${params.toString() ? `?${params.toString()}` : ""}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch discovered jobs");
  const json = await res.json();
  return json.data || [];
}

export async function fetchDiscoveredJob(id: string): Promise<DiscoveredJob> {
  const res = await fetch(`${API_BASE}/jobs/${id}`);
  if (!res.ok) throw new Error("Failed to fetch job details");
  const json = await res.json();
  return json.data;
}

// -----------------------------------------------------------------------------
// Simplify Platform: Canonical Profile & ATS Bridge API
// -----------------------------------------------------------------------------

export async function fetchUserProfile(): Promise<UserProfile> {
  const res = await fetch(`${API_BASE}/profile`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch canonical profile");
  const json = await res.json();
  return json.data;
}

export async function updateUserProfile(profile: Partial<UserProfile>): Promise<UserProfile> {
  const res = await fetch(`${API_BASE}/profile`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(profile),
  });
  if (!res.ok) {
    const errJson = await res.json().catch(() => ({}));
    throw new Error(errJson.error || "Failed to update profile");
  }
  const json = await res.json();
  return json.data;
}

export async function syncProfileFromResume(): Promise<UserProfile> {
  const res = await fetch(`${API_BASE}/profile/sync-resume`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) {
    const errJson = await res.json().catch(() => ({}));
    throw new Error(errJson.error || "Failed to sync profile from resume");
  }
  const json = await res.json();
  return json.data;
}

export async function exportProfileForATS(): Promise<ATSAutofillExport> {
  const res = await fetch(`${API_BASE}/profile/export`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to export profile for ATS");
  const json = await res.json();
  return json.data;
}

// -----------------------------------------------------------------------------
// Resume Studio & Jake's Template Tailoring API
// -----------------------------------------------------------------------------

export interface TailoredResumeData {
  match_score: number;
  matched_keywords: string[];
  tailoring_summary: string;
  header: {
    name: string;
    phone: string;
    email: string;
    linkedin: string;
    github: string;
  };
  education: Array<{
    school: string;
    degree: string;
    location: string;
    dates: string;
    gpa?: string;
  }>;
  experience: Array<{
    role: string;
    company: string;
    location: string;
    dates: string;
    bullets: string[];
  }>;
  projects: Array<{
    title: string;
    technologies: string;
    date: string;
    bullets: string[];
  }>;
  technical_skills: {
    languages: string;
    frameworks: string;
    developer_tools: string;
    libraries: string;
  };
  latex_source: string;
}

export async function tailorResume(payload: {
  company_name: string;
  role_title: string;
  job_description: string;
  user_id?: string;
}): Promise<TailoredResumeData> {
  const res = await fetch(`${API_BASE}/resumes/tailor`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to tailor resume");
  }
  const json = await res.json();
  return json.data;
}

// -----------------------------------------------------------------------------
// Cover Letter Generator API (High-Converting Template)
// -----------------------------------------------------------------------------

export interface CoverLetterData {
  company_name: string;
  role_title: string;
  subject: string;
  content: string;
  salutation: string;
  pain_points_addressed: string[];
  candidate_matches: Array<{
    employer_need: string;
    candidate_proof: string;
  }>;
  generation_mode: string;
}

export async function generateCoverLetter(payload: {
  company_name: string;
  role_title: string;
  job_description: string;
  user_id?: string;
  hiring_manager_name?: string;
  company_initiative?: string;
}): Promise<CoverLetterData> {
  const res = await fetch(`${API_BASE}/cover-letter/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to generate cover letter");
  }
  const json = await res.json();
  return json.data;
}

// -----------------------------------------------------------------------------
// AI Interview Simulator API (Multi-turn STAR Interactive)
// -----------------------------------------------------------------------------

export interface InterviewSessionData {
  company_name: string;
  role_title: string;
  interview_type: string;
  difficulty: string;
  current_round: number;
  total_rounds: number;
  interviewer_name: string;
  interviewer_persona: string;
  opening_statement: string;
  question: string;
  expected_dimensions: string[];
  tip: string;
}

export interface STARRubric {
  situation: { score: number; feedback: string };
  task: { score: number; feedback: string };
  action: { score: number; feedback: string };
  result: { score: number; feedback: string };
}

export interface InterviewTurnData {
  current_round: number;
  total_rounds: number;
  is_final: boolean;
  overall_score: number;
  star_rubric: STARRubric;
  interviewer_response: string;
  coaching_tip: string;
  follow_up_question?: string | null;
  final_decision?: "STRONG_HIRE" | "HIRE" | "LEANING_HIRE" | "NEEDS_PRACTICE" | null;
  final_debrief?: {
    overall_score: number;
    decision: string;
    summary: string;
    key_strengths: string[];
    growth_areas: string[];
    model_answer_snippet: string;
  } | null;
}

export async function startInterviewSession(payload: {
  company_name: string;
  role_title: string;
  interview_type?: string;
  difficulty?: string;
  total_rounds?: number;
}): Promise<InterviewSessionData> {
  const res = await fetch(`${API_BASE}/interview/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to start interview session");
  }
  const json = await res.json();
  return json.data;
}

export async function respondInterviewTurn(payload: {
  company_name: string;
  role_title: string;
  interview_type?: string;
  current_round: number;
  total_rounds: number;
  question: string;
  answer: string;
  history?: any[];
}): Promise<InterviewTurnData> {
  const res = await fetch(`${API_BASE}/interview/respond`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to submit interview answer");
  }
  const json = await res.json();
  return json.data;
}

