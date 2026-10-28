// Legacy endpoints served by the retired Go gateway / FastAPI worker.
// Only reachable when NEXT_PUBLIC_FEATURE_AI is on; rebuilt in Phase 6.
import {
  ApplicationMilestone,
  ResumeBullet,
  UserProfile,
  ATSAutofillExport,
} from "../types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://trackr-gateway.onrender.com/api/v1";

export const AI_FEATURES_ENABLED = process.env.NEXT_PUBLIC_FEATURE_AI === "true";

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
