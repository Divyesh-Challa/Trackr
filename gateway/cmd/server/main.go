package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/trackr/gateway/internal/config"
	"github.com/trackr/gateway/internal/database"
	"github.com/trackr/gateway/internal/handlers"
	"github.com/trackr/gateway/internal/middleware"
	"github.com/trackr/gateway/internal/redis"
)

func main() {
	cfg := config.LoadConfig()
	log.Printf("Starting Trackr Gateway on port %s...", cfg.Port)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Connect PostgreSQL
	db, err := database.ConnectDB(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Printf("[WARN] PostgreSQL connection warning: %v (will retry or serve with degraded DB)", err)
	} else {
		defer db.Close()
	}

	// Connect Redis
	rdb, err := redis.ConnectRedis(ctx, cfg.RedisURL)
	if err != nil {
		log.Printf("[WARN] Redis connection warning: %v (async queues degraded)", err)
	} else {
		defer rdb.Close()
	}

	hCtx := handlers.NewHandlerContext(db, rdb, cfg)

	router := gin.New()
	router.Use(gin.Recovery())
	router.Use(middleware.RequestLogger())
	router.Use(middleware.CORSMiddleware())

	// Health check
	router.GET("/health", func(c *gin.Context) {
		dbStatus := "disconnected"
		if db != nil && db.Pool.Ping(c.Request.Context()) == nil {
			dbStatus = "connected"
		}

		redisStatus := "disconnected"
		if rdb != nil && rdb.Rdb.Ping(c.Request.Context()).Err() == nil {
			redisStatus = "connected"
		}

		c.JSON(http.StatusOK, gin.H{
			"status":   "healthy",
			"service":  "trackr-gateway",
			"time":     time.Now().UTC(),
			"postgres": dbStatus,
			"redis":    redisStatus,
		})
	})

	// API v1 Routes
	v1 := router.Group("/api/v1")
	{
		// Applications
		v1.GET("/applications", hCtx.ListApplications)
		v1.POST("/applications", hCtx.CreateApplication)
		v1.GET("/applications/:id", hCtx.GetApplication)
		v1.DELETE("/applications/:id", hCtx.DeleteApplication)
		v1.PATCH("/applications/:id/status", hCtx.UpdateStatus)
		v1.POST("/applications/ingest-jd", hCtx.IngestJD)
		v1.GET("/applications/:id/transitions", hCtx.GetApplicationTransitions)

		// Huntr Per-Job Hub: Tasks, Contacts, Notes
		v1.GET("/applications/:id/tasks", hCtx.ListTasks)
		v1.POST("/applications/:id/tasks", hCtx.CreateTask)
		v1.PATCH("/tasks/:id/toggle", hCtx.ToggleTask)
		v1.DELETE("/tasks/:id", hCtx.DeleteTask)

		v1.GET("/applications/:id/contacts", hCtx.ListContacts)
		v1.POST("/applications/:id/contacts", hCtx.CreateContact)
		v1.DELETE("/contacts/:id", hCtx.DeleteContact)

		v1.GET("/applications/:id/notes", hCtx.ListNotes)
		v1.POST("/applications/:id/notes", hCtx.CreateNote)
		v1.DELETE("/notes/:id", hCtx.DeleteNote)

		// Resume Bullets & Tailoring
		v1.GET("/resumes/bullets", hCtx.ListBullets)
		v1.POST("/resumes/bullets", hCtx.CreateBullet)
		v1.PUT("/resumes/bullets/:id", hCtx.UpdateBullet)
		v1.DELETE("/resumes/bullets/:id", hCtx.DeleteBullet)
		v1.POST("/resumes/upload", hCtx.UploadResume)
		v1.POST("/resumes/tailor", hCtx.TailorResume)
		v1.POST("/cover-letter/generate", hCtx.GenerateCoverLetter)

		// Milestones & Deadlines
		v1.GET("/milestones", hCtx.ListMilestones)
		v1.POST("/milestones", hCtx.CreateMilestone)
		v1.PATCH("/milestones/:id/toggle", hCtx.ToggleMilestone)

		// Inbound Webhooks
		v1.POST("/webhooks/inbound-email", hCtx.InboundEmailWebhook)

		// AI Interview STAR Simulator
		v1.POST("/interview/simulate-evaluate", hCtx.SimulateEvaluateSSE)
		v1.POST("/interview/start", hCtx.StartInterview)
		v1.POST("/interview/respond", hCtx.RespondInterview)

		// RAG Outreach & Cover Letter Generation
		v1.POST("/applications/:id/generate-outreach", hCtx.GenerateOutreach)

		// Headless Browser Scraper
		v1.POST("/scraper/scrape", hCtx.ScrapeJD)

		// Simplify Platform: Discovered Jobs (BC & Alberta Tech Hubs, Canada & US)
		v1.GET("/jobs/feed", hCtx.ListDiscoveredJobs)
		v1.GET("/jobs/:id", hCtx.GetDiscoveredJob)
		v1.POST("/jobs/batch-ingest", hCtx.BatchIngestJobs)

		// Simplify Platform: Canonical Profile & ATS Autofill Bridge
		v1.GET("/profile", hCtx.GetUserProfile)
		v1.PUT("/profile", hCtx.UpdateUserProfile)
		v1.POST("/profile/sync-resume", hCtx.SyncProfileFromResume)
		v1.GET("/profile/export", hCtx.ExportProfileForATS)
	}

	srv := &http.Server{
		Addr:    ":" + cfg.Port,
		Handler: router,
	}

	go func() {
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("listen: %s\n", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("Shutting down Trackr Gateway gracefully...")

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer shutdownCancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Fatal("Server forced to shutdown: ", err)
	}

	log.Println("Trackr Gateway stopped.")
}
