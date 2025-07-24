# DLM Web Interface

The DLM web interface provides a modern, dark-themed dashboard for managing
downloads with real-time updates and comprehensive monitoring capabilities.

## Features

### 🎨 Modern Dark Theme

- GitHub-inspired dark theme with consistent styling
- Responsive design that works on desktop and mobile
- Clean, professional interface with proper typography

### 📊 Real-Time Statistics

- Live download counts by status (pending, downloading, success, error)
- System information (memory usage, Deno version, uptime)
- Auto-refresh every 3 seconds with visual indicators

### 📝 Download Management

- Add URLs via web form or API
- Bulk URL input (comma-separated or line-separated)
- Start downloads with configurable limits
- View recent downloads with status indicators

### ⚙️ Configuration Display

- Live configuration viewing
- Collection details (directories, commands, domains)
- API-driven configuration updates

### 🔍 Enhanced Logging

- Real-time log viewing with auto-refresh
- Log filtering by type (All, Errors, Warnings, Info)
- Search functionality for log entries
- Color-coded log levels for better readability
- Clear logs functionality
- API request logs automatically filtered from web UI display

### 🚨 Error Monitoring & Management

- Dedicated error section showing failed downloads with detailed error messages
- Real-time error tracking and display
- Error highlighting in logs
- Individual download retry and delete functionality
- Bulk operations for all failed downloads
- Persistent error message storage in database

### 🔔 Notifications

- Toast notifications for user actions
- Success/error feedback for operations
- Non-intrusive notification system

### ⌨️ Keyboard Shortcuts

- `Ctrl+R` / `Cmd+R` - Refresh data
- `Ctrl+D` / `Cmd+D` - Start downloads

### 🔄 Smart Auto-Refresh

- Pauses when tab is not visible to save resources
- Resumes automatically when tab becomes active
- Configurable refresh intervals

## API Endpoints

The web interface utilizes the following API endpoints:

- `GET /api/count` - Download statistics
- `GET /api/downloads` - List all downloads
- `GET /api/config` - Current configuration
- `GET /api/system` - System information
- `GET /api/logs` - Recent log entries (filtered to exclude API requests)
- `POST /api/add-urls` - Add new URLs
- `POST /api/download` - Start downloads
- `POST /api/retry/:id` - Retry a specific failed download
- `POST /api/retry-all-failed` - Retry all failed downloads
- `DELETE /api/delete-all-failed` - Delete all failed downloads
- `GET /api/download/:id` - Get details for a specific download
- `DELETE /api/download/:id` - Delete a specific download

## Usage

1. Start the web server:
   ```bash
   deno run --allow-all web.ts
   ```

2. Open your browser to `http://localhost:8001`

3. The interface will automatically:
   - Load current statistics
   - Display recent downloads
   - Show configuration details
   - Stream live logs
   - Refresh data every 3 seconds

## Interface Sections

### Header

- Application title
- Live status indicator
- Last update timestamp

### Statistics Grid

- Download counts by status
- System memory usage
- Deno version information
- Uptime tracking

### Add Downloads Form

- URL input textarea
- Bulk URL processing
- Form validation
- Success/error feedback

### Downloads List

- Recent downloads with titles and URLs
- Status indicators with color coding
- Scrollable list with hover effects
- Per-download action buttons (retry/delete) on hover
- Error messages displayed inline for failed downloads

### Configuration Panel

- Collection names and settings
- Directory paths and commands
- Domain mappings

### Error Section

- Failed downloads with detailed error messages
- Individual retry and delete buttons for each failed download
- Bulk operations (Retry All Failed, Delete All Failed)
- Error highlighting with expandable error details
- Automatic show/hide based on error presence

### Logs Section

- Real-time log streaming
- Search and filter capabilities
- Color-coded log levels
- Clear functionality

## Customization

The interface uses CSS custom properties (variables) for easy theming:

```css
:root {
  --bg-primary: #0d1117;
  --bg-secondary: #161b22;
  --bg-tertiary: #21262d;
  --border-primary: #30363d;
  --text-primary: #f0f6fc;
  --text-secondary: #8b949e;
  --accent-blue: #58a6ff;
  --accent-green: #3fb950;
  --accent-red: #f85149;
  --accent-yellow: #d29922;
}
```

## Browser Support

- Modern browsers with ES6+ support
- Chrome/Chromium 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## CLI Commands

The enhanced CLI now supports error management:

```bash
# Retry a specific failed download
deno run --allow-all cli.ts retry 123

# Retry all failed downloads
deno run --allow-all cli.ts retry-all-failed

# Delete all failed downloads (with confirmation)
deno run --allow-all cli.ts delete-all-failed

# List all downloads
deno run --allow-all cli.ts ls

# Show download statistics
deno run --allow-all cli.ts count
```

## Database Schema Updates

The downloads table now includes error tracking:

- `errorMessage TEXT` - Stores detailed error information from failed downloads
- Automatic schema migration adds the column if it doesn't exist
- Error messages are captured from command stderr/stdout during download
  failures

## Performance

- Minimal JavaScript bundle size
- Efficient DOM updates
- Smart refresh logic
- Responsive design patterns
- Optimized for low-latency updates
- Filtered API request logs reduce noise in web interface
