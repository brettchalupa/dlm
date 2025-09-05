package database

import (
	"database/sql"
	"fmt"
	"path/filepath"
	"time"

	"github.com/brettchalupa/dlm-go/internal/models"
	_ "github.com/mattn/go-sqlite3"
)

// DB wraps the SQLite database connection
type DB struct {
	conn *sql.DB
}

// New creates a new database connection
func New(dbPath string) (*DB, error) {
	if dbPath == "" {
		dbPath = filepath.Join(".", "dlm.db")
	}

	conn, err := sql.Open("sqlite3", dbPath)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	db := &DB{conn: conn}

	// Initialize the database schema
	if err := db.initSchema(); err != nil {
		conn.Close()
		return nil, fmt.Errorf("failed to initialize schema: %w", err)
	}

	return db, nil
}

// Close closes the database connection
func (db *DB) Close() error {
	if db.conn != nil {
		return db.conn.Close()
	}
	return nil
}

// initSchema creates the downloads table if it doesn't exist
func (db *DB) initSchema() error {
	query := `
	CREATE TABLE IF NOT EXISTS downloads (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		collection TEXT NOT NULL,
		createdAt TEXT NOT NULL,
		downloadedAt TEXT,
		priority TEXT NOT NULL,
		status TEXT NOT NULL,
		title TEXT,
		url TEXT NOT NULL UNIQUE,
		errorMessage TEXT
	)`

	_, err := db.conn.Exec(query)
	if err != nil {
		return fmt.Errorf("failed to create downloads table: %w", err)
	}

	// Add errorMessage column if it doesn't exist (migration)
	_, err = db.conn.Exec("ALTER TABLE downloads ADD COLUMN errorMessage TEXT")
	if err != nil {
		// Column might already exist, ignore the error
		// In a production system, you'd want proper migration handling
	}

	return nil
}

// InsertDownload adds a new download to the database
func (db *DB) InsertDownload(download *models.DownloadBase) error {
	query := `
	INSERT INTO downloads 
	(collection, createdAt, downloadedAt, priority, status, title, url, errorMessage)
	VALUES (?, ?, ?, ?, ?, ?, ?, ?)`

	var downloadedAt *string
	if download.DownloadedAt != nil {
		ts := download.DownloadedAt.Format(time.RFC3339)
		downloadedAt = &ts
	}

	_, err := db.conn.Exec(query,
		download.Collection,
		download.CreatedAt.Format(time.RFC3339),
		downloadedAt,
		download.Priority,
		download.Status,
		download.Title,
		download.URL,
		download.ErrorMessage,
	)

	if err != nil {
		return fmt.Errorf("failed to insert download: %w", err)
	}

	return nil
}

// UpdateDownload updates an existing download in the database
func (db *DB) UpdateDownload(download *models.Download) error {
	query := `
	UPDATE downloads SET
		collection = ?,
		createdAt = ?,
		downloadedAt = ?,
		priority = ?,
		status = ?,
		title = ?,
		url = ?,
		errorMessage = ?
	WHERE id = ?`

	var downloadedAt *string
	if download.DownloadedAt != nil {
		ts := download.DownloadedAt.Format(time.RFC3339)
		downloadedAt = &ts
	}

	_, err := db.conn.Exec(query,
		download.Collection,
		download.CreatedAt.Format(time.RFC3339),
		downloadedAt,
		download.Priority,
		download.Status,
		download.Title,
		download.URL,
		download.ErrorMessage,
		download.ID,
	)

	if err != nil {
		return fmt.Errorf("failed to update download: %w", err)
	}

	return nil
}

// GetDownload retrieves a download by ID
func (db *DB) GetDownload(id int) (*models.Download, error) {
	query := `
	SELECT id, collection, createdAt, downloadedAt, priority, status, title, url, errorMessage
	FROM downloads
	WHERE id = ?`

	row := db.conn.QueryRow(query, id)

	var download models.Download
	var createdAtStr string
	var downloadedAtStr *string

	err := row.Scan(
		&download.ID,
		&download.Collection,
		&createdAtStr,
		&downloadedAtStr,
		&download.Priority,
		&download.Status,
		&download.Title,
		&download.URL,
		&download.ErrorMessage,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to get download: %w", err)
	}

	// Parse timestamps
	download.CreatedAt, err = time.Parse(time.RFC3339, createdAtStr)
	if err != nil {
		return nil, fmt.Errorf("failed to parse createdAt: %w", err)
	}

	if downloadedAtStr != nil {
		downloadedAt, err := time.Parse(time.RFC3339, *downloadedAtStr)
		if err != nil {
			return nil, fmt.Errorf("failed to parse downloadedAt: %w", err)
		}
		download.DownloadedAt = &downloadedAt
	}

	return &download, nil
}

// SelectDownloads retrieves downloads with optional filtering and limiting
func (db *DB) SelectDownloads(limit int, status models.DownloadStatus) ([]*models.Download, error) {
	query := `
	SELECT id, collection, createdAt, downloadedAt, priority, status, title, url, errorMessage
	FROM downloads`

	args := []interface{}{}

	if status != "" {
		query += " WHERE status = ?"
		args = append(args, status)
	}

	query += " ORDER BY priority DESC, id DESC"

	if limit > 0 {
		query += " LIMIT ?"
		args = append(args, limit)
	}

	rows, err := db.conn.Query(query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to select downloads: %w", err)
	}
	defer rows.Close()

	var downloads []*models.Download

	for rows.Next() {
		var download models.Download
		var createdAtStr string
		var downloadedAtStr *string

		err := rows.Scan(
			&download.ID,
			&download.Collection,
			&createdAtStr,
			&downloadedAtStr,
			&download.Priority,
			&download.Status,
			&download.Title,
			&download.URL,
			&download.ErrorMessage,
		)

		if err != nil {
			return nil, fmt.Errorf("failed to scan download row: %w", err)
		}

		// Parse timestamps
		download.CreatedAt, err = time.Parse(time.RFC3339, createdAtStr)
		if err != nil {
			return nil, fmt.Errorf("failed to parse createdAt: %w", err)
		}

		if downloadedAtStr != nil {
			downloadedAt, err := time.Parse(time.RFC3339, *downloadedAtStr)
			if err != nil {
				return nil, fmt.Errorf("failed to parse downloadedAt: %w", err)
			}
			download.DownloadedAt = &downloadedAt
		}

		downloads = append(downloads, &download)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating download rows: %w", err)
	}

	return downloads, nil
}

// CountDownloads returns download counts grouped by status
func (db *DB) CountDownloads() ([]*models.StatusCount, error) {
	query := "SELECT status, COUNT(*) FROM downloads GROUP BY status"

	rows, err := db.conn.Query(query)
	if err != nil {
		return nil, fmt.Errorf("failed to count downloads: %w", err)
	}
	defer rows.Close()

	var counts []*models.StatusCount

	for rows.Next() {
		var count models.StatusCount
		err := rows.Scan(&count.Status, &count.Count)
		if err != nil {
			return nil, fmt.Errorf("failed to scan count row: %w", err)
		}
		counts = append(counts, &count)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating count rows: %w", err)
	}

	return counts, nil
}

// DeleteDownload removes a download from the database
func (db *DB) DeleteDownload(id int) error {
	query := "DELETE FROM downloads WHERE id = ?"
	_, err := db.conn.Exec(query, id)
	if err != nil {
		return fmt.Errorf("failed to delete download: %w", err)
	}
	return nil
}
