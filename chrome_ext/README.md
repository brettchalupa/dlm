# dlm Chrome Extension

Add to Chrome as an unpacked extension and click the icon to send a given tab to
dlm.

## Configuration

The extension allows you to configure the API endpoint URL:

1. **Via Options Page**: Right-click the extension icon and select "DLM
   Settings" to open the configuration page
2. **Via Chrome Extensions**: Go to `chrome://extensions/`, find the DLM
   extension, and click "Extension options"

### Default Settings

- **Default API URL**: `https://dlm.lab.bcodes.me/api/add-urls`
- Settings are automatically saved and synced across your Chrome profile

### Usage

1. Navigate to any webpage you want to add to DLM
2. Click the DLM extension icon (or use the keyboard shortcut `Ctrl+Shift+Y` /
   `Cmd+Shift+Y`)
3. The extension will send the current tab's URL to your configured API endpoint
4. A loading indicator ("...") will briefly appear on the extension icon

### Features

- **Configurable API endpoint**: Set your own DLM server URL
- **Keyboard shortcut support**: Quick access via hotkey
- **Visual feedback**: Badge text shows request status
- **Settings sync**: Configuration syncs across Chrome instances
