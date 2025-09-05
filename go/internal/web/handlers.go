package web

import (
	"fmt"
	"net/http"
	"os"
	"runtime"
	"strconv"
	"strings"
	"time"

	"github.com/brettchalupa/dlm-go/internal/config"
	"github.com/brettchalupa/dlm-go/internal/models"
	"github.com/gin-gonic/gin"
)

// handleIndex serves the main web UI
func (s *Server) handleIndex(c *gin.Context) {
	// Get download counts
	counts, err := s.db.CountDownloads()
	if err != nil {
		c.HTML(http.StatusInternalServerError, "error.html", gin.H{"error": err.Error()})
		return
	}

	// Get recent downloads
	downloads, err := s.db.GetAllDownloads(50)
	if err != nil {
		c.HTML(http.StatusInternalServerError, "error.html", gin.H{"error": err.Error()})
		return
	}

	// Get error downloads
	errorDownloads, err := s.db.GetDownloadsByStatus(models.StatusError, 0)
	if err != nil {
		c.HTML(http.StatusInternalServerError, "error.html", gin.H{"error": err.Error()})
		return
	}

	// Read logs
	logs := ""
	if logData, err := os.ReadFile("dlm.log"); err == nil {
		logLines := strings.Split(string(logData), "\n")
		if len(logLines) > 100 {
			logLines = logLines[len(logLines)-100:]
		}
		logs = strings.Join(logLines, "\n")
	} else {
		logs = "No log file found or error reading logs."
	}

	c.HTML(http.StatusOK, "index.html", gin.H{
		"counts":         counts,
		"downloads":      downloads,
		"errorDownloads": errorDownloads,
		"logs":           logs,
	})
}

// handleAddURLsForm handles form-based URL submission
func (s *Server) handleAddURLsForm(c *gin.Context) {
	urls := c.PostForm("urls")
	urlList := parseURLs(urls)
	
	if err := s.processor.AddURLs(urlList); err != nil {
		s.logger.Error("Failed to add URLs:", err)
	}
	
	s.logger.Log("URLs:", urlList)
	c.Redirect(http.StatusFound, "/")
}

// handleAddURLsAPI handles API-based URL submission
func (s *Server) handleAddURLsAPI(c *gin.Context) {
	var req models.AddURLsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Error: err.Error()})
		return
	}

	urlList := parseURLs(req.URLs)
	if err := s.processor.AddURLs(urlList); err != nil {
		s.logger.Error("Failed to add URLs:", err)
		c.JSON(http.StatusInternalServerError, models.APIResponse{Error: err.Error()})
		return
	}

	s.logger.Log("added URLs:", strings.Join(urlList, ", "))
	c.JSON(http.StatusOK, models.APIResponse{Message: "Downloads being added to database."})
}

// handleCount returns download counts by status
func (s *Server) handleCount(c *gin.Context) {
	counts, err := s.db.CountDownloads()
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Error: err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"statusGroups": counts})
}

// handleDownload triggers download processing
func (s *Server) handleDownload(c *gin.Context) {
	var req models.DownloadRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Error: err.Error()})
		return
	}

	limit := req.Limit
	if limit <= 0 {
		limit = 3
	}

	downloads, err := s.db.GetDownloadsByStatus(models.StatusPending, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Error: err.Error()})
		return
	}

	// Process downloads asynchronously
	go func() {
		if err := s.processor.ProcessDownloads(downloads); err != nil {
			s.logger.Error("Failed to process downloads:", err)
		}
	}()

	c.JSON(http.StatusOK, models.APIResponse{Message: fmt.Sprintf("Downloading %d downloads async", len(downloads))})
}

// handleGetDownloads returns all downloads
func (s *Server) handleGetDownloads(c *gin.Context) {
	downloads, err := s.db.GetAllDownloads(0)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Error: err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"downloads": downloads})
}

// handleGetUpcoming returns upcoming pending downloads
func (s *Server) handleGetUpcoming(c *gin.Context) {
	downloads, err := s.db.GetDownloadsByStatus(models.StatusPending, 10)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Error: err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"downloads": downloads})
}

// handleGetRecent returns recent downloads
func (s *Server) handleGetRecent(c *gin.Context) {
	downloads, err := s.db.GetAllDownloads(10)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Error: err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"downloads": downloads})
}

// handleGetConfig returns the current configuration
func (s *Server) handleGetConfig(c *gin.Context) {
	collections, err := config.LoadCollectionsFromConfig("")
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Error: "Failed to load configuration"})
		return
	}

	configMap := make(map[string]map[string]interface{})
	for _, collection := range collections {
		configMap[collection.Name] = map[string]interface{}{
			"dir":     collection.Dir,
			"command": collection.Command,
			"domains": collection.Domains,
		}
	}

	c.JSON(http.StatusOK, gin.H{"collections": configMap})
}

