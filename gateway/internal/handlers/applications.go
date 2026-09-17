package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/trackr/gateway/internal/models"
	"github.com/trackr/gateway/internal/redis"
)

var DefaultUserID = uuid.MustParse("00000000-0000-0000-0000-000000000001")

func (h *HandlerContext) ListApplications(c *gin.Context) {
	var uid *uuid.UUID
	userStr := c.Query("user_id")
	if userStr != "" {
		if parsed, err := uuid.Parse(userStr); err == nil {
			uid = &parsed
		}
	} else {
		uid = &DefaultUserID
	}

	var statusPtr *string
	status := c.Query("status")
	if status != "" {
		statusUpper := strings.ToUpper(status)
		statusPtr = &statusUpper
	}

	apps, err := h.DB.ListApplications(c.Request.Context(), uid, statusPtr)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list applications: " + err.Error()})
		return
	}

	if apps == nil {
		apps = []models.Application{}
	}

	c.JSON(http.StatusOK, gin.H{"data": apps, "count": len(apps)})
}

func (h *HandlerContext) GetApplication(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid application uuid"})
		return
	}

	app, err := h.DB.GetApplication(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "application not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": app})
}

func (h *HandlerContext) CreateApplication(c *gin.Context) {
	var req models.CreateApplicationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	uid := DefaultUserID
	if req.UserID != "" {
		if parsed, err := uuid.Parse(req.UserID); err == nil {
			uid = parsed
		}
	}

	status := string(models.StatusApplied)
	if req.Status != nil && *req.Status != "" {
		status = strings.ToUpper(*req.Status)
	}

	app := models.Application{
		ID:                uuid.New(),
		UserID:            uid,
		CompanyName:       req.CompanyName,
		RoleTitle:         req.RoleTitle,
		JobLocation:       req.JobLocation,
		WorkModel:         req.WorkModel,
		Status:            status,
		SalaryRange:       req.SalaryRange,
		JobDescriptionURL: req.JobDescriptionURL,
		RawDescription:    req.RawDescription,
	}
	if req.AppliedDate != nil {
		app.AppliedDate = *req.AppliedDate
	}

	if err := h.DB.CreateApplication(c.Request.Context(), &app); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create application: " + err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"data": app})
}

func (h *HandlerContext) UpdateStatus(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid application uuid"})
		return
	}

	var req models.UpdateStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	toStatus := strings.ToUpper(req.ToStatus)
	updatedApp, err := h.DB.UpdateApplicationStatus(c.Request.Context(), id, toStatus, req.Metadata)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":    updatedApp,
		"message": "status updated successfully",
	})
}

func (h *HandlerContext) IngestJD(c *gin.Context) {
	var req models.IngestJDRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.URL == nil && req.Text == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "either url or text must be provided"})
		return
	}

	uid := DefaultUserID
	if req.UserID != "" {
		if parsed, err := uuid.Parse(req.UserID); err == nil {
			uid = parsed
		}
	}

	// Create placeholder application
	app := models.Application{
		ID:                uuid.New(),
		UserID:            uid,
		CompanyName:       "Analyzing Job Description...",
		RoleTitle:         "Extracting Role...",
		Status:            string(models.StatusApplied),
		JobDescriptionURL: req.URL,
		RawDescription:    req.Text,
	}

	if err := h.DB.CreateApplication(c.Request.Context(), &app); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to initialize application: " + err.Error()})
		return
	}

	// Dispatch asynchronous extraction to Redis queue
	taskPayload := redis.JDIngestionPayload{
		ApplicationID: app.ID.String(),
		UserID:        uid.String(),
		URL:           req.URL,
		Text:          req.Text,
	}

	if err := h.Redis.EnqueueJDIngestion(c.Request.Context(), taskPayload); err != nil {
		// Log warning, continue with 202
		c.JSON(http.StatusAccepted, gin.H{
			"status":         "queued_warning",
			"application_id": app.ID,
			"warning":        "enqueued locally with error: " + err.Error(),
		})
		return
	}

	// Return 202 Accepted per PRD SLA requirements
	c.JSON(http.StatusAccepted, gin.H{
		"status":         "accepted",
		"message":        "Job description queued for zero-shot LLM parsing and RAG gap analysis",
		"application_id": app.ID,
	})
}

func (h *HandlerContext) GetApplicationTransitions(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid application uuid"})
		return
	}

	transitions, err := h.DB.ListStateTransitions(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list transitions: " + err.Error()})
		return
	}

	if transitions == nil {
		transitions = []models.ApplicationStateTransition{}
	}

	c.JSON(http.StatusOK, gin.H{"data": transitions})
}

type GenerateOutreachRequest struct {
	UserID       *string `json:"user_id"`
	OutreachType string  `json:"outreach_type"` // "COVER_LETTER", "LINKEDIN_NOTE", "EMAIL_RECRUITER"
	Tone         string  `json:"tone"`          // "IMPACT_DRIVEN", "CONCISE", "TECHNICAL"
}

func (h *HandlerContext) GenerateOutreach(c *gin.Context) {
	idStr := c.Param("id")
	appID, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid application uuid"})
		return
	}

	var req GenerateOutreachRequest
	_ = c.ShouldBindJSON(&req)

	uid := DefaultUserID
	if req.UserID != nil && *req.UserID != "" {
		if parsed, err := uuid.Parse(*req.UserID); err == nil {
			uid = parsed
		}
	}

	outreachType := req.OutreachType
	if outreachType == "" {
		outreachType = "COVER_LETTER"
	}
	tone := req.Tone
	if tone == "" {
		tone = "IMPACT_DRIVEN"
	}

	payload := map[string]interface{}{
		"application_id": appID.String(),
		"user_id":        uid.String(),
		"outreach_type":  outreachType,
		"tone":           tone,
	}
	payloadBytes, _ := json.Marshal(payload)

	workerURL := h.Config.AIWorkerURL + "/api/v1/outreach/generate"
	httpReq, err := http.NewRequestWithContext(c.Request.Context(), "POST", workerURL, bytes.NewBuffer(payloadBytes))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	httpReq.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 60 * time.Second}
	resp, err := client.Do(httpReq)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": "failed to connect to AI worker: " + err.Error()})
		return
	}
	defer resp.Body.Close()

	var workerResp map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&workerResp); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "invalid response from AI worker"})
		return
	}

	c.JSON(resp.StatusCode, workerResp)
}

func (h *HandlerContext) ScrapeJD(c *gin.Context) {
	var req struct {
		URL string `json:"url" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "url is required"})
		return
	}

	payloadBytes, _ := json.Marshal(req)
	workerURL := h.Config.AIWorkerURL + "/api/v1/scraper/scrape"
	httpReq, err := http.NewRequestWithContext(c.Request.Context(), "POST", workerURL, bytes.NewBuffer(payloadBytes))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	httpReq.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(httpReq)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": "failed to connect to headless scraper: " + err.Error()})
		return
	}
	defer resp.Body.Close()

	var workerResp map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&workerResp); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "invalid response from scraper"})
		return
	}

	c.JSON(resp.StatusCode, workerResp)
}
