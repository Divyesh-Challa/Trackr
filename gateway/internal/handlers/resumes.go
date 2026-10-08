package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/trackr/gateway/internal/models"
	"github.com/trackr/gateway/internal/redis"
)

func (h *HandlerContext) ListBullets(c *gin.Context) {
	uid := DefaultUserID
	userStr := c.Query("user_id")
	if userStr != "" {
		if parsed, err := uuid.Parse(userStr); err == nil {
			uid = parsed
		}
	}

	bullets, err := h.DB.ListResumeBullets(c.Request.Context(), &uid)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list resume bullets: " + err.Error()})
		return
	}

	if bullets == nil {
		bullets = []models.ResumeBullet{}
	}

	c.JSON(http.StatusOK, gin.H{"data": bullets, "count": len(bullets)})
}

func (h *HandlerContext) CreateBullet(c *gin.Context) {
	var req models.CreateResumeBulletRequest
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

	bullet := models.ResumeBullet{
		ID:       uuid.New(),
		UserID:   uid,
		Category: req.Category,
		Content:  req.Content,
	}

	if err := h.DB.CreateResumeBullet(c.Request.Context(), &bullet); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save resume bullet: " + err.Error()})
		return
	}

	// Dispatch asynchronous vectorization
	if h.Redis != nil {
		_ = h.Redis.EnqueueResumeVectorization(c.Request.Context(), redis.ResumeVectorizationPayload{
			BulletID: bullet.ID.String(),
			UserID:   uid.String(),
			Content:  bullet.Content,
		})
	}

	c.JSON(http.StatusCreated, gin.H{
		"data":    bullet,
		"message": "resume bullet saved and queued for vector embedding",
	})
}

func (h *HandlerContext) UpdateBullet(c *gin.Context) {
	idStr := c.Param("id")
	bulletID, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid bullet id UUID"})
		return
	}

	var req struct {
		Content  string `json:"content" binding:"required"`
		Category string `json:"category"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if req.Category == "" {
		req.Category = "EXPERIENCE"
	}

	bullet, err := h.DB.UpdateResumeBullet(c.Request.Context(), bulletID, req.Content, req.Category)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update bullet: " + err.Error()})
		return
	}

	// Dispatch asynchronous vectorization
	if h.Redis != nil {
		_ = h.Redis.EnqueueResumeVectorization(c.Request.Context(), redis.ResumeVectorizationPayload{
			BulletID: bullet.ID.String(),
			UserID:   bullet.UserID.String(),
			Content:  bullet.Content,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"data":    bullet,
		"message": "resume bullet updated and queued for vector embedding",
	})
}

func (h *HandlerContext) DeleteBullet(c *gin.Context) {
	idStr := c.Param("id")
	bulletID, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid bullet id UUID"})
		return
	}

	if err := h.DB.DeleteResumeBullet(c.Request.Context(), bulletID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete bullet: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status":    "deleted",
		"bullet_id": idStr,
	})
}

func (h *HandlerContext) UploadResume(c *gin.Context) {
	uid := DefaultUserID
	userStr := c.PostForm("user_id")
	if userStr != "" {
		if parsed, err := uuid.Parse(userStr); err == nil {
			uid = parsed
		}
	}

	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "file field is required in multipart form"})
		return
	}
	defer file.Close()

	fileBytes, err := io.ReadAll(file)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to read uploaded file: " + err.Error()})
		return
	}

	// Forward to Python AI Worker for real-time extraction & embedding
	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	part, err := writer.CreateFormFile("file", header.Filename)
	if err == nil {
		_, _ = part.Write(fileBytes)
		_ = writer.WriteField("user_id", uid.String())
		_ = writer.Close()

		workerURL := h.Config.AIWorkerURL + "/api/v1/resumes/upload"
		uploadCtx, uploadCancel := context.WithTimeout(c.Request.Context(), 90*time.Second)
		defer uploadCancel()
		req, err := http.NewRequestWithContext(uploadCtx, "POST", workerURL, &body)
		if err == nil {
			req.Header.Set("Content-Type", writer.FormDataContentType())
			resp, err := h.HTTPClient.Do(req)
			if err == nil {
				defer resp.Body.Close()
				if resp.StatusCode == http.StatusOK {
					var workerResp map[string]interface{}
					if err := json.NewDecoder(resp.Body).Decode(&workerResp); err == nil {
						c.JSON(http.StatusOK, workerResp)
						return
					}
				}
			}
		}
	}

	// Fallback to asynchronous Redis queue if Python worker is in decoupled queue mode
	if h.Redis != nil {
		_ = h.Redis.EnqueueResumeExtraction(c.Request.Context(), redis.ResumeExtractionPayload{
			UserID:   uid.String(),
			FileName: header.Filename,
			Content:  string(fileBytes),
		})

		c.JSON(http.StatusAccepted, gin.H{
			"status":   "queued",
			"filename": header.Filename,
			"message":  "Resume uploaded and queued for background AI extraction and vector indexing",
		})
		return
	}

	c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to process resume upload"})
}

func (h *HandlerContext) TailorResume(c *gin.Context) {
	var body map[string]interface{}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body: " + err.Error()})
		return
	}

	payloadBytes, _ := json.Marshal(body)
	workerURL := fmt.Sprintf("%s/api/v1/resumes/tailor", h.Config.AIWorkerURL)

	ctx, cancel := context.WithTimeout(c.Request.Context(), 90*time.Second)
	defer cancel()

	httpReq, err := http.NewRequestWithContext(ctx, "POST", workerURL, bytes.NewBuffer(payloadBytes))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := h.HTTPClient.Do(httpReq)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": "failed to connect to AI Worker: " + err.Error()})
		return
	}
	defer resp.Body.Close()

	var workerResp map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&workerResp); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to parse AI Worker response"})
		return
	}

	c.JSON(resp.StatusCode, workerResp)
}

func (h *HandlerContext) GenerateCoverLetter(c *gin.Context) {
	var body map[string]interface{}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body: " + err.Error()})
		return
	}

	payloadBytes, _ := json.Marshal(body)
	workerURL := fmt.Sprintf("%s/api/v1/cover-letter/generate", h.Config.AIWorkerURL)

	ctx, cancel := context.WithTimeout(c.Request.Context(), 90*time.Second)
	defer cancel()

	httpReq, err := http.NewRequestWithContext(ctx, "POST", workerURL, bytes.NewBuffer(payloadBytes))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := h.HTTPClient.Do(httpReq)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": "failed to connect to AI Worker: " + err.Error()})
		return
	}
	defer resp.Body.Close()

	var workerResp map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&workerResp); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to parse AI Worker response"})
		return
	}

	c.JSON(resp.StatusCode, workerResp)
}