// handleGetSystem returns system information
func (s *Server) handleGetSystem(c *gin.Context) {
	var m runtime.MemStats
	runtime.ReadMemStats(&m)

	systemInfo := models.SystemInfo{
		Memory: models.MemoryInfo{
			RSS:       fmt.Sprintf("%d MB", m.Sys/1024/1024),
			HeapUsed:  fmt.Sprintf("%d MB", m.HeapInuse/1024/1024),
			HeapTotal: fmt.Sprintf("%d MB", m.HeapSys/1024/1024),
		},
		Version: runtime.Version(),
		Uptime:  fmt.Sprintf("%.0fs", time.Since(startTime).Seconds()),
	}

	c.JSON(http.StatusOK, systemInfo)
}

// handleGetLogs returns recent log entries
func (s *Server) handleGetLogs(c *gin.Context) {
	logData, err := os.ReadFile("dlm.log")
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"logs": []string{"No log file found or error reading logs."}})
		return
	}

	lines := strings.Split(string(logData), "\n")
	if len(lines) > 100 {
		lines = lines[len(lines)-100:]
	}

	// Filter out HTTP request logs
	filteredLines := make([]string, 0)
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line != "" && !strings.Contains(line, "[GET]") && !strings.Contains(line, "[POST]") {
			filteredLines = append(filteredLines, line)
		}
	}

	c.JSON(http.StatusOK, gin.H{"logs": filteredLines})
}

// handleGetDownload returns a specific download by ID
func (s *Server) handleGetDownload(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Error: "Invalid download ID"})
		return
	}

	download, err := s.db.GetDownload(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Error: err.Error()})
		return
	}

	if download == nil {
		c.JSON(http.StatusNotFound, models.APIResponse{Message: "download not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"download": download})
}

// handleDeleteDownload deletes a specific download
func (s *Server) handleDeleteDownload(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Error: "Invalid download ID"})
		return
	}

	download, err := s.db.GetDownload(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Error: err.Error()})
		return
	}

	if download == nil {
		c.JSON(http.StatusNotFound, models.APIResponse{Message: "download not found"})
		return
	}

	if err := s.db.DeleteDownload(id); err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Error: err.Error()})
		return
	}

	titleStr := download.URL
	if download.Title != nil {
		titleStr = *download.Title
	}
	s.logger.Log(fmt.Sprintf("download deleted from db: %s", titleStr))

	c.JSON(http.StatusOK, models.APIResponse{Message: "download deleted"})
}

// handleRetryDownload retries a failed download
func (s *Server) handleRetryDownload(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Error: "Invalid download ID"})
		return
	}

	success, err := s.db.RetryDownload(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Error: err.Error()})
		return
	}

	if !success {
		c.JSON(http.StatusNotFound, models.APIResponse{Message: "download not found or not in error state"})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{Message: "download marked for retry"})
}

// handleResetDownload resets a downloading download to pending
func (s *Server) handleResetDownload(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Error: "Invalid download ID"})
		return
	}

	success, err := s.db.ResetDownload(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Error: err.Error()})
		return
	}

	if !success {
		c.JSON(http.StatusNotFound, models.APIResponse{Message: "download not found or not in downloading state"})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{Message: "download reset to pending"})
}

// handleRedownload marks a successful download for redownload
func (s *Server) handleRedownload(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Error: "Invalid download ID"})
		return
	}

	success, err := s.db.RedownloadSuccess(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Error: err.Error()})
		return
	}

	if !success {
		c.JSON(http.StatusNotFound, models.APIResponse{Message: "download not found or not in success state"})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{Message: "download marked for redownload"})
}

// handleRetryAllFailed retries all failed downloads
func (s *Server) handleRetryAllFailed(c *gin.Context) {
	count, err := s.db.RetryAllFailedDownloads()
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Error: err.Error()})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{Message: fmt.Sprintf("%d failed downloads marked for retry", count)})
}

// handleDeleteAllFailed deletes all failed downloads
func (s *Server) handleDeleteAllFailed(c *gin.Context) {
	count, err := s.db.DeleteAllFailedDownloads()
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Error: err.Error()})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{Message: fmt.Sprintf("%d failed downloads deleted", count)})
}

// handleResetAllDownloading resets all downloading downloads to pending
func (s *Server) handleResetAllDownloading(c *gin.Context) {
	count, err := s.db.ResetAllDownloadingDownloads()
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Error: err.Error()})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{Message: fmt.Sprintf("%d downloading downloads reset to pending", count)})
}

// parseURLs parses URLs from various input formats
func parseURLs(input interface{}) []string {
	switch v := input.(type) {
	case []string:
		urls := make([]string, 0, len(v))
		for _, url := range v {
			url = strings.TrimSpace(url)
			if url != "" {
				urls = append(urls, url)
			}
		}
		return urls
	case string:
		urls := make([]string, 0)
		lines := strings.Split(v, "\n")
		for _, line := range lines {
			parts := strings.Split(line, ",")
			for _, part := range parts {
				url := strings.TrimSpace(part)
				if url != "" {
					urls = append(urls, url)
				}
			}
		}
		return urls
	default:
		return []string{}
	}
}

// startTime tracks when the server started
var startTime = time.Now()
