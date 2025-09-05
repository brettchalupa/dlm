package database

import (
	"fmt"

	"github.com/brettchalupa/dlm-go/internal/models"
)

// RetryDownload marks a failed download for retry
func (db *DB) RetryDownload(id int) (bool, error) {
	query := `
	UPDATE downloads 
	SET status = ?, errorMessage = NULL 
	WHERE id = ? AND status = ?`

	result, err := db.conn.Exec(query, models.StatusPending, id, models.StatusError)
	if err != nil {
		return false, fmt.Errorf("failed to retry download: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return false, fmt.Errorf("failed to get rows affected: %w", err)
	}

	return rowsAffected > 0, nil
}

// RetryAllFailedDownloads marks all failed downloads for retry
func (db *DB) RetryAllFailedDownloads() (int64, error) {
	query := `
	UPDATE downloads 
	SET status = ?, errorMessage = NULL 
	WHERE status = ?`

	result, err := db.conn.Exec(query, models.StatusPending, models.StatusError)
	if err != nil {
		return 0, fmt.Errorf("failed to retry all failed downloads: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return 0, fmt.Errorf("failed to get rows affected: %w", err)
	}

	return rowsAffected, nil
}

// DeleteAllFailedDownloads removes all failed downloads from the database
func (db *DB) DeleteAllFailedDownloads() (int64, error) {
	query := "DELETE FROM downloads WHERE status = ?"

	result, err := db.conn.Exec(query, models.StatusError)
	if err != nil {
		return 0, fmt.Errorf("failed to delete all failed downloads: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return 0, fmt.Errorf("failed to get rows affected: %w", err)
	}

	return rowsAffected, nil
}

// ResetDownload resets a downloading download back to pending
func (db *DB) ResetDownload(id int) (bool, error) {
	query := `
	UPDATE downloads 
	SET status = ? 
	WHERE id = ? AND status = ?`

	result, err := db.conn.Exec(query, models.StatusPending, id, models.StatusDownloading)
	if err != nil {
		return false, fmt.Errorf("failed to reset download: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return false, fmt.Errorf("failed to get rows affected: %w", err)
	}

	return rowsAffected > 0, nil
}

// ResetAllDownloadingDownloads resets all downloading downloads back to pending
func (db *DB) ResetAllDownloadingDownloads() (int64, error) {
	query := `
	UPDATE downloads 
	SET status = ? 
	WHERE status = ?`

	result, err := db.conn.Exec(query, models.StatusPending, models.StatusDownloading)
	if err != nil {
		return 0, fmt.Errorf("failed to reset all downloading downloads: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return 0, fmt.Errorf("failed to get rows affected: %w", err)
	}

	return rowsAffected, nil
}

// RedownloadSuccess marks a successful download for redownload
func (db *DB) RedownloadSuccess(id int) (bool, error) {
	query := `
	UPDATE downloads 
	SET status = ?, downloadedAt = NULL 
	WHERE id = ? AND status = ?`

	result, err := db.conn.Exec(query, models.StatusPending, id, models.StatusSuccess)
	if err != nil {
		return false, fmt.Errorf("failed to redownload: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return false, fmt.Errorf("failed to get rows affected: %w", err)
	}

	return rowsAffected > 0, nil
}

// GetDownloadsByStatus retrieves downloads filtered by status
func (db *DB) GetDownloadsByStatus(status models.DownloadStatus, limit int) ([]*models.Download, error) {
	return db.SelectDownloads(limit, status)
}

// GetAllDownloads retrieves all downloads
func (db *DB) GetAllDownloads(limit int) ([]*models.Download, error) {
	return db.SelectDownloads(limit, "")
}
