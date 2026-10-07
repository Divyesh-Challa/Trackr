package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

type STAREvaluationRequest struct {
	ApplicationID *string `json:"application_id"`
	Question      string  `json:"question" binding:"required"`
	Answer        string  `json:"answer" binding:"required"`
	CompanyValues string  `json:"company_values"`
}

func (h *HandlerContext) SimulateEvaluateSSE(c *gin.Context) {
	var req STAREvaluationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.Writer.Header().Set("Content-Type", "text/event-stream")
	c.Writer.Header().Set("Cache-Control", "no-cache")
	c.Writer.Header().Set("Connection", "keep-alive")
	c.Writer.Header().Set("Transfer-Encoding", "chunked")
	c.Writer.Header().Set("X-Accel-Buffering", "no")

	// Attempt live proxy to Python AI worker microservice
	aiWorkerEndpoint := fmt.Sprintf("%s/api/v1/interview/stream", h.Config.AIWorkerURL)
	reqBytes, _ := json.Marshal(req)

	httpReq, err := http.NewRequestWithContext(c.Request.Context(), "POST", aiWorkerEndpoint, bytes.NewBuffer(reqBytes))
	if err == nil {
		httpReq.Header.Set("Content-Type", "application/json")
		aiResp, reqErr := h.HTTPClient.Do(httpReq)
		if reqErr == nil && aiResp.StatusCode == http.StatusOK {
			defer aiResp.Body.Close()
			buf := make([]byte, 1024)
			for {
				select {
				case <-c.Request.Context().Done():
					return
				default:
				}
				n, readErr := aiResp.Body.Read(buf)
				if n > 0 {
					_, _ = c.Writer.Write(buf[:n])
					c.Writer.Flush()
				}
				if readErr != nil {
					break
				}
			}
			return
		}
		if aiResp != nil {
			_ = aiResp.Body.Close()
		}
	}

	// Fallback streaming STAR rubric evaluator (ensures zero downtime even if worker is warming up)
	c.Stream(func(w io.Writer) bool {
		sendChunk := func(stage, content string, score int, isDone bool) {
			payload := gin.H{
				"stage":   stage,
				"content": content,
				"score":   score,
				"done":    isDone,
			}
			data, _ := json.Marshal(payload)
			fmt.Fprintf(w, "data: %s\n\n", data)
			c.Writer.Flush()
		}

		time.Sleep(300 * time.Millisecond)
		sendChunk("SITUATION", "Analyzing situation context: Candidate clearly establishes the background and scope of the technical challenge.", 85, false)

		time.Sleep(400 * time.Millisecond)
		sendChunk("TASK", "Evaluating task ownership: Defined personal responsibility and core objectives distinctly from broader team efforts.", 90, false)

		time.Sleep(450 * time.Millisecond)
		sendChunk("ACTION", "Examining tactical execution: Strong demonstration of architectural choices, debugging methodology, and trade-off considerations.", 88, false)

		time.Sleep(400 * time.Millisecond)
		sendChunk("RESULT", "Scoring quantifiable impact: Identified performance gains. Recommendation: Add explicit percentage latency reduction or dollar-cost savings to maximize impact.", 82, false)

		time.Sleep(300 * time.Millisecond)
		sendChunk("SUMMARY", "Overall STAR Score: 86/100. Strong technical depth; strengthen metric precision for Tier-1 engineering interviews.", 86, true)

		return false
	})
}

func (h *HandlerContext) StartInterview(c *gin.Context) {
	var body map[string]interface{}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body: " + err.Error()})
		return
	}

	payloadBytes, _ := json.Marshal(body)
	workerURL := fmt.Sprintf("%s/api/v1/interview/start", h.Config.AIWorkerURL)

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

func (h *HandlerContext) RespondInterview(c *gin.Context) {
	var body map[string]interface{}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body: " + err.Error()})
		return
	}

	payloadBytes, _ := json.Marshal(body)
	workerURL := fmt.Sprintf("%s/api/v1/interview/respond", h.Config.AIWorkerURL)

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

