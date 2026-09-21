export type ApplicationStatus =
  | "WISHLIST"
  | "APPLIED"
  | "OA_SCHEDULED"
  | "INTERVIEWING"
  | "OFFER"
  | "REJECTED"
  | "WITHDRAWN";

export interface MatchedSkill {
  requirement: string;
  matched_bullet?: string;
  category?: string;
  similarity: number;
}

export interface FlaggedDeficiency {
  requirement: string;
  best_match_bullet?: string | null;
  similarity: number;
  actionable_feedback?: string;
}

export interface MatchDetails {
  coverage_score: number;
  total_requirements?: number;
  matched_count?: number;
  deficiencies_count?: number;
  matched_skills?: MatchedSkill[];
  deficiencies?: FlaggedDeficiency[];
}

export interface Application {
  id: string;
  user_id: string;
  company_name: string;
  role_title: string;
  job_location?: string;
  work_model?: "REMOTE" | "HYBRID" | "ONSITE";
  status: ApplicationStatus;
  applied_date: string;
  salary_range?: string;
  job_description_url?: string;
  snapshot_s3_key?: string;
  raw_description?: string;
  match_score?: number;
  match_details?: MatchDetails;
  created_at: string;
  updated_at: string;
  task_count?: number;
  completed_tasks?: number;
  contact_count?: number;
  note_count?: number;
}

export interface ApplicationTask {
  id: string;
  application_id: string;
  title: string;
  is_completed: boolean;
  due_date?: string | null;
  created_at: string;
}

export interface ApplicationContact {
  id: string;
  application_id: string;
  name: string;
  role_title?: string | null;
  email?: string | null;
  phone?: string | null;
  linkedin_url?: string | null;
  notes?: string | null;
  created_at: string;
}

export interface ApplicationNote {
  id: string;
  application_id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface ApplicationStateTransition {
  id: string;
  application_id: string;
  from_status: string;
  to_status: string;
  transitioned_at: string;
  metadata?: Record<string, any>;
}

export interface ResumeBullet {
  id: string;
  user_id: string;
  category: "EXPERIENCE" | "PROJECT" | "RESEARCH";
  content: string;
  created_at: string;
}

export interface ApplicationMilestone {
  id: string;
  application_id: string;
  milestone_type: string;
  scheduled_at?: string;
  deadline_at?: string;
  is_completed: boolean;
  action_url?: string;
  created_at: string;
}

export interface STAREvaluationChunk {
  stage: "SITUATION" | "TASK" | "ACTION" | "RESULT" | "SUMMARY";
  content: string;
  score: number;
  done: boolean;
}

// Simplify Platform Types (Canadian Job Feed & Canonical Profile)

export interface DiscoveredJob {
  id: string;
  company_name: string;
  company_domain?: string;
  role_title: string;
  city: string;
  province: "ON" | "BC" | "AB" | "QC" | "REMOTE" | "US" | string;
  work_model?: "REMOTE" | "HYBRID" | "ONSITE";
  job_type?: "INTERNSHIP" | "NEW_GRAD" | "FULL_TIME";
  salary_range_cad?: string;
  job_url?: string;
  description: string;
  requirements?: string[];
  skills?: string[];
  deadline_at?: string;
  match_score?: number;
  created_at: string;
}

export interface EducationDetails {
  school: string;
  degree: string;
  major: string;
  gpa?: string;
  start_year?: string;
  grad_term?: string;
  is_coop_enrolled?: boolean;
}

export interface WorkAuthDetails {
  work_auth_status?: string;
  canadian_work_eligible?: boolean;
  coop_work_permit?: boolean;
  requires_sponsorship?: boolean;
  target_term_length?: string;
  preferred_locations?: string[];
}

export interface ExperienceItem {
  company: string;
  role: string;
  location?: string;
  start_date?: string;
  end_date?: string;
  bullets: string[];
}

export interface ProjectItem {
  name: string;
  link?: string;
  bullets: string[];
}

export interface UserProfile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone?: string;
  city?: string;
  province?: string;
  linkedin_url?: string;
  github_url?: string;
  portfolio_url?: string;
  education: EducationDetails;
  work_authorization: WorkAuthDetails;
  skills: string[];
  experiences: ExperienceItem[];
  projects: ProjectItem[];
  created_at: string;
  updated_at: string;
}

export interface ATSAutofillExport {
  version: string;
  generator: string;
  candidate: {
    full_name: string;
    email: string;
    phone?: string;
    city?: string;
    province?: string;
    country: string;
    linkedin_url?: string;
    github_url?: string;
    portfolio_url?: string;
  };
  work_authorization: {
    legally_authorized_canada: boolean;
    coop_work_permit: boolean;
    requires_sponsorship: boolean;
    status: string;
  };
  education: Array<{
    school: string;
    degree: string;
    major: string;
    gpa?: string;
    graduation_term?: string;
    enrolled_in_coop?: boolean;
  }>;
  skills: string[];
  experience: ExperienceItem[];
  projects: ProjectItem[];
  ats_compatibility: {
    workday: boolean;
    greenhouse: boolean;
    lever: boolean;
    icims: boolean;
  };
}
