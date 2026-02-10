# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with
code in this repository.

## Project Overview

DLM (Download Manager) is a Deno-based server and CLI application for managing
and queuing downloads. It uses SQLite for persistence and supports multiple
download collections with configurable commands (yt-dlp, gallery-dl, wget,
etc.).

## Key Commands

### Development & Testing

```bash
# Run the development server with file watching
deno task dev

# Run production server with daemon
deno task run

# Run daemon separately (downloads every N minutes)
deno task daemon

# Check types, formatting, linting, and run tests
deno task ok

# Run tests only
deno task test

# Test browser extension
deno task test_ext

# Build browser extension for distribution
deno task build_ext
```

**Important:** Always run `deno task ok` after making changes. It must exit with
status 0 and produce zero warnings or errors. Do not ignore or suppress warnings
— fix them before considering work complete.

### Direct Commands

```bash
# Run server
deno run -A main.ts serve

# Run server with daemon (auto-download every 2 mins)
deno run -A main.ts serve --with-daemon

# CLI commands (add URLs, count, download)
deno run -A main.ts add [urls...]
deno run -A main.ts count
deno run -A main.ts dl [limit]

# Daemon download (runs continuously)
deno run -A main.ts dd [minutes] [downloads_per_run]
```

## Architecture

### Core Components

1. **main.ts** - Entry point for server/CLI, handles command routing
2. **download.ts** - Core download management logic with SQLite operations
   - Database: `dlm.db` (SQLite)
   - Table: `downloads` with status tracking (pending/downloading/success/error)
   - Handles title fetching, error tracking, retry logic

3. **web.ts** - HTTP API server (Hono framework, port 8001)
   - Web UI at `/`
   - API endpoints: `/api/add-urls`, `/api/count`, `/api/downloads`, etc.
   - Supports bulk operations (retry-all, delete-all-failed)

4. **daemon.ts & daemon.worker.ts** - Background download processing
   - Runs in Web Worker for non-blocking operation
   - Configurable interval and batch size

5. **cli.ts** - HTTP client for interacting with server API
   - Config stored in `dlm.toml`
   - Supports piping URLs from stdin

6. **config.ts & collection.ts** - Configuration management
   - Config file: `dlm.yml` (YAML format)
   - Collections define: domains, download directory, command template

### Browser Extension (`browser_ext/`)

Universal browser extension for sending URLs to DLM server:

- Manifest V2 for maximum compatibility
- Query selector for bulk link collection
- Right-click context menu integration
- Keyboard shortcuts (Ctrl+Alt+D to add current page)

## Configuration Format

**dlm.yml** - Server configuration:

```yaml
collections:
  yt:
    domains:
      - youtube.com
    dir: /path/to/videos
    command: "yt-dlp %" # % is replaced with URL
```

**dlm.toml** - CLI configuration:

```toml
api_url = "http://localhost:8001"
```

## Database Schema

SQLite database (`dlm.db`) with single `downloads` table:

- id (PRIMARY KEY AUTOINCREMENT)
- collection (TEXT NOT NULL)
- createdAt (TEXT NOT NULL)
- downloadedAt (TEXT)
- priority (TEXT NOT NULL) - "normal" or "high"
- status (TEXT NOT NULL) - "pending", "downloading", "success", "error"
- title (TEXT)
- url (TEXT NOT NULL UNIQUE)
- errorMessage (TEXT)

## Key Implementation Details

- Downloads are processed sequentially to avoid overwhelming the system
- Failed downloads track error messages for debugging
- Title fetching is automatic but skips binary file extensions
- Logs written to `dlm.log` and per-collection `downloads.log`
- Web UI uses server-side rendering with inline styles (no build step)
- Daemon runs in Web Worker to avoid blocking main thread
- Browser extension uses polyfill for chrome/browser API compatibility
