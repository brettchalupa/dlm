package daemon

import (
	"fmt"
	"time"

	"github.com/brettchalupa/dlm-go/internal/database"
	"github.com/brettchalupa/dlm-go/internal/downloader"
	"github.com/brettchalupa/dlm-go/internal/logger"
	"github.com/brettchalupa/dlm-go/internal/models"
)

// Daemon handles background download processing
type Daemon struct {
	db        *database.DB
	processor *downloader.Processor
	logger    *logger.Logger
	stopChan  chan bool
	running   bool
}

// New creates a new daemon instance
func New(db *database.DB, processor *downloader.Processor, logger *logger.Logger) *Daemon {
	return &Daemon{
		db:        db,
		processor: processor,
		logger:    logger,
		stopChan:  make(chan bool),
		running:   false,
	}
}

// Start begins the daemon processing loop
func (d *Daemon) Start(intervalMinutes, downloadsPerRun int) {
	if d.running {
		d.logger.Log("Daemon is already running")
		return
	}

	d.running = true
	d.logger.Log(fmt.Sprintf("Daemon started: checking every %d minutes, processing %d downloads per run", intervalMinutes, downloadsPerRun))

	ticker := time.NewTicker(time.Duration(intervalMinutes) * time.Minute)
	defer ticker.Stop()

	// Process downloads immediately on start
	d.processDownloads(downloadsPerRun)

	for {
		select {
		case <-ticker.C:
			d.processDownloads(downloadsPerRun)
		case <-d.stopChan:
			d.logger.Log("Daemon stopped")
			d.running = false
			return
		}
	}
}

// Stop gracefully stops the daemon
func (d *Daemon) Stop() {
	if !d.running {
		return
	}

	d.logger.Log("Stopping daemon...")
	d.stopChan <- true
}

// IsRunning returns whether the daemon is currently running
func (d *Daemon) IsRunning() bool {
	return d.running
}

// processDownloads fetches and processes pending downloads
func (d *Daemon) processDownloads(limit int) {
	d.logger.Log(fmt.Sprintf("Daemon: checking for pending downloads (limit: %d)", limit))

	// Get pending downloads
	downloads, err := d.db.GetDownloadsByStatus(models.StatusPending, limit)
	if err != nil {
		d.logger.Error(fmt.Sprintf("Daemon: failed to get pending downloads: %v", err))
		return
	}

	if len(downloads) == 0 {
		d.logger.Log("Daemon: no pending downloads found")
		return
	}

	d.logger.Log(fmt.Sprintf("Daemon: processing %d downloads", len(downloads)))

	// Process downloads
	for _, download := range downloads {
		if !d.running {
			d.logger.Log("Daemon: stopping processing due to shutdown")
			break
		}

		d.logger.Log(fmt.Sprintf("Daemon: processing download %d: %s", download.ID, download.URL))
		
		if err := d.processor.ProcessDownload(download); err != nil {
			d.logger.Error(fmt.Sprintf("Daemon: failed to process download %d: %v", download.ID, err))
		}
	}

	d.logger.Log(fmt.Sprintf("Daemon: finished processing %d downloads", len(downloads)))
}
