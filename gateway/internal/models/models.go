package models

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

type WorkModel string

const (
	WorkModelRemote  WorkModel = "REMOTE"
	WorkModelHybrid  WorkModel = "HYBRID"
	WorkModelOnsite  WorkModel = "ONSITE"
)

type ApplicationStatus string

const (
	StatusWishlist     ApplicationStatus = "WISHLIST"
	StatusApplied      ApplicationStatus = "APPLIED"
	StatusOAScheduled  ApplicationStatus = "OA_SCHEDULED"
	StatusInterviewing ApplicationStatus = "INTERVIEWING"
	StatusOffer        ApplicationStatus = "OFFER"
	StatusRejected     ApplicationStatus = "REJECTED"
	StatusWithdrawn    ApplicationStatus = "WITHDRAWN"
)

type Application struct {
	ID                uuid.UUID       `json:"id"`
	UserID            uuid.UUID       `json:"user_id"`
	CompanyName       string          `json:"company_name"`
	RoleTitle         string          `json:"role_title"`
	JobLocation       *string         `json:"job_location,omitempty"`
	WorkModel         *string         `json:"work_model,omitempty"`
	Status            string          `json:"status"`
	AppliedDate       string          `json:"applied_date"`
	SalaryRange       *string         `json:"salary_range,omitempty"`
	JobDescriptionURL *string         `json:"job_description_url,omitempty"`
	SnapshotS3Key     *string         `json:"snapshot_s3_key,omitempty"`
	RawDescription    *string         `json:"raw_description,omitempty"`
	MatchScore        *float64        `json:"match_score,omitempty"`
	MatchDetails      json.RawMessage `json:"match_details,omitempty"`
	TaskCount         int             `json:"task_count"`
	CompletedTasks    int             `json:"completed_tasks"`
	ContactCount      int             `json:"contact_count"`
	NoteCount         int             `json:"note_count"`
	CreatedAt         time.Time       `json:"created_at"`
	UpdatedAt         time.Time       `json:"updated_at"`
}

type ApplicationStateTransition struct {
	ID             uuid.UUID       `json:"id"`
	ApplicationID  uuid.UUID       `json:"application_id"`
	FromStatus     string          `json:"from_status"`
	ToStatus       string          `json:"to_status"`
	TransitionedAt time.Time       `json:"transitioned_at"`
	Metadata       json.RawMessage `json:"metadata,omitempty"`
}

type ResumeBullet struct {
	ID        uuid.UUID `json:"id"`
	UserID    uuid.UUID `json:"user_id"`
	Category  string    `json:"category"`
	Content   string    `json:"content"`
	CreatedAt time.Time `json:"created_at"`
}

type ApplicationMilestone struct {
	ID            uuid.UUID  `json:"id"`
	ApplicationID uuid.UUID  `json:"application_id"`
	MilestoneType string     `json:"milestone_type"`
	ScheduledAt   *time.Time `json:"scheduled_at,omitempty"`
	DeadlineAt    *time.Time `json:"deadline_at,omitempty"`
	IsCompleted   bool       `json:"is_completed"`
	ActionURL     *string    `json:"action_url,omitempty"`
	CreatedAt     time.Time  `json:"created_at"`
}

type InboundEmailLog struct {
	ID               uuid.UUID  `json:"id"`
	ApplicationID    *uuid.UUID `json:"application_id,omitempty"`
	Sender           string     `json:"sender"`
	Subject          string     `json:"subject"`
	RawPayloadS3Key  *string    `json:"raw_payload_s3_key,omitempty"`
	ClassifiedIntent *string    `json:"classified_intent,omitempty"`
	ConfidenceScore  *float64   `json:"confidence_score,omitempty"`
	ProcessedAt      time.Time  `json:"processed_at"`
}

// Request & Response DTOs

type CreateApplicationRequest struct {
	UserID            string   `json:"user_id"`
	CompanyName       string   `json:"company_name" binding:"required"`
	RoleTitle         string   `json:"role_title" binding:"required"`
	JobLocation       *string  `json:"job_location"`
	WorkModel         *string  `json:"work_model"`
	Status            *string  `json:"status"`
	AppliedDate       *string  `json:"applied_date"`
	SalaryRange       *string  `json:"salary_range"`
	JobDescriptionURL *string  `json:"job_description_url"`
	RawDescription    *string  `json:"raw_description"`
}

type UpdateStatusRequest struct {
	ToStatus string                 `json:"to_status" binding:"required"`
	Metadata map[string]interface{} `json:"metadata"`
}

type IngestJDRequest struct {
	UserID string  `json:"user_id"`
	URL    *string `json:"url"`
	Text   *string `json:"text"`
}

type CreateResumeBulletRequest struct {
	UserID   string `json:"user_id"`
	Category string `json:"category" binding:"required"`
	Content  string `json:"content" binding:"required"`
}

type CreateMilestoneRequest struct {
	ApplicationID string  `json:"application_id" binding:"required"`
	MilestoneType string  `json:"milestone_type" binding:"required"`
	ScheduledAt   *string `json:"scheduled_at"`
	DeadlineAt    *string `json:"deadline_at"`
	ActionURL     *string `json:"action_url"`
}

