package downloader

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"github.com/brettchalupa/dlm-go/internal/config"
	"github.com/brettchalupa/dlm-go/internal/database"
	"github.com/brettchalupa/dlm-go/internal/logger"
	"github.com/brettchalupa/dlm-go/internal/models"
)

// Processor handles download operations
type Processor struct {
	db     *database.DB
	logger *logger.Logger
}

// New creates a new download processor
func New(db *database.DB, logger *logger.Logger) *Processor {
	return &Processor{
		db:     db,
		logger: logger,
	}
}

// AddDownload adds a new download to the database with title fetching
func (p *Processor) AddDownload(url, collectionName string) error {
	// Fetch title asynchronously to avoid blocking
	title := FetchPageTitle(url)

	download := &models.DownloadBase{
		URL:          url,
		Collection:   collectionName,
		CreatedAt:    time.Now(),
		Title:        title,
		DownloadedAt: nil,
		Priority:     models.PriorityNormal,
		Status:       models.StatusPending,
		ErrorMessage: nil,
	}

	err := p.db.InsertDownload(download)
	if err != nil {
		// Check if it's a unique constraint error
		if strings.Contains(err.Error(), "UNIQUE constraint failed") {
			titleStr := "Unknown"
			if title != nil {
				titleStr = *title
			}
			p.logger.Log(fmt.Sprintf("%s already present", titleStr))
			return nil
		}
		return fmt.Errorf("failed to insert download: %w", err)
	}

	titleStr := url
	if title != nil {
		titleStr = *title
	}
	p.logger.Log(fmt.Sprintf("added %s to db", titleStr))

	return nil
}

// AddURLs processes multiple URLs and adds them to the database
func (p *Processor) AddURLs(urls []string) error {
	collections, err := config.LoadCollectionsFromConfig("")
	if err != nil {
		return fmt.Errorf("failed to load collections: %w", err)
	}

	// Filter out empty URLs
	filteredURLs := make([]string, 0, len(urls))
	for _, url := range urls {
		if strings.TrimSpace(url) != "" {
			filteredURLs = append(filteredURLs, strings.TrimSpace(url))
		}
	}

	for i, url := range filteredURLs {
		collection := config.CollectionForURL(collections, url)
		if collection == nil {
			p.logger.Error(fmt.Sprintf("No collection found for URL: %s", url))
			continue
		}

		if err := p.AddDownload(url, collection.Name); err != nil {
			p.logger.Error(fmt.Sprintf("Failed to add download %s: %v", url, err))
			continue
		}

		// Rate limiting for bulk operations
		if len(filteredURLs) > 1 && i < len(filteredURLs)-1 {
			time.Sleep(500 * time.Millisecond)
		}
	}

	return nil
}

// ProcessDownload executes a single download
func (p *Processor) ProcessDownload(download *models.Download) error {
	collections, err := config.LoadCollectionsFromConfig("")
	if err != nil {
		return fmt.Errorf("failed to load collections: %w", err)
	}

	var collection *models.Collection
	for _, c := range collections {
		if c.Name == download.Collection {
			collection = &c
			break
		}
	}

	if collection == nil {
		return fmt.Errorf("collection %s not found in config", download.Collection)
	}

	// Create download directory
	if err := os.MkdirAll(collection.Dir, 0755); err != nil {
		return fmt.Errorf("failed to create directory %s: %w", collection.Dir, err)
	}

	// Update status to downloading
	download.Status = models.StatusDownloading
	if err := p.db.UpdateDownload(download); err != nil {
		return fmt.Errorf("failed to update download status: %w", err)
	}

	// Prepare command
	command := strings.ReplaceAll(collection.Command, "%", download.URL)
	commandParts := strings.Fields(command)
	if len(commandParts) == 0 {
		return fmt.Errorf("empty command")
	}

	// Execute command
	cmd := exec.Command(commandParts[0], commandParts[1:]...)
	cmd.Dir = collection.Dir

	output, err := cmd.CombinedOutput()

	// Log the download attempt
	logFile := filepath.Join(collection.Dir, "downloads.log")
	logEntry := fmt.Sprintf(
		"\n=== Download %d - %s ===\n"+
			"URL: %s\n"+
			"Command: %s\n"+
			"--- OUTPUT ---\n%s\n"+
			"--- END ---\n\n",
		download.ID,
		time.Now().Format(time.RFC3339),
		download.URL,
		command,
		string(output),
	)

	if err := logger.WriteToFile(logFile, logEntry); err != nil {
		p.logger.Error(fmt.Sprintf("Failed to write to log file: %v", err))
	}

	// Update download status based on command result
	if err != nil {
		download.Status = models.StatusError
		errorMessage := string(output)
		if errorMessage == "" {
			errorMessage = err.Error()
		}
		download.ErrorMessage = &errorMessage

		p.logger.Error(fmt.Sprintf("error downloading url: %d %s: %s", download.ID, download.URL, errorMessage))
	} else {
		download.Status = models.StatusSuccess
		now := time.Now()
		download.DownloadedAt = &now
		download.ErrorMessage = nil

		titleStr := download.URL
		if download.Title != nil {
			titleStr = *download.Title
		}
		p.logger.Log(fmt.Sprintf("[%s] successfully downloaded: %s", time.Now().Format(time.RFC3339), titleStr))
	}

	// Update download in database
	if err := p.db.UpdateDownload(download); err != nil {
		return fmt.Errorf("failed to update download: %w", err)
	}

	return nil
}

// ProcessDownloads processes multiple downloads sequentially
func (p *Processor) ProcessDownloads(downloads []*models.Download) error {
	for _, download := range downloads {
		if err := p.ProcessDownload(download); err != nil {
			p.logger.Error(fmt.Sprintf("Failed to process download %d: %v", download.ID, err))
			// Continue with other downloads even if one fails
		}
	}
	return nil
}
