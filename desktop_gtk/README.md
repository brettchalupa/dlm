# DLM Desktop

A GTK4 + libadwaita desktop client for the [DLM](../) download manager. Connects
to the DLM HTTP API server to provide a native desktop experience for managing
downloads.

## Features

- **Downloads view** with status filtering (All / Pending / Downloading /
  Success / Errors) and per-item actions (retry, delete, redownload, reset)
- **Error management** with bulk retry/delete operations
- **Log viewer** with search, level filtering, and newest-first ordering
- **Configuration display** showing collections, directories, commands, and
  domain mappings
- **Open folder** button on each download to jump to the collection directory
- **Auto-refresh** every 3 seconds
- **Keyboard shortcuts** (Ctrl+R refresh, Ctrl+D start downloads, Ctrl+N add
  URLs, ? help)
- **Toast notifications** for all operations
- **Settings** for configuring the API server URL

## Requirements

- Rust (latest stable)
- GTK4 and libadwaita development libraries

### Fedora

```bash
sudo dnf install gtk4-devel libadwaita-devel gcc
```

### Ubuntu/Debian

```bash
sudo apt install libgtk-4-dev libadwaita-1-dev build-essential
```

### Arch

```bash
sudo pacman -S gtk4 libadwaita base-devel
```

## Usage

The DLM server must be running for the desktop client to work:

```bash
# Start the DLM server (from the parent directory)
deno task run

# Run the desktop client
just run

# Or directly
cargo run
```

The client connects to `http://localhost:8001` by default. Change this in
Settings (gear icon in the header bar).

## Commands

```bash
just run       # Run in debug mode
just build     # Build release binary
just ok        # Format, lint, and test
just install   # Install to ~/.local/bin with desktop entry
just uninstall # Remove installation
```

## Project Structure

```
src/
├── main.rs      # UI building, signals, keyboard handling
├── types.rs     # Domain models (Download, AppState, Widgets)
├── config.rs    # Settings persistence (~/.config/dlm-gtk/)
└── api.rs       # HTTP API client (ureq)
```