type InboundEmailWebhookPayload struct {
	Sender    string `json:"from" binding:"required"`
	Recipient string `json:"to"`
	Subject   string `json:"subject"`
	Body      string `json:"text"`
	HTML      string `json:"html"`
}

type ApplicationTask struct {
	ID            uuid.UUID `json:"id"`
	ApplicationID uuid.UUID `json:"application_id"`
	Title         string    `json:"title"`
	IsCompleted   bool      `json:"is_completed"`
	DueDate       *string   `json:"due_date,omitempty"`
	CreatedAt     time.Time `json:"created_at"`
}

type CreateTaskRequest struct {
	Title   string  `json:"title" binding:"required"`
	DueDate *string `json:"due_date"`
}

type ApplicationContact struct {
	ID            uuid.UUID `json:"id"`
	ApplicationID uuid.UUID `json:"application_id"`
	Name          string    `json:"name"`
	RoleTitle     *string   `json:"role_title,omitempty"`
	Email         *string   `json:"email,omitempty"`
	Phone         *string   `json:"phone,omitempty"`
	LinkedinURL   *string   `json:"linkedin_url,omitempty"`
	Notes         *string   `json:"notes,omitempty"`
	CreatedAt     time.Time `json:"created_at"`
}

type CreateContactRequest struct {
	Name        string  `json:"name" binding:"required"`
	RoleTitle   *string `json:"role_title"`
	Email       *string `json:"email"`
	Phone       *string `json:"phone"`
	LinkedinURL *string `json:"linkedin_url"`
	Notes       *string `json:"notes"`
}

type ApplicationNote struct {
	ID            uuid.UUID `json:"id"`
	ApplicationID uuid.UUID `json:"application_id"`
	Title         *string   `json:"title,omitempty"`
	Content       string    `json:"content"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

type CreateNoteRequest struct {
	Title   *string `json:"title"`
	Content string  `json:"content" binding:"required"`
}

// Simplify Platform Models (Discovered Jobs & Canonical Profile)

type DiscoveredJob struct {
	ID             uuid.UUID       `json:"id"`
	CompanyName    string          `json:"company_name"`
	CompanyDomain  *string         `json:"company_domain,omitempty"`
	RoleTitle      string          `json:"role_title"`
	City           string          `json:"city"`
	Province       string          `json:"province"`
	WorkModel      *string         `json:"work_model,omitempty"`
	JobType        *string         `json:"job_type,omitempty"`
	SalaryRangeCAD *string         `json:"salary_range_cad,omitempty"`
	JobURL         *string         `json:"job_url,omitempty"`
	Description    string          `json:"description"`
	Requirements   json.RawMessage `json:"requirements,omitempty"`
	Skills         json.RawMessage `json:"skills,omitempty"`
	DeadlineAt     *time.Time      `json:"deadline_at,omitempty"`
	MatchScore     *float64        `json:"match_score,omitempty"`
	CreatedAt      time.Time       `json:"created_at"`
}

type UserProfile struct {
	ID                uuid.UUID       `json:"id"`
	UserID            uuid.UUID       `json:"user_id"`
	FullName          string          `json:"full_name"`
	Email             string          `json:"email"`
	Phone             string          `json:"phone"`
	City              string          `json:"city"`
	Province          string          `json:"province"`
	LinkedinURL       string          `json:"linkedin_url"`
	GithubURL         string          `json:"github_url"`
	PortfolioURL      string          `json:"portfolio_url"`
	Education         json.RawMessage `json:"education"`
	WorkAuthorization json.RawMessage `json:"work_authorization"`
	Skills            json.RawMessage `json:"skills"`
	Experiences       json.RawMessage `json:"experiences"`
	Projects          json.RawMessage `json:"projects"`
	CreatedAt         time.Time       `json:"created_at"`
	UpdatedAt         time.Time       `json:"updated_at"`
}

type UpdateProfileRequest struct {
	FullName          string          `json:"full_name"`
	Email             string          `json:"email"`
	Phone             string          `json:"phone"`
	City              string          `json:"city"`
	Province          string          `json:"province"`
	LinkedinURL       string          `json:"linkedin_url"`
	GithubURL         string          `json:"github_url"`
	PortfolioURL      string          `json:"portfolio_url"`
	Education         json.RawMessage `json:"education"`
	WorkAuthorization json.RawMessage `json:"work_authorization"`
	Skills            json.RawMessage `json:"skills"`
	Experiences       json.RawMessage `json:"experiences"`
	Projects          json.RawMessage `json:"projects"`
}

type IngestDiscoveredJobItem struct {
	CompanyName    string    `json:"company_name" binding:"required"`
	CompanyDomain  *string   `json:"company_domain"`
	RoleTitle      string    `json:"role_title" binding:"required"`
	City           string    `json:"city"`
	Province       string    `json:"province"`
	WorkModel      *string   `json:"work_model"`
	JobType        *string   `json:"job_type"`
	SalaryRangeCAD *string   `json:"salary_range_cad"`
	JobURL         string    `json:"job_url" binding:"required"`
	Description    string    `json:"description"`
	Requirements   []string  `json:"requirements"`
	Skills         []string  `json:"skills"`
	Embedding      []float64 `json:"embedding"`
}

type BatchIngestJobsRequest struct {
	Jobs []IngestDiscoveredJobItem `json:"jobs" binding:"required"`
}
