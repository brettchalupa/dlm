# DLM Browser Extension

A universal browser extension that works in Chrome, Firefox, Edge, and other
modern browsers. Click the extension icon to send the current tab's URL to your
DLM server with a single click.

## Features

- **Universal compatibility**: Single extension works in all major browsers
- **One-click URL submission**: Send current tab URL to DLM server
- **Right-click context menu**: Send any URL to DLM by right-clicking on links
- **Toast notifications**: Success and error messages displayed on the page
- **Configurable API endpoint**: Set your own DLM server URL
- **Visual feedback**: Loading indicator during requests
- **Keyboard shortcuts**: `Ctrl+Shift+Y` / `Cmd+Shift+Y`
- **Cross-browser API polyfill**: Automatic browser detection and compatibility

## Quick Start

### Installation

#### Chrome/Edge/Chromium

1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `dlm/browser_ext/src` folder

#### Firefox

1. Open `about:debugging`
2. Click "This Firefox"
3. Click "Load Temporary Add-on"
4. Select `dlm/browser_ext/src/manifest.json`

### Usage

#### Send current tab URL

1. Navigate to any webpage you want to add to DLM
2. Click the DLM extension icon (or use `Ctrl+Shift+Y` / `Cmd+Shift+Y`)
3. The extension will send the current tab's URL to your DLM server
4. A loading indicator ("...") will briefly appear on the extension icon
5. A success toast will appear confirming the URL was added, or an error toast
   if something went wrong

#### Send any URL via right-click

1. Right-click on any link on a webpage
2. Select "Send to DLM" from the context menu
3. The extension will send that specific URL to your DLM server
4. A loading indicator ("...") will briefly appear on the extension icon
5. A success toast will appear confirming the URL was added, or an error toast
   if something went wrong

### Configuration

1. Right-click the extension icon → "DLM Settings"
2. Enter your DLM API endpoint URL (default: `http://localhost:8001`)
3. Click "Save Settings"
4. Settings automatically sync across browser instances

## Development

### Prerequisites

- [Deno](https://deno.land/) (for TypeScript development)
- Modern browser for testing

### Development Workflow

```bash
# Test the extension
deno task test_ext

# Build distribution packages
deno task build_ext
```

### Building for Distribution

```bash
# Creates distributable packages:
# - dlm-extension.zip (Chrome Web Store / Edge Add-ons)
# - dlm-extension.xpi (Firefox Add-ons)
deno task build_ext
```

## API Integration

### Request Format

```javascript
POST /api/add-urls
Content-Type: application/json

{
  "urls": ["https://example.com/current-tab-url"]
}
```

### Server Requirements

- Accept POST requests to `/api/add-urls`
- Handle JSON payload with `urls` array
- Support CORS for cross-origin requests
- Return appropriate HTTP status codes

## Browser Compatibility

| Browser | Status              | Notes                                       |
| ------- | ------------------- | ------------------------------------------- |
| Chrome  | ✅ Fully supported  | Uses polyfill for Manifest v2 compatibility |
| Firefox | ✅ Fully supported  | Native `browser.*` API support              |
| Edge    | ✅ Fully supported  | Chromium-based, works like Chrome           |
| Safari  | ⚠️ Requires testing | Should work with polyfill                   |
| Opera   | ⚠️ Requires testing | Chromium-based, likely works                |

## Technical Details

- **Manifest Version**: 2 (maximum browser compatibility)
- **API Polyfill**: Automatic detection of `chrome.*` vs `browser.*` APIs
- **Storage**: Uses browser sync storage for settings persistence
- **Permissions**: `activeTab`, `storage`, `contextMenus`
- **Toast Notifications**: Non-intrusive success/error messages with
  auto-dismiss

## Troubleshooting

### Common Issues

1. **Extension not loading**: Check file permissions and manifest syntax
2. **API calls failing**: Verify API endpoint URL in settings
3. **CORS errors**: Ensure server supports cross-origin requests
4. **Settings not saving**: Check storage permissions in manifest

### Debug Mode

1. Open browser developer tools
2. Go to Extensions/Add-ons page
3. Click "Inspect" on the DLM extension
4. Check console for error messages
