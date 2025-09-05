package models

import (
	"time"
)

// DownloadStatus represents the current state of a download
type DownloadStatus string

const (
	StatusPending     DownloadStatus = "pending"
	StatusDownloading DownloadStatus = "downloading"
	StatusSuccess     DownloadStatus = "success"
	StatusError       DownloadStatus = "error"
)

// Priority represents the download priority
type Priority string

const (
	PriorityNormal Priority = "normal"
	PriorityHigh   Priority = "high"
)

// Download represents a download record in the database
type Download struct {
	ID           int            `json:"id" db:"id"`
	Collection   string         `json:"collection" db:"collection"`
	CreatedAt    time.Time      `json:"createdAt" db:"createdAt"`
	DownloadedAt *time.Time     `json:"downloadedAt" db:"downloadedAt"`
	Priority     Priority       `json:"priority" db:"priority"`
	Status       DownloadStatus `json:"status" db:"status"`
	Title        *string        `json:"title" db:"title"`
	URL          string         `json:"url" db:"url"`
	ErrorMessage *string        `json:"errorMessage" db:"errorMessage"`
}

// DownloadBase represents the data needed to create a new download
type DownloadBase struct {
	Collection   string         `json:"collection"`
	CreatedAt    time.Time      `json:"createdAt"`
	DownloadedAt *time.Time     `json:"downloadedAt"`
	Priority     Priority       `json:"priority"`
	Status       DownloadStatus `json:"status"`
	Title        *string        `json:"title"`
	URL          string         `json:"url"`
	ErrorMessage *string        `json:"errorMessage"`
}

// StatusCount represents download counts grouped by status
type StatusCount struct {
	Status string `json:"status"`
	Count  int    `json:"count"`
}

// Collection represents a download collection configuration
type Collection struct {
	Name    string   `json:"name" yaml:"name"`
	Domains []string `json:"domains" yaml:"domains"`
	Dir     string   `json:"dir" yaml:"dir"`
	Command string   `json:"command" yaml:"command"`
}

// Config represents the main configuration structure
type Config struct {
	Collections map[string]CollectionBase `yaml:"collections"`
}

// CollectionBase represents a collection without the name field
type CollectionBase struct {
	Domains []string `yaml:"domains"`
	Dir     string   `yaml:"dir"`
	Command string   `yaml:"command"`
}

// APIResponse represents a standard API response
type APIResponse struct {
	Message string      `json:"message,omitempty"`
	Data    interface{} `json:"data,omitempty"`
	Error   string      `json:"error,omitempty"`
}

// AddURLsRequest represents the request body for adding URLs
type AddURLsRequest struct {
	URLs []string `json:"urls"`
}

// DownloadRequest represents the request body for downloading
type DownloadRequest struct {
	Limit int `json:"limit"`
}

// SystemInfo represents system information for the API
type SystemInfo struct {
	Memory  MemoryInfo `json:"memory"`
	Version string     `json:"version"`
	Uptime  string     `json:"uptime"`
}

// MemoryInfo represents memory usage information
type MemoryInfo struct {
	RSS       string `json:"rss"`
	HeapUsed  string `json:"heapUsed"`
	HeapTotal string `json:"heapTotal"`
}
