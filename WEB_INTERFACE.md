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

### 🚨 Error Monitoring

- Dedicated error section showing failed downloads
- Real-time error tracking and display
- Error highlighting in logs

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
- `GET /api/logs` - Recent log entries
- `POST /api/add-urls` - Add new URLs
- `POST /api/download` - Start downloads

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

### Configuration Panel

- Collection names and settings
- Directory paths and commands
- Domain mappings

### Error Section

- Failed downloads with details
- Error highlighting
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

## Performance

- Minimal JavaScript bundle size
- Efficient DOM updates
- Smart refresh logic
- Responsive design patterns
- Optimized for low-latency updates
