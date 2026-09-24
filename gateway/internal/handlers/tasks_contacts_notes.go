package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/trackr/gateway/internal/models"
)

// DeleteApplication handles deleting an entire application
func (h *HandlerContext) DeleteApplication(c *gin.Context) {
	idStr := c.Param("id")
	appID, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid application uuid"})
		return
	}

	if err := h.DB.DeleteApplication(c.Request.Context(), appID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete application: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "deleted", "id": idStr})
}

// Tasks Handlers

func (h *HandlerContext) ListTasks(c *gin.Context) {
	idStr := c.Param("id")
	appID, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid application uuid"})
		return
	}

	tasks, err := h.DB.ListTasks(c.Request.Context(), appID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if tasks == nil {
		tasks = []models.ApplicationTask{}
	}

	c.JSON(http.StatusOK, gin.H{"data": tasks, "count": len(tasks)})
}

func (h *HandlerContext) CreateTask(c *gin.Context) {
	idStr := c.Param("id")
	appID, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid application uuid"})
		return
	}

	var req models.CreateTaskRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	task, err := h.DB.CreateTask(c.Request.Context(), appID, req.Title, req.DueDate)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"data": task})
}

func (h *HandlerContext) ToggleTask(c *gin.Context) {
	idStr := c.Param("id")
	taskID, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid task uuid"})
		return
	}

	var req struct {
		IsCompleted bool `json:"is_completed"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.DB.ToggleTask(c.Request.Context(), taskID, req.IsCompleted); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "updated"})
}

func (h *HandlerContext) DeleteTask(c *gin.Context) {
	idStr := c.Param("id")
	taskID, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid task uuid"})
		return
	}

	if err := h.DB.DeleteTask(c.Request.Context(), taskID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "deleted"})
}

// Contacts Handlers

func (h *HandlerContext) ListContacts(c *gin.Context) {
	idStr := c.Param("id")
	appID, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid application uuid"})
		return
	}

	contacts, err := h.DB.ListContacts(c.Request.Context(), appID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if contacts == nil {
		contacts = []models.ApplicationContact{}
	}

	c.JSON(http.StatusOK, gin.H{"data": contacts, "count": len(contacts)})
}

func (h *HandlerContext) CreateContact(c *gin.Context) {
	idStr := c.Param("id")
	appID, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid application uuid"})
		return
	}

	var req models.CreateContactRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	contact, err := h.DB.CreateContact(c.Request.Context(), appID, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"data": contact})
}

func (h *HandlerContext) DeleteContact(c *gin.Context) {
	idStr := c.Param("id")
	contactID, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid contact uuid"})
		return
	}

	if err := h.DB.DeleteContact(c.Request.Context(), contactID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "deleted"})
}

// Notes Handlers

func (h *HandlerContext) ListNotes(c *gin.Context) {
	idStr := c.Param("id")
	appID, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid application uuid"})
		return
	}

	notes, err := h.DB.ListNotes(c.Request.Context(), appID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if notes == nil {
		notes = []models.ApplicationNote{}
	}

	c.JSON(http.StatusOK, gin.H{"data": notes, "count": len(notes)})
}

func (h *HandlerContext) CreateNote(c *gin.Context) {
	idStr := c.Param("id")
	appID, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid application uuid"})
		return
	}

	var req models.CreateNoteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	note, err := h.DB.CreateNote(c.Request.Context(), appID, req.Title, req.Content)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"data": note})
}

func (h *HandlerContext) DeleteNote(c *gin.Context) {
	idStr := c.Param("id")
	noteID, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid note uuid"})
		return
	}

	if err := h.DB.DeleteNote(c.Request.Context(), noteID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "deleted"})
}
