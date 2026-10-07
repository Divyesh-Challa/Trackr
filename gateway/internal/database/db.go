package database

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/trackr/gateway/internal/models"
)

type DB struct {
	Pool *pgxpool.Pool
}

func ConnectDB(ctx context.Context, databaseURL string) (*DB, error) {
	config, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		return nil, fmt.Errorf("unable to parse database config: %w", err)
	}

	config.MaxConns = 25
	config.MinConns = 5
	config.MaxConnLifetime = time.Hour
	config.MaxConnIdleTime = 30 * time.Minute
	config.ConnConfig.DefaultQueryExecMode = pgx.QueryExecModeSimpleProtocol

	pool, err := pgxpool.NewWithConfig(ctx, config)
	if err != nil {
		return nil, fmt.Errorf("unable to create connection pool: %w", err)
	}

	if err := pool.Ping(ctx); err != nil {
		return nil, fmt.Errorf("database ping failed: %w", err)
	}

	log.Println("Connected to PostgreSQL successfully.")
	return &DB{Pool: pool}, nil
}

func (db *DB) Close() {
	if db.Pool != nil {
		db.Pool.Close()
	}
}

// Applications

func (db *DB) ListApplications(ctx context.Context, userID *uuid.UUID, status *string) ([]models.Application, error) {
	query := `
		SELECT a.id, a.user_id, a.company_name, a.role_title, a.job_location, a.work_model,
		       a.status, a.applied_date::text, a.salary_range, a.job_description_url,
		       a.snapshot_s3_key, a.raw_description, a.match_score, a.match_details,
		       COALESCE(t.task_count, 0)::int, COALESCE(t.completed_count, 0)::int,
		       COALESCE(c.contact_count, 0)::int, COALESCE(n.note_count, 0)::int,
		       a.created_at, a.updated_at
		FROM applications a
		LEFT JOIN (
			SELECT application_id, COUNT(*) as task_count, COUNT(*) FILTER (WHERE is_completed = true) as completed_count
			FROM application_tasks GROUP BY application_id
		) t ON t.application_id = a.id
		LEFT JOIN (
			SELECT application_id, COUNT(*) as contact_count
			FROM application_contacts GROUP BY application_id
		) c ON c.application_id = a.id
		LEFT JOIN (
			SELECT application_id, COUNT(*) as note_count
			FROM application_notes GROUP BY application_id
		) n ON n.application_id = a.id
		WHERE 1=1
	`
	args := []interface{}{}
	argIdx := 1

	if userID != nil {
		query += fmt.Sprintf(" AND a.user_id = $%d", argIdx)
		args = append(args, *userID)
		argIdx++
	}
	if status != nil && *status != "" {
		query += fmt.Sprintf(" AND a.status = $%d", argIdx)
		args = append(args, *status)
		argIdx++
	}

	query += " ORDER BY a.updated_at DESC"

	rows, err := db.Pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var apps []models.Application
	for rows.Next() {
		var a models.Application
		var appliedDate string
		err := rows.Scan(
			&a.ID, &a.UserID, &a.CompanyName, &a.RoleTitle, &a.JobLocation, &a.WorkModel,
			&a.Status, &appliedDate, &a.SalaryRange, &a.JobDescriptionURL,
			&a.SnapshotS3Key, &a.RawDescription, &a.MatchScore, &a.MatchDetails,
			&a.TaskCount, &a.CompletedTasks, &a.ContactCount, &a.NoteCount,
			&a.CreatedAt, &a.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		a.AppliedDate = appliedDate
		apps = append(apps, a)
	}
	return apps, nil
}

func (db *DB) GetApplication(ctx context.Context, id uuid.UUID) (*models.Application, error) {
	query := `
		SELECT a.id, a.user_id, a.company_name, a.role_title, a.job_location, a.work_model,
		       a.status, a.applied_date::text, a.salary_range, a.job_description_url,
		       a.snapshot_s3_key, a.raw_description, a.match_score, a.match_details,
		       COALESCE(t.task_count, 0)::int, COALESCE(t.completed_count, 0)::int,
		       COALESCE(c.contact_count, 0)::int, COALESCE(n.note_count, 0)::int,
		       a.created_at, a.updated_at
		FROM applications a
		LEFT JOIN (
			SELECT application_id, COUNT(*) as task_count, COUNT(*) FILTER (WHERE is_completed = true) as completed_count
			FROM application_tasks GROUP BY application_id
		) t ON t.application_id = a.id
		LEFT JOIN (
			SELECT application_id, COUNT(*) as contact_count
			FROM application_contacts GROUP BY application_id
		) c ON c.application_id = a.id
		LEFT JOIN (
			SELECT application_id, COUNT(*) as note_count
			FROM application_notes GROUP BY application_id
		) n ON n.application_id = a.id
		WHERE a.id = $1
	`
	var a models.Application
	var appliedDate string
	err := db.Pool.QueryRow(ctx, query, id).Scan(
		&a.ID, &a.UserID, &a.CompanyName, &a.RoleTitle, &a.JobLocation, &a.WorkModel,
		&a.Status, &appliedDate, &a.SalaryRange, &a.JobDescriptionURL,
		&a.SnapshotS3Key, &a.RawDescription, &a.MatchScore, &a.MatchDetails,
		&a.TaskCount, &a.CompletedTasks, &a.ContactCount, &a.NoteCount,
		&a.CreatedAt, &a.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	a.AppliedDate = appliedDate
	return &a, nil
}

func (db *DB) DeleteApplication(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM applications WHERE id = $1`
	_, err := db.Pool.Exec(ctx, query, id)
	return err
}

func (db *DB) CreateApplication(ctx context.Context, a *models.Application) error {
	query := `
		INSERT INTO applications (
			id, user_id, company_name, role_title, job_location, work_model,
			status, applied_date, salary_range, job_description_url,
			raw_description, match_details, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7,
			COALESCE(NULLIF($8, '')::date, CURRENT_DATE),
			$9, $10, $11, '{}'::jsonb, NOW(), NOW()
		)
		RETURNING created_at, updated_at
	`
	if a.ID == uuid.Nil {
		a.ID = uuid.New()
	}
	if a.Status == "" {
		a.Status = string(models.StatusApplied)
	}

	err := db.Pool.QueryRow(ctx, query,
		a.ID, a.UserID, a.CompanyName, a.RoleTitle, a.JobLocation, a.WorkModel,
		a.Status, a.AppliedDate, a.SalaryRange, a.JobDescriptionURL, a.RawDescription,
	).Scan(&a.CreatedAt, &a.UpdatedAt)
	return err
}

func (db *DB) UpdateApplicationStatus(ctx context.Context, id uuid.UUID, toStatus string, metadata map[string]interface{}) (*models.Application, error) {
	tx, err := db.Pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	// Fetch current status
	var currentStatus string
	err = tx.QueryRow(ctx, `SELECT status FROM applications WHERE id = $1 FOR UPDATE`, id).Scan(&currentStatus)
	if err != nil {
		return nil, fmt.Errorf("application not found: %w", err)
	}

	// Update status
	queryUpdate := `
		UPDATE applications
		SET status = $1, updated_at = NOW()
		WHERE id = $2
		RETURNING id, user_id, company_name, role_title, job_location, work_model,
		          status, applied_date::text, salary_range, job_description_url,
		          snapshot_s3_key, raw_description, match_score, match_details,
		          created_at, updated_at
	`
	var a models.Application
	var appliedDate string
	err = tx.QueryRow(ctx, queryUpdate, toStatus, id).Scan(
		&a.ID, &a.UserID, &a.CompanyName, &a.RoleTitle, &a.JobLocation, &a.WorkModel,
		&a.Status, &appliedDate, &a.SalaryRange, &a.JobDescriptionURL,
		&a.SnapshotS3Key, &a.RawDescription, &a.MatchScore, &a.MatchDetails,
		&a.CreatedAt, &a.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to update application status: %w", err)
	}
	a.AppliedDate = appliedDate

	// Record state transition
	metaStr := "{}"
	if metadata != nil && len(metadata) > 0 {
		if b, err := json.Marshal(metadata); err == nil {
			metaStr = string(b)
		}
	}
	queryTransition := `
		INSERT INTO application_state_transitions (
			id, application_id, from_status, to_status, transitioned_at, metadata
		) VALUES (
			gen_random_uuid(), $1, $2, $3, NOW(), $4::jsonb
		)
	`
	_, err = tx.Exec(ctx, queryTransition, id, currentStatus, toStatus, metaStr)
	if err != nil {
		return nil, fmt.Errorf("failed to record state transition: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return &a, nil
}

func (db *DB) ListStateTransitions(ctx context.Context, applicationID uuid.UUID) ([]models.ApplicationStateTransition, error) {
	query := `
		SELECT id, application_id, from_status, to_status, transitioned_at, metadata
		FROM application_state_transitions
		WHERE application_id = $1
		ORDER BY transitioned_at DESC
	`
	rows, err := db.Pool.Query(ctx, query, applicationID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []models.ApplicationStateTransition
	for rows.Next() {
		var t models.ApplicationStateTransition
		err := rows.Scan(&t.ID, &t.ApplicationID, &t.FromStatus, &t.ToStatus, &t.TransitionedAt, &t.Metadata)
		if err != nil {
			return nil, err
		}
		list = append(list, t)
	}
	return list, nil
}

// Resume Bullets

func (db *DB) ListResumeBullets(ctx context.Context, userID *uuid.UUID) ([]models.ResumeBullet, error) {
	query := `
		SELECT id, user_id, category, content, created_at
		FROM resume_bullets
	`
	args := []interface{}{}
	if userID != nil {
		query += " WHERE user_id = $1"
		args = append(args, *userID)
	}
	query += " ORDER BY created_at DESC"

	rows, err := db.Pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var bullets []models.ResumeBullet
	for rows.Next() {
		var b models.ResumeBullet
		if err := rows.Scan(&b.ID, &b.UserID, &b.Category, &b.Content, &b.CreatedAt); err != nil {
			return nil, err
		}
		bullets = append(bullets, b)
	}
	return bullets, nil
}

func (db *DB) CreateResumeBullet(ctx context.Context, b *models.ResumeBullet) error {
	if b.ID == uuid.Nil {
		b.ID = uuid.New()
	}
	query := `
		INSERT INTO resume_bullets (id, user_id, category, content, created_at)
		VALUES ($1, $2, $3, $4, NOW())
		RETURNING created_at
	`
	return db.Pool.QueryRow(ctx, query, b.ID, b.UserID, b.Category, b.Content).Scan(&b.CreatedAt)
}

func (db *DB) DeleteResumeBullet(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM resume_bullets WHERE id = $1`
	_, err := db.Pool.Exec(ctx, query, id)
	return err
}

// Milestones

func (db *DB) ListMilestones(ctx context.Context, applicationID *uuid.UUID, activeOnly bool) ([]models.ApplicationMilestone, error) {
	query := `
		SELECT id, application_id, milestone_type, scheduled_at, deadline_at, is_completed, action_url, created_at
		FROM application_milestones
		WHERE 1=1
	`
	args := []interface{}{}
	argIdx := 1

	if applicationID != nil {
		query += fmt.Sprintf(" AND application_id = $%d", argIdx)
		args = append(args, *applicationID)
		argIdx++
	}
	if activeOnly {
		query += " AND is_completed = FALSE"
	}
	query += " ORDER BY deadline_at ASC NULLS LAST, created_at DESC"

	rows, err := db.Pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []models.ApplicationMilestone
	for rows.Next() {
		var m models.ApplicationMilestone
		err := rows.Scan(&m.ID, &m.ApplicationID, &m.MilestoneType, &m.ScheduledAt, &m.DeadlineAt, &m.IsCompleted, &m.ActionURL, &m.CreatedAt)
		if err != nil {
			return nil, err
		}
		list = append(list, m)
	}
	return list, nil
}

func (db *DB) CreateMilestone(ctx context.Context, m *models.ApplicationMilestone) error {
	if m.ID == uuid.Nil {
		m.ID = uuid.New()
	}
	query := `
		INSERT INTO application_milestones (
			id, application_id, milestone_type, scheduled_at, deadline_at, is_completed, action_url, created_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, NOW()
		)
		RETURNING created_at
	`
	return db.Pool.QueryRow(ctx, query, m.ID, m.ApplicationID, m.MilestoneType, m.ScheduledAt, m.DeadlineAt, m.IsCompleted, m.ActionURL).Scan(&m.CreatedAt)
}

func (db *DB) UpdateMilestoneCompletion(ctx context.Context, id uuid.UUID, isCompleted bool) error {
	query := `UPDATE application_milestones SET is_completed = $1 WHERE id = $2`
	_, err := db.Pool.Exec(ctx, query, isCompleted, id)
	return err
}

// Inbound Email Logs

func (db *DB) CreateInboundEmailLog(ctx context.Context, log *models.InboundEmailLog) error {
	if log.ID == uuid.Nil {
		log.ID = uuid.New()
	}
	query := `
		INSERT INTO inbound_email_logs (
			id, application_id, sender, subject, raw_payload_s3_key, classified_intent, confidence_score, processed_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, NOW()
		)
		RETURNING processed_at
	`
	return db.Pool.QueryRow(ctx, query, log.ID, log.ApplicationID, log.Sender, log.Subject, log.RawPayloadS3Key, log.ClassifiedIntent, log.ConfidenceScore).Scan(&log.ProcessedAt)
}

func (db *DB) FindApplicationBySenderDomain(ctx context.Context, domain string) (*uuid.UUID, error) {
	query := `
		SELECT id FROM applications 
		WHERE LOWER(company_name) LIKE '%' || LOWER($1) || '%' 
		ORDER BY updated_at DESC LIMIT 1
	`
	var id uuid.UUID
	err := db.Pool.QueryRow(ctx, query, domain).Scan(&id)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return &id, nil
}

// Tasks

func (db *DB) ListTasks(ctx context.Context, appID uuid.UUID) ([]models.ApplicationTask, error) {
	query := `
		SELECT id, application_id, title, is_completed, due_date::text, created_at
		FROM application_tasks
		WHERE application_id = $1
		ORDER BY is_completed ASC, due_date ASC NULLS LAST, created_at DESC
	`
	rows, err := db.Pool.Query(ctx, query, appID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tasks []models.ApplicationTask
	for rows.Next() {
		var t models.ApplicationTask
		var dueDate *string
		if err := rows.Scan(&t.ID, &t.ApplicationID, &t.Title, &t.IsCompleted, &dueDate, &t.CreatedAt); err != nil {
			return nil, err
		}
		t.DueDate = dueDate
		tasks = append(tasks, t)
	}
	return tasks, nil
}

func (db *DB) CreateTask(ctx context.Context, appID uuid.UUID, title string, dueDate *string) (*models.ApplicationTask, error) {
	id := uuid.New()
	query := `
		INSERT INTO application_tasks (id, application_id, title, is_completed, due_date, created_at)
		VALUES ($1, $2, $3, false, NULLIF($4, '')::date, NOW())
		RETURNING created_at
	`
	var t models.ApplicationTask
	t.ID = id
	t.ApplicationID = appID
	t.Title = title
	t.IsCompleted = false
	t.DueDate = dueDate

	err := db.Pool.QueryRow(ctx, query, id, appID, title, dueDate).Scan(&t.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &t, nil
}

func (db *DB) ToggleTask(ctx context.Context, taskID uuid.UUID, isCompleted bool) error {
	query := `UPDATE application_tasks SET is_completed = $1 WHERE id = $2`
	_, err := db.Pool.Exec(ctx, query, isCompleted, taskID)
	return err
}

func (db *DB) DeleteTask(ctx context.Context, taskID uuid.UUID) error {
	query := `DELETE FROM application_tasks WHERE id = $1`
	_, err := db.Pool.Exec(ctx, query, taskID)
	return err
}

// Contacts

func (db *DB) ListContacts(ctx context.Context, appID uuid.UUID) ([]models.ApplicationContact, error) {
	query := `
		SELECT id, application_id, name, role_title, email, phone, linkedin_url, notes, created_at
		FROM application_contacts
		WHERE application_id = $1
		ORDER BY created_at DESC
	`
	rows, err := db.Pool.Query(ctx, query, appID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var contacts []models.ApplicationContact
	for rows.Next() {
		var c models.ApplicationContact
		if err := rows.Scan(&c.ID, &c.ApplicationID, &c.Name, &c.RoleTitle, &c.Email, &c.Phone, &c.LinkedinURL, &c.Notes, &c.CreatedAt); err != nil {
			return nil, err
		}
		contacts = append(contacts, c)
	}
	return contacts, nil
}

func (db *DB) CreateContact(ctx context.Context, appID uuid.UUID, req models.CreateContactRequest) (*models.ApplicationContact, error) {
	id := uuid.New()
	query := `
		INSERT INTO application_contacts (id, application_id, name, role_title, email, phone, linkedin_url, notes, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
		RETURNING created_at
	`
	var c models.ApplicationContact
	c.ID = id
	c.ApplicationID = appID
	c.Name = req.Name
	c.RoleTitle = req.RoleTitle
	c.Email = req.Email
	c.Phone = req.Phone
	c.LinkedinURL = req.LinkedinURL
	c.Notes = req.Notes

	err := db.Pool.QueryRow(ctx, query, id, appID, req.Name, req.RoleTitle, req.Email, req.Phone, req.LinkedinURL, req.Notes).Scan(&c.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &c, nil
}

func (db *DB) DeleteContact(ctx context.Context, contactID uuid.UUID) error {
	query := `DELETE FROM application_contacts WHERE id = $1`
	_, err := db.Pool.Exec(ctx, query, contactID)
	return err
}

// Notes

func (db *DB) ListNotes(ctx context.Context, appID uuid.UUID) ([]models.ApplicationNote, error) {
	query := `
		SELECT id, application_id, title, content, created_at, updated_at
		FROM application_notes
		WHERE application_id = $1
		ORDER BY updated_at DESC
	`
	rows, err := db.Pool.Query(ctx, query, appID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var notes []models.ApplicationNote
	for rows.Next() {
		var n models.ApplicationNote
		if err := rows.Scan(&n.ID, &n.ApplicationID, &n.Title, &n.Content, &n.CreatedAt, &n.UpdatedAt); err != nil {
			return nil, err
		}
		notes = append(notes, n)
	}
	return notes, nil
}

func (db *DB) CreateNote(ctx context.Context, appID uuid.UUID, title *string, content string) (*models.ApplicationNote, error) {
	id := uuid.New()
	query := `
		INSERT INTO application_notes (id, application_id, title, content, created_at, updated_at)
		VALUES ($1, $2, $3, $4, NOW(), NOW())
		RETURNING created_at, updated_at
	`
	var n models.ApplicationNote
	n.ID = id
	n.ApplicationID = appID
	n.Title = title
	n.Content = content

	err := db.Pool.QueryRow(ctx, query, id, appID, title, content).Scan(&n.CreatedAt, &n.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &n, nil
}

func (db *DB) DeleteNote(ctx context.Context, noteID uuid.UUID) error {
	query := `DELETE FROM application_notes WHERE id = $1`
	_, err := db.Pool.Exec(ctx, query, noteID)
	return err
}

// -----------------------------------------------------------------------------
// Simplify Platform: Discovered Jobs (BC & Alberta Scope)
// -----------------------------------------------------------------------------

func (db *DB) ListDiscoveredJobs(
	ctx context.Context,
	userID uuid.UUID,
	province *string,
	workModel *string,
	jobType *string,
	search *string,
) ([]models.DiscoveredJob, error) {
	query := `
		SELECT j.id, j.company_name, j.company_domain, j.role_title, j.city, j.province,
		       j.work_model, j.job_type, j.salary_range_cad, j.job_url, j.description,
		       j.requirements, j.skills, j.deadline_at,
		       COALESCE((
		           SELECT ROUND(MAX(1 - (rb.embedding <=> j.embedding))::numeric * 100, 1)
		           FROM resume_bullets rb
		           WHERE rb.user_id = $1 AND rb.embedding IS NOT NULL
		       ), 84.0)::float8 AS match_score,
		       j.created_at
		FROM discovered_jobs j
		WHERE 1=1
	`
	args := []interface{}{userID}
	argIdx := 2

	if province != nil && *province != "" && *province != "ALL" {
		prov := strings.ToUpper(*province)
		if prov == "REMOTE" {
			query += fmt.Sprintf(" AND (j.province = 'REMOTE' OR j.work_model = 'REMOTE')")
		} else if strings.Contains(prov, ",") {
			parts := strings.Split(prov, ",")
			placeholders := []string{}
			for _, p := range parts {
				pClean := strings.TrimSpace(p)
				if pClean != "" {
					placeholders = append(placeholders, fmt.Sprintf("$%d", argIdx))
					args = append(args, pClean)
					argIdx++
				}
			}
			if len(placeholders) > 0 {
				query += fmt.Sprintf(" AND j.province IN (%s)", strings.Join(placeholders, ","))
			}
		} else {
			query += fmt.Sprintf(" AND j.province = $%d", argIdx)
			args = append(args, prov)
			argIdx++
		}
	}

	if workModel != nil && *workModel != "" && *workModel != "ALL" {
		query += fmt.Sprintf(" AND j.work_model = $%d", argIdx)
		args = append(args, strings.ToUpper(*workModel))
		argIdx++
	}

	if jobType != nil && *jobType != "" && *jobType != "ALL" {
		query += fmt.Sprintf(" AND j.job_type = $%d", argIdx)
		args = append(args, strings.ToUpper(*jobType))
		argIdx++
	} else {
		query += " AND j.job_type = 'INTERNSHIP'"
	}

	if search != nil && *search != "" {
		searchTerm := "%" + *search + "%"
		query += fmt.Sprintf(" AND (j.company_name ILIKE $%d OR j.role_title ILIKE $%d OR j.city ILIKE $%d)", argIdx, argIdx, argIdx)
		args = append(args, searchTerm)
		argIdx++
	}

	query += " ORDER BY match_score DESC, j.created_at DESC"

	rows, err := db.Pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var jobs []models.DiscoveredJob
	for rows.Next() {
		var j models.DiscoveredJob
		err := rows.Scan(
			&j.ID, &j.CompanyName, &j.CompanyDomain, &j.RoleTitle, &j.City, &j.Province,
			&j.WorkModel, &j.JobType, &j.SalaryRangeCAD, &j.JobURL, &j.Description,
			&j.Requirements, &j.Skills, &j.DeadlineAt, &j.MatchScore, &j.CreatedAt,
		)
		if err != nil {
			return nil, err
		}
		jobs = append(jobs, j)
	}
	return jobs, nil
}

func (db *DB) GetDiscoveredJob(ctx context.Context, id uuid.UUID, userID uuid.UUID) (*models.DiscoveredJob, error) {
	query := `
		SELECT j.id, j.company_name, j.company_domain, j.role_title, j.city, j.province,
		       j.work_model, j.job_type, j.salary_range_cad, j.job_url, j.description,
		       j.requirements, j.skills, j.deadline_at,
		       COALESCE((
		           SELECT ROUND(MAX(1 - (rb.embedding <=> j.embedding))::numeric * 100, 1)
		           FROM resume_bullets rb
		           WHERE rb.user_id = $1 AND rb.embedding IS NOT NULL
		       ), 84.0)::float8 AS match_score,
		       j.created_at
		FROM discovered_jobs j
		WHERE j.id = $2
	`
	var j models.DiscoveredJob
	err := db.Pool.QueryRow(ctx, query, userID, id).Scan(
		&j.ID, &j.CompanyName, &j.CompanyDomain, &j.RoleTitle, &j.City, &j.Province,
		&j.WorkModel, &j.JobType, &j.SalaryRangeCAD, &j.JobURL, &j.Description,
		&j.Requirements, &j.Skills, &j.DeadlineAt, &j.MatchScore, &j.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &j, nil
}

func (db *DB) BatchUpsertDiscoveredJobs(ctx context.Context, jobs []models.IngestDiscoveredJobItem) (int, error) {
	if len(jobs) == 0 {
		return 0, nil
	}
	inserted := 0
	for _, j := range jobs {
		reqJSON, _ := json.Marshal(j.Requirements)
		skillsJSON, _ := json.Marshal(j.Skills)

		var vecStr *string
		if len(j.Embedding) > 0 {
			strs := make([]string, len(j.Embedding))
			for i, v := range j.Embedding {
				strs[i] = fmt.Sprintf("%.6f", v)
			}
			s := fmt.Sprintf("[%s]", strings.Join(strs, ","))
			vecStr = &s
		}

		query := `
			INSERT INTO discovered_jobs (
				company_name, company_domain, role_title, city, province,
				work_model, job_type, salary_range_cad, job_url, description,
				requirements, skills, embedding, created_at
			) VALUES (
				$1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
				$11::jsonb, $12::jsonb,
				CASE WHEN $13::text IS NOT NULL THEN ($13)::vector ELSE NULL END,
				NOW()
			)
			ON CONFLICT (job_url) DO UPDATE SET
				company_name = EXCLUDED.company_name,
				role_title = EXCLUDED.role_title,
				city = EXCLUDED.city,
				province = EXCLUDED.province,
				work_model = COALESCE(EXCLUDED.work_model, discovered_jobs.work_model),
				job_type = COALESCE(EXCLUDED.job_type, discovered_jobs.job_type),
				description = EXCLUDED.description,
				requirements = EXCLUDED.requirements,
				skills = EXCLUDED.skills,
				embedding = COALESCE(EXCLUDED.embedding, discovered_jobs.embedding);
		`

		_, err := db.Pool.Exec(ctx, query,
			j.CompanyName, j.CompanyDomain, j.RoleTitle, j.City, j.Province,
			j.WorkModel, j.JobType, j.SalaryRangeCAD, j.JobURL, j.Description,
			string(reqJSON), string(skillsJSON), vecStr,
		)
		if err == nil {
			inserted++
		}
	}
	return inserted, nil
}

// -----------------------------------------------------------------------------
// Simplify Platform: Canonical Profile
// -----------------------------------------------------------------------------

func (db *DB) GetUserProfile(ctx context.Context, userID uuid.UUID) (*models.UserProfile, error) {
	query := `
		SELECT id, user_id, full_name, email, phone, city, province,
		       linkedin_url, github_url, portfolio_url,
		       education, work_authorization, skills, experiences, projects,
		       created_at, updated_at
		FROM user_profiles
		WHERE user_id = $1
	`
	var p models.UserProfile
	err := db.Pool.QueryRow(ctx, query, userID).Scan(
		&p.ID, &p.UserID, &p.FullName, &p.Email, &p.Phone, &p.City, &p.Province,
		&p.LinkedinURL, &p.GithubURL, &p.PortfolioURL,
		&p.Education, &p.WorkAuthorization, &p.Skills, &p.Experiences, &p.Projects,
		&p.CreatedAt, &p.UpdatedAt,
	)
	if err == pgx.ErrNoRows {
		// Return default seeded profile for user
		return &models.UserProfile{
			ID:                uuid.New(),
			UserID:            userID,
			FullName:          "Candidate",
			Email:             "student@ubc.ca",
			City:              "Vancouver",
			Province:          "British Columbia",
			Education:         json.RawMessage(`{"school":"University of British Columbia (UBC)","degree":"B.Sc.","major":"Computer Science"}`),
			WorkAuthorization: json.RawMessage(`{"canadian_work_eligible":true,"coop_work_permit":true}`),
			Skills:            json.RawMessage(`["Go","Python","TypeScript","PostgreSQL"]`),
			Experiences:       json.RawMessage(`[]`),
			Projects:          json.RawMessage(`[]`),
			CreatedAt:         time.Now(),
			UpdatedAt:         time.Now(),
		}, nil
	}
	if err != nil {
		return nil, err
	}
	return &p, nil
}

func (db *DB) UpsertUserProfile(ctx context.Context, userID uuid.UUID, req models.UpdateProfileRequest) (*models.UserProfile, error) {
	query := `
		INSERT INTO user_profiles (
			id, user_id, full_name, email, phone, city, province,
			linkedin_url, github_url, portfolio_url,
			education, work_authorization, skills, experiences, projects,
			created_at, updated_at
		) VALUES (
			gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW()
		)
		ON CONFLICT (user_id) DO UPDATE SET
			full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), user_profiles.full_name),
			email = COALESCE(NULLIF(EXCLUDED.email, ''), user_profiles.email),
			phone = COALESCE(NULLIF(EXCLUDED.phone, ''), user_profiles.phone),
			city = COALESCE(NULLIF(EXCLUDED.city, ''), user_profiles.city),
			province = COALESCE(NULLIF(EXCLUDED.province, ''), user_profiles.province),
			linkedin_url = COALESCE(NULLIF(EXCLUDED.linkedin_url, ''), user_profiles.linkedin_url),
			github_url = COALESCE(NULLIF(EXCLUDED.github_url, ''), user_profiles.github_url),
			portfolio_url = COALESCE(NULLIF(EXCLUDED.portfolio_url, ''), user_profiles.portfolio_url),
			education = COALESCE(EXCLUDED.education, user_profiles.education),
			work_authorization = COALESCE(EXCLUDED.work_authorization, user_profiles.work_authorization),
			skills = COALESCE(EXCLUDED.skills, user_profiles.skills),
			experiences = COALESCE(EXCLUDED.experiences, user_profiles.experiences),
			projects = COALESCE(EXCLUDED.projects, user_profiles.projects),
			updated_at = NOW()
		RETURNING id, user_id, full_name, email, phone, city, province,
		          linkedin_url, github_url, portfolio_url,
		          education, work_authorization, skills, experiences, projects,
		          created_at, updated_at
	`
	var p models.UserProfile
	err := db.Pool.QueryRow(
		ctx, query,
		userID, req.FullName, req.Email, req.Phone, req.City, req.Province,
		req.LinkedinURL, req.GithubURL, req.PortfolioURL,
		req.Education, req.WorkAuthorization, req.Skills, req.Experiences, req.Projects,
	).Scan(
		&p.ID, &p.UserID, &p.FullName, &p.Email, &p.Phone, &p.City, &p.Province,
		&p.LinkedinURL, &p.GithubURL, &p.PortfolioURL,
		&p.Education, &p.WorkAuthorization, &p.Skills, &p.Experiences, &p.Projects,
		&p.CreatedAt, &p.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &p, nil
}

func (db *DB) SyncProfileFromBullets(ctx context.Context, userID uuid.UUID) (*models.UserProfile, error) {
	bullets, err := db.ListResumeBullets(ctx, &userID)
	if err != nil {
		return nil, err
	}

	expBullets := []string{}
	projBullets := []string{}

	for _, b := range bullets {
		switch b.Category {
		case "EXPERIENCE":
			expBullets = append(expBullets, b.Content)
		case "PROJECT", "RESEARCH":
			projBullets = append(projBullets, b.Content)
		}
	}

	// Fetch existing profile to preserve personal details
	currentProfile, err := db.GetUserProfile(ctx, userID)
	if err != nil {
		return nil, err
	}

	experiencesJSON, _ := json.Marshal([]map[string]interface{}{
		{
			"company":    "Tech Software Co-op",
			"role":       "Software Engineer Intern",
			"location":   "Vancouver, BC",
			"start_date": "May 2025",
			"end_date":   "Aug 2025",
			"bullets":    expBullets,
		},
	})

	projectsJSON, _ := json.Marshal([]map[string]interface{}{
		{
			"name":    "Trackr Career Engine & Vector Store",
			"link":    "https://github.com/divyeshchalla/trackr",
			"bullets": projBullets,
		},
	})

	req := models.UpdateProfileRequest{
		FullName:          currentProfile.FullName,
		Email:             currentProfile.Email,
		Phone:             currentProfile.Phone,
		City:              currentProfile.City,
		Province:          currentProfile.Province,
		LinkedinURL:       currentProfile.LinkedinURL,
		GithubURL:         currentProfile.GithubURL,
		PortfolioURL:      currentProfile.PortfolioURL,
		Education:         currentProfile.Education,
		WorkAuthorization: currentProfile.WorkAuthorization,
		Skills:            currentProfile.Skills,
		Experiences:       experiencesJSON,
		Projects:          projectsJSON,
	}

	return db.UpsertUserProfile(ctx, userID, req)
}
