package config

import (
	"fmt"
	"os"
	"strings"

	"github.com/brettchalupa/dlm-go/internal/models"
	"gopkg.in/yaml.v3"
)

// LoadCollectionsFromConfig loads collections from a YAML configuration file
func LoadCollectionsFromConfig(filename string) ([]models.Collection, error) {
	if filename == "" {
		filename = "dlm.yml"
	}

	data, err := os.ReadFile(filename)
	if err != nil {
		return nil, fmt.Errorf("failed to read config file %s: %w", filename, err)
	}

	var config models.Config
	if err := yaml.Unmarshal(data, &config); err != nil {
		return nil, fmt.Errorf("failed to parse YAML config: %w", err)
	}

	if err := validateConfig(&config); err != nil {
		return nil, fmt.Errorf("invalid configuration: %w", err)
	}

	collections := make([]models.Collection, 0, len(config.Collections))
	for name, base := range config.Collections {
		collection := models.Collection{
			Name:    name,
			Domains: base.Domains,
			Dir:     base.Dir,
			Command: base.Command,
		}
		collections = append(collections, collection)
	}

	return collections, nil
}

// validateConfig performs basic validation on the configuration
func validateConfig(config *models.Config) error {
	if config == nil {
		return fmt.Errorf("config is nil")
	}

	if len(config.Collections) == 0 {
		return fmt.Errorf("no collections defined in configuration")
	}

	for name, collection := range config.Collections {
		if name == "" {
			return fmt.Errorf("collection name cannot be empty")
		}

		if len(collection.Domains) == 0 {
			return fmt.Errorf("collection %s has no domains defined", name)
		}

		if collection.Dir == "" {
			return fmt.Errorf("collection %s has no directory defined", name)
		}

		if collection.Command == "" {
			return fmt.Errorf("collection %s has no command defined", name)
		}

		if !strings.Contains(collection.Command, "%") {
			return fmt.Errorf("collection %s command must contain %% placeholder for URL", name)
		}
	}

	return nil
}

// CollectionForURL finds the appropriate collection for a given URL
func CollectionForURL(collections []models.Collection, url string) *models.Collection {
	for _, collection := range collections {
		for _, domain := range collection.Domains {
			if strings.Contains(url, domain) {
				return &collection
			}
		}
	}
	return nil
}

// CreateDefaultConfig creates a default configuration file
func CreateDefaultConfig(filename string) error {
	if filename == "" {
		filename = "dlm.yml"
	}

	defaultConfig := models.Config{
		Collections: map[string]models.CollectionBase{
			"yt": {
				Domains: []string{"youtube.com", "youtu.be"},
				Dir:     "./downloads/videos",
				Command: "yt-dlp %",
			},
			"gallery": {
				Domains: []string{"reddit.com", "imgur.com"},
				Dir:     "./downloads/images",
				Command: "gallery-dl %",
			},
			"wget": {
				Domains: []string{"example.com"},
				Dir:     "./downloads/files",
				Command: "wget -P . %",
			},
		},
	}

	data, err := yaml.Marshal(&defaultConfig)
	if err != nil {
		return fmt.Errorf("failed to marshal default config: %w", err)
	}

	if err := os.WriteFile(filename, data, 0644); err != nil {
		return fmt.Errorf("failed to write config file: %w", err)
	}

	return nil
}
