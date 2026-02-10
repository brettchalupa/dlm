# DLM Browser Extension - Quick Usage Guide

## 🚀 Two Ways to Use the Extension

### 1. **Simple Mode** (Default - Most Common)

**Perfect for:** Adding individual pages as you browse

- **Click the extension icon** → Current page saved to DLM
- **Keyboard shortcut:** `Ctrl+Alt+D` (Windows/Linux) or `Cmd+Shift+Y` (Mac)
- **Right-click any link** → "Send to DLM" → Saves that specific URL

### 2. **Advanced Mode** (Query Selector)

**Perfect for:** Bulk collecting multiple links from a page

- **Right-click anywhere on page** → "Find Links with Query Selector"
- **Keyboard shortcut:** `Ctrl+Shift+F` (Windows/Linux) or `Cmd+Shift+F` (Mac)
- Opens full interface for finding and adding multiple URLs at once

## 🎯 Common Use Cases

### Daily Browsing (Simple Mode)

```
1. Reading an article → Click extension icon → Article saved
2. Found interesting link → Right-click → "Send to DLM" → Link saved
3. Quick save → Ctrl+Alt+D → Done!
```

### Research & Bulk Collection (Advanced Mode)

```
1. On a page with many useful links → Ctrl+Shift+F
2. Enter selector like "a[href*='article']" → Preview shows matches
3. Click "Add URLs" → All matching links saved at once
```

## 🔍 Query Selector Examples

When using Advanced Mode, try these selectors:

| Selector              | What it finds                          |
| --------------------- | -------------------------------------- |
| `a`                   | All links on the page                  |
| `a[href*='article']`  | Links containing 'article'             |
| `a[href*='blog']`     | Links containing 'blog'                |
| `a[href*='github']`   | Links containing 'github'              |
| `a[href^='https://']` | External HTTPS links                   |
| `.article-link`       | Links with 'article-link' class        |
| `nav a`               | Links inside navigation                |
| `#content a`          | Links inside element with id 'content' |

## ⚙️ Settings

Right-click extension icon → "DLM Settings" to:

- Set your DLM server URL (default: `http://localhost:8001`)
- Settings sync across all browser instances

## 💡 Pro Tips

- **Preview before adding:** In Advanced Mode, click "Preview" to see what links
  will be collected
- **Quick selectors:** Use the preset buttons for common patterns
- **Visual feedback:** Matched elements are highlighted temporarily during
  preview
- **Toast notifications:** Success/error messages appear on the page
- **Keyboard shortcuts:** Much faster than clicking icons

## 🐛 Troubleshooting

**Extension not working?**

- Check if DLM server is running
- Verify API URL in settings
- Look for error messages in browser console

**Query selector not finding links?**

- Verify CSS selector syntax
- Try simpler selectors first (like just `a`)
- Check if page has finished loading

**No toast notifications?**

- Refresh the page to reload content script
- Check if page allows extension scripts

## 📝 Quick Start Checklist

- [ ] Install extension in browser
- [ ] Set DLM server URL in settings
- [ ] Test simple mode: click icon on any page
- [ ] Test advanced mode: `Ctrl+Shift+F` → try selector `a`
- [ ] Verify URLs appear in your DLM system

---

**Need help?** Check the main README.md for detailed installation and setup
instructions.
