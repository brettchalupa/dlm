package web

import (
	"fmt"
	"os"
	"strconv"

	"github.com/brettchalupa/dlm-go/internal/database"
	"github.com/brettchalupa/dlm-go/internal/downloader"
	"github.com/brettchalupa/dlm-go/internal/logger"
	"github.com/gin-gonic/gin"
)

// Server represents the web server
type Server struct {
	db        *database.DB
	processor *downloader.Processor
	logger    *logger.Logger
	router    *gin.Engine
}

// New creates a new web server instance
func New(db *database.DB, processor *downloader.Processor, logger *logger.Logger) *Server {
	// Set Gin to release mode to reduce log noise
	gin.SetMode(gin.ReleaseMode)

	router := gin.New()
	
	// Load HTML templates
	router.LoadHTMLGlob("web/templates/*")
	
	// Add custom logging middleware
	router.Use(gin.LoggerWithFormatter(func(param gin.LogFormatterParams) string {
		return fmt.Sprintf("[%s] [%s] %s %s %d %s \"%s\"\n",
			param.TimeStamp.Format("2006-01-02T15:04:05.000Z"),
			param.Method,
			param.Path,
			param.ClientIP,
			param.StatusCode,
			param.Latency,
			param.Request.UserAgent(),
		)
	}))
	
	router.Use(gin.Recovery())

	server := &Server{
		db:        db,
		processor: processor,
		logger:    logger,
		router:    router,
	}

	server.setupRoutes()
	return server
}

// Start starts the web server on the specified port
func (s *Server) Start(port int) error {
	// Check for PORT environment variable
	if envPort := os.Getenv("PORT"); envPort != "" {
		if p, err := strconv.Atoi(envPort); err == nil {
			port = p
		}
	}

	s.logger.Log(fmt.Sprintf("Starting web server on port %d", port))
	return s.router.Run(fmt.Sprintf(":%d", port))
}

// setupRoutes configures all the HTTP routes
func (s *Server) setupRoutes() {
	// Web UI routes
	s.router.GET("/", s.handleIndex)
	s.router.POST("/add-urls", s.handleAddURLsForm)

	// API routes
	api := s.router.Group("/api")
	{
		api.POST("/add-urls", s.handleAddURLsAPI)
		api.GET("/count", s.handleCount)
		api.POST("/download", s.handleDownload)
		api.GET("/downloads", s.handleGetDownloads)
		api.GET("/upcoming", s.handleGetUpcoming)
		api.GET("/recent", s.handleGetRecent)
		api.GET("/config", s.handleGetConfig)
		api.GET("/system", s.handleGetSystem)
		api.GET("/logs", s.handleGetLogs)
		
		// Individual download operations
		api.GET("/download/:id", s.handleGetDownload)
		api.DELETE("/download/:id", s.handleDeleteDownload)
		api.POST("/retry/:id", s.handleRetryDownload)
		api.POST("/reset/:id", s.handleResetDownload)
		api.POST("/redownload/:id", s.handleRedownload)
		
		// Bulk operations
		api.POST("/retry-all-failed", s.handleRetryAllFailed)
		api.DELETE("/delete-all-failed", s.handleDeleteAllFailed)
		api.POST("/reset-all-downloading", s.handleResetAllDownloading)
	}
}
