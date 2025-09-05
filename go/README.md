# DLM Go

A Go port of the DLM (Download Manager) originally written in Deno/TypeScript.

## Overview

DLM Go is a high-performance download manager that provides:

- **Web API**: HTTP server with REST endpoints for managing downloads
- **CLI Interface**: Command-line tool for adding URLs and managing downloads  
- **Background Daemon**: Automatic download processing at configurable intervals
- **Web UI**: Browser-based interface for managing downloads
- **Collection-based Routing**: Flexible URL-to-command mapping via configuration

## Performance Goals

This Go port aims to:
- Reduce memory overhead compared to the Deno version
- Improve download processing performance
- Provide faster startup times
- Enable easier deployment with static binaries

## Architecture

```
cmd/dlm/           - Main entry point and CLI commands
internal/
  config/          - Configuration loading and management
  database/        - SQLite database operations
  downloader/      - Download processing logic
  web/             - HTTP server and API handlers
  daemon/          - Background processing
  logger/          - Logging infrastructure
  models/          - Data structures
  utils/           - Utility functions
web/               - Static web assets (HTML, CSS, JS)
```

## Building

```bash
cd go
go mod tidy
go build -o dlm ./cmd/dlm
```

## Usage

### Server Mode
```bash
./dlm serve                    # Start web server
./dlm serve --with-daemon      # Start with background daemon
```

### CLI Mode  
```bash
./dlm add URL1 URL2            # Add URLs to download queue
./dlm count                    # Show download counts by status
./dlm dl 5                     # Download next 5 pending items
./dlm daemon 2 3               # Run daemon (check every 2 min, download 3 items)
```

## Configuration

Create `dlm.yml` in the working directory:

```yaml
collections:
  yt:
    domains:
      - youtube.com
      - youtu.be
    dir: /path/to/videos
    command: "yt-dlp %"
  gallery:
    domains:
      - reddit.com
    dir: /path/to/images  
    command: "gallery-dl %"
```

## Compatibility

This Go version maintains full API compatibility with the original Deno version:
- Same HTTP endpoints and response formats
- Same database schema
- Same configuration file format
- Same CLI command interface

Existing browser extensions and clients will work without modification.
