# dlm - Download Manager

A self-hosted download manager for queuing and processing downloads with
[yt-dlp](https://github.com/yt-dlp/yt-dlp),
[gallery-dl](https://github.com/mikf/gallery-dl), wget, and any other
command-line download tool.

dlm provides a web UI, HTTP API, CLI, background daemon, and browser extension
so you can queue up downloads from anywhere and let them process automatically.

## Features

- **Web UI** -- dark-themed dashboard to manage downloads, view logs, and
  monitor status
- **Background daemon** -- automatically processes queued downloads on an
  interval
- **Collections** -- route URLs to different download tools and directories
  based on domain
- **CLI** -- add URLs, check status, and trigger downloads from the terminal
- **Browser extension** -- send URLs to dlm from your browser with a click or
  keyboard shortcut
- **HTTP API** -- integrate with scripts, automation, and other tools
- **SQLite database** -- lightweight persistence, no external database needed
- **Title fetching** -- automatically fetches page titles for queued URLs
- **Error tracking** -- failed downloads show error messages and can be retried
- **Priority support** -- high-priority downloads are processed first

## Requirements

- [Deno](https://deno.com/) 2.x or later
- One or more download tools installed and in your PATH:
  - [yt-dlp](https://github.com/yt-dlp/yt-dlp) for video/audio
  - [gallery-dl](https://github.com/mikf/gallery-dl) for image galleries
  - `wget` or `curl` for general files

## Install

Install Deno if you don't have it:

```
curl -fsSL https://deno.land/install.sh | sh
```

Clone the repo:

```
git clone https://github.com/brettchalupa/dlm.git
cd dlm
```

Copy and edit the config:

```
cp dlm.example.yml dlm.yml
```

Edit `dlm.yml` to define your collections -- which domains map to which download
commands and directories. See `dlm.example.yml` for a full reference.

## Usage

### Start the server

Run the web server with the background download daemon:

```
deno task run
```

This starts the web UI at `http://localhost:8001` and processes queued downloads
every 2 minutes.

For development with auto-reload:

```
deno task dev
```

### Server with separate daemon

Run the server and daemon separately for more control:

```
# Terminal 1: web server only
deno run -A main.ts serve

# Terminal 2: daemon (check every 5 minutes, 3 downloads per run)
deno run -A main.ts dd 5 3
```

### Add downloads

Through the web UI at `http://localhost:8001`, paste URLs into the form.

Through the CLI:

```
deno run -A main.ts add https://youtube.com/watch?v=example

# Multiple URLs
deno run -A main.ts add https://example.com/1 https://example.com/2

# From stdin (pipe from other tools)
echo "https://example.com/video" | deno run -A main.ts add -
```

### CLI commands

```
deno run -A main.ts              # show help
deno run -A main.ts serve        # start web server
deno run -A main.ts serve --with-daemon  # server + daemon
deno run -A main.ts add [urls]   # add URLs to queue
deno run -A main.ts count        # show download counts by status
deno run -A main.ts dl           # download all pending
deno run -A main.ts dl 5         # download 5 pending
deno run -A main.ts dd           # run daemon (default: every 5 min)
deno run -A main.ts dd 10 5      # daemon: every 10 min, 5 per run
deno run -A main.ts init         # initialize the database
```

### Remote CLI client

The CLI client (`cli.ts`) communicates with a running dlm server over HTTP,
useful for managing downloads from a different machine:

```
# Initialize with your server URL
deno run -A cli.ts init
# Enter: http://your-server:8001

# Then use commands
deno run -A cli.ts count
deno run -A cli.ts add https://example.com/video
deno run -A cli.ts ls
deno run -A cli.ts dl 5
deno run -A cli.ts retry 42
deno run -A cli.ts retry-all-failed
deno run -A cli.ts delete-all-failed
deno run -A cli.ts reset 42
deno run -A cli.ts reset-all-downloading
```

### Environment variables

- `PORT` -- override the default server port (default: `8001`)

## Configuration

dlm uses a YAML config file (`dlm.yml`) to define download collections.

Each collection specifies:

- **domains** -- URL patterns to match against
- **dir** -- directory to save downloads to
- **command** -- shell command to run, where `%` is replaced with the URL

```yaml
collections:
  yt:
    domains:
      - youtube.com
      - youtu.be
    dir: ~/Videos/YouTube
    command: "yt-dlp %"

  images:
    domains:
      - imgur.com
    dir: ~/Pictures
    command: "gallery-dl %"

  files:
    domains:
      - example.com
    dir: ~/Downloads
    command: "wget -P . %"
```

See [dlm.example.yml](dlm.example.yml) for more examples.

## HTTP API

All endpoints are served from the web server (default `http://localhost:8001`).

| Method | Endpoint                     | Description                                   |
| ------ | ---------------------------- | --------------------------------------------- |
| GET    | `/`                          | Web UI                                        |
| POST   | `/api/add-urls`              | Add URLs (JSON body: `{"urls": [...]}`)       |
| GET    | `/api/count`                 | Download counts by status                     |
| GET    | `/api/downloads`             | List all downloads                            |
| GET    | `/api/upcoming`              | Next 10 pending downloads                     |
| GET    | `/api/recent`                | 10 most recent downloads                      |
| GET    | `/api/download/:id`          | Get a single download                         |
| DELETE | `/api/download/:id`          | Delete a download                             |
| GET    | `/api/status?url=...`        | Check status of a URL                         |
| POST   | `/api/download`              | Trigger downloads (JSON body: `{"limit": 5}`) |
| POST   | `/api/retry/:id`             | Retry a failed download                       |
| POST   | `/api/retry-all-failed`      | Retry all failed downloads                    |
| DELETE | `/api/delete-all-failed`     | Delete all failed downloads                   |
| POST   | `/api/reset/:id`             | Reset a downloading item to pending           |
| POST   | `/api/reset-all-downloading` | Reset all downloading to pending              |
| POST   | `/api/redownload/:id`        | Re-download a completed item                  |
| GET    | `/api/config`                | View current configuration                    |
| GET    | `/api/system`                | System info (memory, uptime, Deno version)    |
| GET    | `/api/logs`                  | Recent log entries                            |

## Browser Extension

The browser extension lets you send URLs to dlm directly from your browser. See
[browser_ext/README.md](browser_ext/README.md) for installation and usage.

Features:

- Send the current page URL with a click or keyboard shortcut (Ctrl+Alt+D)
- Right-click context menu to send any link
- Bulk-collect links from a page using CSS selectors
- Configurable server URL

## Desktop Apps (Experimental)

Native desktop clients are in early development:

- **desktop_gtk/** -- GTK4/libadwaita client for Linux (Rust)
- **desktop_dart/** -- Flutter client (cross-platform, incomplete)

These are experimental and not yet ready for general use.

## Development

Check types, formatting, and linting:

```
deno task ok
```

Build the browser extension:

```
deno task build_ext
```

## License

This is free and unencumbered software released into the public domain. See
[LICENSE](LICENSE) for details.
