package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/trackr/gateway/internal/models"
)

// ListDiscoveredJobs handles GET /api/v1/jobs/feed
func (h *HandlerContext) ListDiscoveredJobs(c *gin.Context) {
	uid := DefaultUserID
	if userStr := c.Query("user_id"); userStr != "" {
		if parsed, err := uuid.Parse(userStr); err == nil {
			uid = parsed
		}
	}

	var provPtr *string
	if prov := c.Query("province"); prov != "" {
		provPtr = &prov
	}

	var wmPtr *string
	if wm := c.Query("work_model"); wm != "" {
		wmPtr = &wm
	}

	var typePtr *string
	if jt := c.Query("type"); jt != "" {
		typePtr = &jt
	}

	var searchPtr *string
	if s := c.Query("search"); s != "" {
		searchPtr = &s
	}

	jobs, err := h.DB.ListDiscoveredJobs(c.Request.Context(), uid, provPtr, wmPtr, typePtr, searchPtr)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list discovered jobs: " + err.Error()})
		return
	}

	if jobs == nil {
		jobs = []models.DiscoveredJob{}
	}

	c.JSON(http.StatusOK, gin.H{
		"data":  jobs,
		"count": len(jobs),
		"scope": "British Columbia & Alberta Tech Hubs",
	})
}

// GetDiscoveredJob handles GET /api/v1/jobs/:id
func (h *HandlerContext) GetDiscoveredJob(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid job uuid"})
		return
	}

	uid := DefaultUserID
	if userStr := c.Query("user_id"); userStr != "" {
		if parsed, err := uuid.Parse(userStr); err == nil {
			uid = parsed
		}
	}

	job, err := h.DB.GetDiscoveredJob(c.Request.Context(), id, uid)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "job not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": job})
}

// BatchIngestJobs handles POST /api/v1/jobs/batch-ingest
func (h *HandlerContext) BatchIngestJobs(c *gin.Context) {
	var req models.BatchIngestJobsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid batch ingest payload: " + err.Error()})
		return
	}

	if len(req.Jobs) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "no jobs provided"})
		return
	}

	count, err := h.DB.BatchUpsertDiscoveredJobs(c.Request.Context(), req.Jobs)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to batch upsert jobs: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":  "Batch ingestion completed successfully",
		"upserted": count,
		"received": len(req.Jobs),
	})
}

// GetUserProfile handles GET /api/v1/profile
func (h *HandlerContext) GetUserProfile(c *gin.Context) {
	uid := DefaultUserID
	if userStr := c.Query("user_id"); userStr != "" {
		if parsed, err := uuid.Parse(userStr); err == nil {
			uid = parsed
		}
	}

	profile, err := h.DB.GetUserProfile(c.Request.Context(), uid)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch user profile: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": profile})
}

// UpdateUserProfile handles PUT /api/v1/profile
func (h *HandlerContext) UpdateUserProfile(c *gin.Context) {
	uid := DefaultUserID
	if userStr := c.Query("user_id"); userStr != "" {
		if parsed, err := uuid.Parse(userStr); err == nil {
			uid = parsed
		}
	}

	var req models.UpdateProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid profile payload: " + err.Error()})
		return
	}

	profile, err := h.DB.UpsertUserProfile(c.Request.Context(), uid, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update user profile: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":    profile,
		"message": "Canonical profile updated successfully",
	})
}

// SyncProfileFromResume handles POST /api/v1/profile/sync-resume
func (h *HandlerContext) SyncProfileFromResume(c *gin.Context) {
	uid := DefaultUserID
	if userStr := c.Query("user_id"); userStr != "" {
		if parsed, err := uuid.Parse(userStr); err == nil {
			uid = parsed
		}
	}

	profile, err := h.DB.SyncProfileFromBullets(c.Request.Context(), uid)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to sync profile from resume bullets: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":    profile,
		"message": "Successfully synchronized profile with Resume Studio pgvector store",
	})
}

// ExportProfileForATS handles GET /api/v1/profile/export
// Outputs a standardized autofill schema for Workday, Greenhouse, and Lever
func (h *HandlerContext) ExportProfileForATS(c *gin.Context) {
	uid := DefaultUserID
	if userStr := c.Query("user_id"); userStr != "" {
		if parsed, err := uuid.Parse(userStr); err == nil {
			uid = parsed
		}
	}

	profile, err := h.DB.GetUserProfile(c.Request.Context(), uid)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch profile for export: " + err.Error()})
		return
	}

	var edu map[string]interface{}
	_ = json.Unmarshal(profile.Education, &edu)

	var workAuth map[string]interface{}
	_ = json.Unmarshal(profile.WorkAuthorization, &workAuth)

	var skills []string
	_ = json.Unmarshal(profile.Skills, &skills)

	var exps []map[string]interface{}
	_ = json.Unmarshal(profile.Experiences, &exps)

	var projs []map[string]interface{}
	_ = json.Unmarshal(profile.Projects, &projs)

	exportPayload := gin.H{
		"version": "1.0",
		"generator": "Trackr Simplify ATS Bridge",
		"candidate": gin.H{
			"full_name":     profile.FullName,
			"email":         profile.Email,
			"phone":         profile.Phone,
			"city":          profile.City,
			"province":      profile.Province,
			"country":       "Canada",
			"linkedin_url":  profile.LinkedinURL,
			"github_url":    profile.GithubURL,
			"portfolio_url": profile.PortfolioURL,
		},
		"work_authorization": gin.H{
			"legally_authorized_canada": workAuth["canadian_work_eligible"],
			"coop_work_permit":          workAuth["coop_work_permit"],
			"requires_sponsorship":      workAuth["requires_sponsorship"],
			"status":                    workAuth["work_auth_status"],
		},
		"education": []gin.H{
			{
				"school":            edu["school"],
				"degree":            edu["degree"],
				"major":             edu["major"],
				"gpa":               edu["gpa"],
				"graduation_term":   edu["grad_term"],
				"enrolled_in_coop":  edu["is_coop_enrolled"],
			},
		},
		"skills":      skills,
		"experience":  exps,
		"projects":    projs,
		"ats_compatibility": gin.H{
			"workday":    true,
			"greenhouse": true,
			"lever":      true,
			"icims":      true,
		},
	}

	c.JSON(http.StatusOK, gin.H{
		"data": exportPayload,
		"meta": gin.H{
			"status": "ready_for_autofill",
			"fields_count": len(skills) + len(exps) + 5,
		},
	})
}
