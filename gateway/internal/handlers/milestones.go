package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/trackr/gateway/internal/models"
)

func (h *HandlerContext) ListMilestones(c *gin.Context) {
	var appIDPtr *uuid.UUID
	appIDStr := c.Query("application_id")
	if appIDStr != "" {
		if parsed, err := uuid.Parse(appIDStr); err == nil {
			appIDPtr = &parsed
		}
	}

	activeOnly := c.Query("active_only") == "true"

	milestones, err := h.DB.ListMilestones(c.Request.Context(), appIDPtr, activeOnly)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list milestones: " + err.Error()})
		return
	}

	if milestones == nil {
		milestones = []models.ApplicationMilestone{}
	}

	c.JSON(http.StatusOK, gin.H{"data": milestones, "count": len(milestones)})
}

func (h *HandlerContext) CreateMilestone(c *gin.Context) {
	var req models.CreateMilestoneRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	appID, err := uuid.Parse(req.ApplicationID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid application uuid"})
		return
	}

	m := models.ApplicationMilestone{
		ID:            uuid.New(),
		ApplicationID: appID,
		MilestoneType: req.MilestoneType,
		ActionURL:     req.ActionURL,
		IsCompleted:   false,
	}

	if req.ScheduledAt != nil && *req.ScheduledAt != "" {
		if t, err := time.Parse(time.RFC3339, *req.ScheduledAt); err == nil {
			m.ScheduledAt = &t
		}
	}
	if req.DeadlineAt != nil && *req.DeadlineAt != "" {
		if t, err := time.Parse(time.RFC3339, *req.DeadlineAt); err == nil {
			m.DeadlineAt = &t
		}
	}

	if err := h.DB.CreateMilestone(c.Request.Context(), &m); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create milestone: " + err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"data": m})
}

type ToggleMilestoneRequest struct {
	IsCompleted bool `json:"is_completed"`
}

func (h *HandlerContext) ToggleMilestone(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid milestone uuid"})
		return
	}

	var req ToggleMilestoneRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.DB.UpdateMilestoneCompletion(c.Request.Context(), id, req.IsCompleted); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update milestone: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "milestone updated", "is_completed": req.IsCompleted})
}
