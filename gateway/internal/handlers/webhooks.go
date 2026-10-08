package handlers

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/trackr/gateway/internal/models"
	"github.com/trackr/gateway/internal/redis"
)

func (h *HandlerContext) InboundEmailWebhook(c *gin.Context) {
	var sender, subject, body string

	// Check Content-Type (multipart form from SendGrid or JSON)
	contentType := c.GetHeader("Content-Type")
	if strings.HasPrefix(contentType, "multipart/form-data") || strings.HasPrefix(contentType, "application/x-www-form-urlencoded") {
		sender = c.PostForm("from")
		subject = c.PostForm("subject")
		body = c.PostForm("text")
		if body == "" {
			body = c.PostForm("html")
		}
	} else {
		var payload models.InboundEmailWebhookPayload
		if err := c.ShouldBindJSON(&payload); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid webhook payload: " + err.Error()})
			return
		}
		sender = payload.Sender
		subject = payload.Subject
		body = payload.Body
		if body == "" {
			body = payload.HTML
		}
	}

	if sender == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "sender email is required"})
		return
	}

	// Try matching sender domain or name to an active application
	var matchedAppID *uuid.UUID
	parts := strings.Split(sender, "@")
	if len(parts) == 2 {
		domain := strings.Split(parts[1], ".")[0] // e.g. "amazon" from "amazon.com"
		if appID, err := h.DB.FindApplicationBySenderDomain(c.Request.Context(), domain); err == nil && appID != nil {
			matchedAppID = appID
		}
	}

	logEntry := models.InboundEmailLog{
		ID:            uuid.New(),
		ApplicationID: matchedAppID,
		Sender:        sender,
		Subject:       subject,
	}

	if err := h.DB.CreateInboundEmailLog(c.Request.Context(), &logEntry); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to record email log: " + err.Error()})
		return
	}

	// Enqueue for async classification worker if Redis is connected
	if h.Redis != nil {
		_ = h.Redis.EnqueueEmailClassification(c.Request.Context(), redis.EmailClassificationPayload{
			LogID:   logEntry.ID.String(),
			Sender:  sender,
			Subject: subject,
			Body:    body,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"status":                 "received",
		"log_id":                 logEntry.ID,
		"matched_application_id": matchedAppID,
		"message":                "email queued for intent classification and milestone scheduling",
	})
}
