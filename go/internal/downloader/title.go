package downloader

import (
	"io"
	"net/http"
	"regexp"
	"strings"
	"time"
)

// fileExtensions that should skip title fetching
var fileExtensions = []string{".zip", ".mp4", ".mp3", ".png", ".jpg", ".jpeg", ".gif", ".pdf", ".exe", ".dmg"}

// FetchPageTitle attempts to fetch the HTML title from a URL
func FetchPageTitle(url string) *string {
	// Skip title fetching for file URLs
	for _, ext := range fileExtensions {
		if strings.HasSuffix(strings.ToLower(url), ext) {
			return nil
		}
	}

	client := &http.Client{
		Timeout: 10 * time.Second,
	}

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil
	}

	// Set a reasonable User-Agent
	req.Header.Set("User-Agent", "DLM/1.0 (Download Manager)")

	resp, err := client.Do(req)
	if err != nil {
		return nil
	}
	defer resp.Body.Close()

	// Only process HTML content
	contentType := resp.Header.Get("Content-Type")
	if !strings.Contains(strings.ToLower(contentType), "text/html") {
		return nil
	}

	// Read response body with size limit
	const maxBodySize = 1024 * 1024 // 1MB limit
	body, err := io.ReadAll(io.LimitReader(resp.Body, maxBodySize))
	if err != nil {
		return nil
	}

	title := extractTitleFromHTML(string(body))
	if title == "" {
		return nil
	}

	return &title
}

// extractTitleFromHTML extracts the title from HTML content using regex
func extractTitleFromHTML(html string) string {
	// Case-insensitive regex to match <title>...</title>
	titleRegex := regexp.MustCompile(`(?i)<title[^>]*>([^<]*)</title>`)
	matches := titleRegex.FindStringSubmatch(html)
	
	if len(matches) < 2 {
		return ""
	}

	title := strings.TrimSpace(matches[1])
	
	// Clean up the title
	title = cleanTitle(title)
	
	return title
}

// cleanTitle removes extra whitespace and decodes basic HTML entities
func cleanTitle(title string) string {
	// Replace common HTML entities
	replacements := map[string]string{
		"&amp;":  "&",
		"&lt;":   "<",
		"&gt;":   ">",
		"&quot;": "\"",
		"&#39;":  "'",
		"&nbsp;": " ",
	}

	for entity, replacement := range replacements {
		title = strings.ReplaceAll(title, entity, replacement)
	}

	// Normalize whitespace
	spaceRegex := regexp.MustCompile(`\s+`)
	title = spaceRegex.ReplaceAllString(title, " ")
	
	return strings.TrimSpace(title)
}
