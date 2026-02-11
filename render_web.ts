import { html, raw } from "@hono/hono/html";
import { HtmlEscapedString } from "@hono/hono/utils/html";

export function renderWeb(
  counts: string,
  downloadsList: string,
  logs: string,
  errorSectionDisplay: string,
  errorList: string,
): HtmlEscapedString | Promise<HtmlEscapedString> {
  return html`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <title>DLM - Download Manager</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta charset="UTF-8" />
        <style>
        :root {
          --bg-primary: #0d1117;
          --bg-secondary: #161b22;
          --bg-tertiary: #21262d;
          --border-primary: #30363d;
          --text-primary: #f0f6fc;
          --text-secondary: #8b949e;
          --text-muted: #656d76;
          --accent-blue: #58a6ff;
          --accent-green: #3fb950;
          --accent-red: #f85149;
          --accent-yellow: #d29922;
          --accent-purple: #a5a5ff;
        }

        * {
          box-sizing: border-box;
        }

        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif;
          background-color: var(--bg-primary);
          color: var(--text-primary);
          margin: 0;
          padding: 20px;
          line-height: 1.5;
        }

        .container {
          max-width: 1400px;
          margin: 0 auto;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 1px solid var(--border-primary);
        }

        .header h1 {
          margin: 0;
          color: var(--accent-blue);
          font-size: 2.5rem;
          font-weight: 600;
        }

        .status-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: var(--bg-secondary);
          border: 1px solid var(--border-primary);
          border-radius: 6px;
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--accent-green);
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 30px;
        }

        @media (max-width: 768px) {
          .grid {
            grid-template-columns: 1fr;
          }
        }

        .card {
          background: var(--bg-secondary);
          border: 1px solid var(--border-primary);
          border-radius: 8px;
          padding: 20px;
        }

        .card h2 {
          margin: 0 0 16px 0;
          font-size: 1.25rem;
          font-weight: 600;
          color: var(--text-primary);
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 12px;
        }

        .stat-item {
          background: var(--bg-tertiary);
          padding: 12px;
          border-radius: 6px;
          text-align: center;
          border: 1px solid var(--border-primary);
        }

        .stat-number {
          display: block;
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 4px;
        }

        .stat-label {
          font-size: 0.875rem;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .pending { color: var(--accent-yellow); }
        .downloading { color: var(--accent-blue); }
        .success { color: var(--accent-green); }
        .error { color: var(--accent-red); }

        .form-section {
          background: var(--bg-secondary);
          border: 1px solid var(--border-primary);
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 30px;
        }

        .form-section h2 {
          margin: 0 0 16px 0;
          font-size: 1.25rem;
          font-weight: 600;
        }

        .form-group {
          margin-bottom: 16px;
        }

        label {
          display: block;
          margin-bottom: 8px;
          font-weight: 500;
          color: var(--text-secondary);
        }

        textarea, input {
          width: 100%;
          padding: 12px;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-primary);
          border-radius: 6px;
          color: var(--text-primary);
          font-family: inherit;
          font-size: 14px;
          transition: border-color 0.2s ease;
        }

        textarea:focus, input:focus {
          outline: none;
          border-color: var(--accent-blue);
        }

        button {
          background: var(--accent-blue);
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 6px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 14px;
        }

        button:hover {
          background: #4493e0;
          transform: translateY(-1px);
        }

        button:active {
          transform: translateY(0);
        }

        .button-group {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }

        .download-list {
          background: var(--bg-secondary);
          border: 1px solid var(--border-primary);
          border-radius: 8px;
          margin-bottom: 30px;
        }

        .download-list h2 {
          display: inline-block;
          margin: 0;
          padding: 20px 20px 0 20px;
          font-size: 1.25rem;
          font-weight: 600;
        }

        .download-items {
          max-height: 400px;
          overflow-y: auto;
          padding: 20px;
        }

        .download-item {
          background: var(--bg-tertiary);
          border: 1px solid var(--border-primary);
          border-radius: 6px;
          padding: 12px;
          margin-bottom: 8px;
          font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
          font-size: 0.875rem;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          transition: background-color 0.2s ease;
        }

        .download-item:hover {
          background: var(--bg-primary);
        }

        .download-info {
          flex: 1;
          min-width: 0;
        }

        .download-title {
          font-weight: 500;
          margin-bottom: 4px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .download-url {
          color: var(--text-secondary);
          font-size: 0.75rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-bottom: 4px;
        }

        .download-collection {
          color: var(--text-secondary);
          font-size: 0.75rem;
          font-style: italic;
        }

        .download-status {
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .logs-section {
          background: var(--bg-secondary);
          border: 1px solid var(--border-primary);
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 30px;
        }

        .logs-section h2 {
          margin: 0 0 16px 0;
          font-size: 1.25rem;
          font-weight: 600;
        }

        .logs-container {
          background: var(--bg-primary);
          border: 1px solid var(--border-primary);
          border-radius: 6px;
          padding: 16px;
          max-height: 400px;
          overflow-y: auto;
          font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
          font-size: 0.875rem;
          line-height: 1.4;
          color: var(--text-secondary);
        }

        .logs-search {
          margin-bottom: 12px;
        }

        .logs-search input {
          width: 100%;
          padding: 8px 12px;
          background: var(--bg-primary);
          border: 1px solid var(--border-primary);
          border-radius: 4px;
          color: var(--text-primary);
          font-size: 0.875rem;
          font-family: inherit;
        }

        .log-line {
          margin: 4px 0;
          padding: 2px 0;
          word-wrap: break-word;
        }

        .log-line.error {
          color: var(--accent-red);
          background: rgba(248, 81, 73, 0.1);
          padding: 4px 8px;
          border-radius: 4px;
          margin: 4px 0;
        }

        .log-line.warning {
          color: var(--accent-yellow);
        }

        .log-line.info {
          color: var(--accent-blue);
        }

        .log-line.hidden {
          display: none;
        }

        .logs-controls {
          display: flex;
          gap: 8px;
          margin-bottom: 12px;
          flex-wrap: wrap;
        }

        .logs-controls button {
          padding: 4px 8px;
          font-size: 0.75rem;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-primary);
          color: var(--text-secondary);
        }

        .logs-controls button.active {
          background: var(--accent-blue);
          color: white;
          border-color: var(--accent-blue);
        }

        .icon {
          width: 16px;
          height: 16px;
          fill: currentColor;
        }

        .refresh-indicator {
          position: fixed;
          top: 20px;
          right: 20px;
          background: var(--bg-secondary);
          border: 1px solid var(--border-primary);
          border-radius: 20px;
          padding: 8px 16px;
          font-size: 0.875rem;
          color: var(--text-secondary);
          z-index: 1000;
        }

        .notifications {
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 1001;
          max-width: 300px;
        }

        .notification {
          background: var(--bg-secondary);
          border: 1px solid var(--border-primary);
          border-radius: 8px;
          padding: 12px 16px;
          margin-bottom: 8px;
          font-size: 0.875rem;
          opacity: 0;
          transform: translateX(100%);
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .notification.show {
          opacity: 1;
          transform: translateX(0);
        }

        .notification.success {
          border-color: var(--accent-green);
          background: rgba(63, 185, 80, 0.1);
        }

        .notification.error {
          border-color: var(--accent-red);
          background: rgba(248, 81, 73, 0.1);
        }

        .notification.info {
          border-color: var(--accent-blue);
          background: rgba(88, 166, 255, 0.1);
        }

        .config-section {
          background: var(--bg-secondary);
          border: 1px solid var(--border-primary);
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 30px;
        }

        .config-item {
          background: var(--bg-tertiary);
          border: 1px solid var(--border-primary);
          border-radius: 6px;
          padding: 12px;
          margin-bottom: 8px;
          font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
          font-size: 0.875rem;
        }

        .error-section {
          background: var(--bg-secondary);
          border: 1px solid var(--accent-red);
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 30px;
        }

        .error-item {
          background: rgba(248, 81, 73, 0.1);
          border: 1px solid var(--accent-red);
          border-radius: 6px;
          padding: 12px;
          margin-bottom: 8px;
          color: var(--accent-red);
          font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
          font-size: 0.875rem;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
        }

        .error-info {
          flex: 1;
          min-width: 0;
        }

        .error-message {
          background: rgba(248, 81, 73, 0.2);
          padding: 8px;
          border-radius: 4px;
          margin-top: 8px;
          font-size: 0.75rem;
          font-family: monospace;
          white-space: pre-wrap;
          word-break: break-word;
        }

        .error-actions {
          display: flex;
          gap: 4px;
          flex-shrink: 0;
        }

        .error-actions button {
          padding: 4px 8px;
          font-size: 0.75rem;
          min-width: auto;
        }

        .download-actions {
          display: flex;
          gap: 4px;
          flex-shrink: 0;
          opacity: 0;
          transition: opacity 0.2s ease;
        }

        .download-item:hover .download-actions {
          opacity: 1;
        }

        .download-actions button {
          padding: 4px 8px;
          font-size: 0.75rem;
          min-width: auto;
        }

        .position-badge {
          background: var(--accent-blue);
          color: white;
          border-radius: 50%;
          min-width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          font-weight: 700;
          flex-shrink: 0;
        }

        .search-filter-bar {
          display: flex;
          gap: 12px;
          padding: 16px 20px;
          align-items: center;
          flex-wrap: wrap;
          border-bottom: 1px solid var(--border-primary);
        }

        .search-filter-bar input {
          flex: 1;
          min-width: 200px;
          padding: 8px 12px;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-primary);
          border-radius: 6px;
          color: var(--text-primary);
          font-size: 0.875rem;
        }

        .filter-buttons {
          display: flex;
          gap: 4px;
        }

        .filter-buttons button {
          padding: 6px 12px;
          font-size: 0.75rem;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-primary);
          color: var(--text-secondary);
          border-radius: 4px;
        }

        .filter-buttons button.active {
          background: var(--accent-blue);
          color: white;
          border-color: var(--accent-blue);
        }

        .pagination-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 20px;
          border-top: 1px solid var(--border-primary);
          color: var(--text-secondary);
          font-size: 0.875rem;
        }

        .pagination-bar button {
          padding: 6px 16px;
          font-size: 0.8rem;
        }

        .pagination-bar button:disabled {
          opacity: 0.4;
          cursor: default;
          transform: none;
        }

        .pagination-controls {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        </style>
      </head>

      <body>
        <div class="container">
          <div class="header">
            <h1>DLM</h1>
            <div class="status-indicator">
              <div class="status-dot"></div>
              <span id="last-update">Live</span>
            </div>
          </div>

          <div
            class="refresh-indicator"
            id="refresh-indicator"
            style="display: none;"
          >
            Refreshing...
          </div>

          <div class="notifications" id="notifications"></div>

          <div class="grid">
            <div class="card">
              <h2>
                <svg class="icon" viewBox="0 0 16 16">
                  <path
                    d="M8 4a4 4 0 1 1 0 8 4 4 0 0 1 0-8ZM2 8a6 6 0 1 0 12 0A6 6 0 0 0 2 8Z"
                  />
                </svg>
                Download Statistics
              </h2>
              <div class="stats-grid" id="stats-container">
                ${raw(counts)}
              </div>
            </div>

            <div class="card">
              <h2>
                <svg class="icon" viewBox="0 0 16 16">
                  <path
                    d="M9.585.52a2.678 2.678 0 0 0-3.17 0l-.928.68a1.178 1.178 0 0 1-.518.215L3.83 1.59a2.678 2.678 0 0 0-2.24 2.24l-.175 1.14a1.178 1.178 0 0 1-.215.518l-.68.928a2.678 2.678 0 0 0 0 3.17l.68.928c.113.153.186.33.215.518l.175 1.138a2.678 2.678 0 0 0 2.24 2.24l1.138.175c.187.029.365.102.518.215l.928.68a2.678 2.678 0 0 0 3.17 0l.928-.68a1.17 1.17 0 0 1 .518-.215l1.138-.175a2.678 2.678 0 0 0 2.24-2.24l.175-1.138c.029-.187.102-.365.215-.518l.68-.928a2.678 2.678 0 0 0 0-3.17l-.68-.928a1.179 1.179 0 0 1-.215-.518L14.17 3.83a2.678 2.678 0 0 0-2.24-2.24l-1.138-.175a1.179 1.179 0 0 1-.518-.215L9.585.52ZM7.303 1.728c.415-.305.973-.305 1.388 0l.928.68c.348.256.752.423 1.18.489l1.136.174c.51.078.909.478.987.987l.174 1.137c.066.427.233.831.489 1.18l.68.927c.305.415.305.973 0 1.388l-.68.928a2.678 2.678 0 0 0-.489 1.18l-.174 1.136a1.178 1.178 0 0 1-.987.987l-1.137.174a2.678 2.678 0 0 0-1.18.489l-.927.68c-.415.305-.973.305-1.388 0l-.928-.68a2.678 2.678 0 0 0-1.18-.489l-1.136-.174a1.178 1.178 0 0 1-.987-.987L3.93 10.05a2.678 2.678 0 0 0-.489-1.18l-.68-.928a1.178 1.178 0 0 1 0-1.388l.68-.927a2.678 2.678 0 0 0 .489-1.18L3.104 3.17c.078-.51.478-.909.987-.987l1.137-.174a2.678 2.678 0 0 0 1.18-.489l.928-.68ZM11.28 6.78a.75.75 0 0 0-1.06-1.06L7.25 8.689 5.78 7.22a.75.75 0 0 0-1.06 1.06l2 2a.75.75 0 0 0 1.06 0l3.5-3.5Z"
                  />
                </svg>
                System Status
              </h2>
              <div class="stats-grid" id="system-info">
                <div class="stat-item">
                  <span class="stat-number" id="uptime">--</span>
                  <span class="stat-label">Uptime</span>
                </div>
                <div class="stat-item">
                  <span class="stat-number" id="memory">--</span>
                  <span class="stat-label">Memory</span>
                </div>
                <div class="stat-item">
                  <span class="stat-number" id="version">--</span>
                  <span class="stat-label">Deno</span>
                </div>
              </div>
            </div>
          </div>

          <div class="form-section">
            <h2>
              <svg class="icon" viewBox="0 0 16 16">
                <path
                  d="M7.47 10.78a.75.75 0 0 0 1.06 0l3.75-3.75a.75.75 0 0 0-1.06-1.06L8.75 8.44V1.75a.75.75 0 0 0-1.5 0v6.69L4.78 5.97a.75.75 0 0 0-1.06 1.06l3.75 3.75ZM3.75 13a.75.75 0 0 0 0 1.5h8.5a.75.75 0 0 0 0-1.5h-8.5Z"
                />
              </svg>
              Add Downloads
            </h2>
            <form id="add-urls-form" action="/add-urls" method="POST">
              <div class="form-group">
                <label for="urls">URLs (one per line or comma-separated):</label>
                <textarea
                  id="urls"
                  name="urls"
                  rows="4"
                  placeholder="https://example.com/video1&#10;https://example.com/video2"
                ></textarea>
              </div>
              <div class="button-group">
                <button type="submit">Add URLs</button>
                <button type="button" onclick="startDownloads()" title="Ctrl+D">
                  Start Downloads
                </button>
                <button type="button" onclick="clearForm()">Clear</button>
                <button type="button" onclick="refreshData()" title="Ctrl+R">
                  Refresh
                </button>
              </div>
            </form>
          </div>

          <div
            id="error-section"
            class="error-section"
            style="display: ${errorSectionDisplay};"
          >
            <h2>
              <svg class="icon" viewBox="0 0 16 16">
                <path
                  d="M2.343 13.657A8 8 0 1 1 13.658 2.343 8 8 0 0 1 2.343 13.657ZM6.03 4.97a.751.751 0 0 0-1.042.018.751.751 0 0 0-.018 1.042L6.94 8 4.97 9.97a.749.749 0 0 0 .326 1.275.749.749 0 0 0 .734-.215L8 9.06l1.97 1.97a.749.749 0 0 0 1.275-.326.749.749 0 0 0-.215-.734L9.06 8l1.97-1.97a.749.749 0 0 0-.326-1.275.749.749 0 0 0-.734.215L8 6.94Z"
                />
              </svg>
              Failed Downloads
            </h2>
            <div class="button-group" style="margin-bottom: 16px;">
              <button type="button" onclick="retryAllFailed()">
                Retry All Failed
              </button>
              <button
                type="button"
                onclick="deleteAllFailed()"
                style="background: var(--accent-red);"
              >
                Delete All Failed
              </button>
            </div>
            <div id="error-container">${raw(errorList)}</div>
          </div>

          <div class="download-list">
            <h2>
              <svg class="icon" viewBox="0 0 16 16">
                <path
                  d="M13 2.5a1.5 1.5 0 0 1 3 0v11a1.5 1.5 0 0 1-3 0v-.214c-2.162-1.241-4.49-1.843-6.912-2.083l.405 2.712A1 1 0 0 1 5.51 15.1h-.548a1 1 0 0 1-.916-.599l-1.85-3.49-.202-.003A2.014 2.014 0 0 1 0 9V7a2.014 2.014 0 0 1 1.994-2.008L2 5c.777 0 1.449.325 1.937.835.59-.312 1.263-.507 2.063-.507z"
                />
              </svg>
              Currently Downloading
            </h2>
            <div
              class="button-group"
              id="downloading-controls"
              style="display: none;"
            >
              <button type="button" onclick="resetAllDownloading()">
                Reset All to Pending
              </button>
            </div>
            <div class="download-items" id="downloading-container">
              <div
                style="text-align: center; color: var(--text-secondary); padding: 20px;"
              >
                No downloads currently in progress
              </div>
            </div>
          </div>

          <div class="download-list">
            <h2>
              <svg class="icon" viewBox="0 0 16 16">
                <path
                  d="M8 2a6 6 0 1 1 0 12A6 6 0 0 1 8 2ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0ZM8 5.5a.5.5 0 0 1 .5.5v2.793l1.646-1.647a.5.5 0 0 1 .708.708l-2.5 2.5a.5.5 0 0 1-.708 0l-2.5-2.5a.5.5 0 0 1 .708-.708L7.5 8.793V6a.5.5 0 0 1 .5-.5Z"
                />
              </svg>
              Upcoming Downloads
              <span
                id="upcoming-count"
                style="font-size: 0.85rem; color: var(--text-secondary); font-weight: 400;"
              ></span>
            </h2>
            <div class="download-items" id="upcoming-container">
              <div
                style="text-align: center; color: var(--text-secondary); padding: 20px;"
              >
                No pending downloads in queue
              </div>
            </div>
          </div>

          <div class="download-list">
            <h2>
              <svg class="icon" viewBox="0 0 16 16">
                <path
                  d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z M8.5 6a.5.5 0 0 0-1 0v1.5H6a.5.5 0 0 0 0 1h1.5V10a.5.5 0 0 0 1 0V8.5H10a.5.5 0 0 0 0-1H8.5V6z"
                />
              </svg>
              Recently Added
            </h2>
            <div class="download-items" id="recent-container">
              <div
                style="text-align: center; color: var(--text-secondary); padding: 20px;"
              >
                No recent downloads
              </div>
            </div>
          </div>

          <div class="download-list">
            <h2>
              <svg class="icon" viewBox="0 0 16 16">
                <path
                  d="M2.5 3.5a.5.5 0 0 1 0-1h11a.5.5 0 0 1 0 1h-11ZM2.5 7.5a.5.5 0 0 1 0-1h11a.5.5 0 0 1 0 1h-11ZM2.5 11.5a.5.5 0 0 1 0-1h11a.5.5 0 0 1 0 1h-11Z"
                />
              </svg>
              All Downloads
            </h2>
            <div class="search-filter-bar">
              <input
                type="text"
                id="download-search"
                placeholder="Search title, URL, or collection..."
              />
              <div class="filter-buttons" id="status-filters">
                <button type="button" class="active" data-status="all">All</button>
                <button type="button" data-status="pending">Pending</button>
                <button type="button" data-status="success">Success</button>
                <button type="button" data-status="error">Error</button>
              </div>
            </div>
            <div class="download-items" id="downloads-container">
              ${raw(downloadsList)}
            </div>
            <div class="pagination-bar" id="pagination-bar">
              <span id="pagination-info"></span>
              <div class="pagination-controls">
                <button type="button" id="prev-page" disabled>Previous</button>
                <button type="button" id="next-page" disabled>Next</button>
              </div>
            </div>
          </div>

          <div class="logs-section">
            <h2>
              <svg class="icon" viewBox="0 0 16 16">
                <path
                  d="M1 2.828c.885-.37 2.154-.769 3.388-.893 1.33-.134 2.458.063 3.112.752v9.746c-.935-.53-2.12-.603-3.213-.493-1.18.12-2.37.461-3.287.811V2.828ZM7.5 1.093V12.85c.654-.689 1.782-.886 3.112-.752 1.234.124 2.503.523 3.388.893v9.923c-.918-.35-2.107-.692-3.287-.81-1.094-.111-2.278-.039-3.213.492V1.093Z"
                />
              </svg>
              System Logs
            </h2>
            <div class="logs-search">
              <input type="text" id="log-search" placeholder="Search logs..." />
            </div>
            <div class="logs-controls">
              <button
                type="button"
                onclick="filterLogs('all')"
                class="active"
                id="filter-all"
              >
                All
              </button>
              <button type="button" onclick="filterLogs('error')" id="filter-error">
                Errors
              </button>
              <button
                type="button"
                onclick="filterLogs('warning')"
                id="filter-warning"
              >
                Warnings
              </button>
              <button type="button" onclick="filterLogs('info')" id="filter-info">
                Info
              </button>
              <button type="button" onclick="clearLogs()">Clear</button>
            </div>
            <div class="logs-container" id="logs-container">
              ${raw(
                logs.split("\n").map((line) =>
                  `<div class="log-line">${line}</div>`
                )
                  .join(""),
              )}
            </div>
          </div>

          <div class="config-section">
            <h2>
              <svg class="icon" viewBox="0 0 16 16">
                <path
                  d="M9.405 1.05c-.413-1.4-2.397-1.4-2.81 0l-.1.34a1.464 1.464 0 0 1-2.105.872l-.31-.17c-1.283-.698-2.686.705-1.987 1.987l.169.311c.446.82.023 1.841-.872 2.105l-.34.1c-1.4.413-1.4 2.397 0 2.81l.34.1a1.464 1.464 0 0 1 .872 2.105l-.17.31c-.698 1.283.705 2.686 1.987 1.987l.311-.169a1.464 1.464 0 0 1 2.105.872l.1.34c.413 1.4 2.397 1.4 2.81 0l.1-.34a1.464 1.464 0 0 1 2.105-.872l.31.17c1.283.698 2.686-.705 1.987-1.987l-.169-.311a1.464 1.464 0 0 1 .872-2.105l.34-.1c1.4-.413 1.4-2.397 0-2.81l-.34-.1a1.464 1.464 0 0 1-.872-2.105l.17-.31c.698-1.283-.705-2.686-1.987-1.987l-.311.169a1.464 1.464 0 0 1-2.105-.872l-.1-.34ZM8 10.93a2.929 2.929 0 1 1 0-5.86 2.929 2.929 0 0 1 0 5.858Z"
                />
              </svg>
              Configuration
            </h2>
            <div id="config-container">
              Loading configuration...
            </div>
          </div>
        </div>

        <script>
        let refreshInterval;
        let isRefreshing = false;

        // Pagination & filter state for "All Downloads"
        const PAGE_SIZE = 50;
        let currentPage = 0;
        let currentSearch = '';
        let currentStatusFilter = 'all';
        let searchDebounceTimer = null;

        function showNotification(message, type = 'info', duration = 3000) {
          const container = document.getElementById('notifications');
          const notification = document.createElement('div');
          notification.className = 'notification ' + type;

          const icon = type === 'success' ? '✓' : type === 'error' ? '✗' : 'ℹ';
          notification.innerHTML = '<span>' + icon + '</span><span>' + message + '</span>';

          container.appendChild(notification);
          setTimeout(() => notification.classList.add('show'), 10);
          setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
              if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
              }
            }, 300);
          }, duration);
        }

        function showRefreshIndicator() {
          document.getElementById('refresh-indicator').style.display = 'block';
        }

        function hideRefreshIndicator() {
          document.getElementById('refresh-indicator').style.display = 'none';
        }

        function buildDownloadsUrl() {
          const params = new URLSearchParams();
          params.set('limit', PAGE_SIZE);
          params.set('offset', currentPage * PAGE_SIZE);
          if (currentSearch) params.set('search', currentSearch);
          if (currentStatusFilter !== 'all') params.set('status', currentStatusFilter);
          return '/api/downloads?' + params.toString();
        }

        async function refreshData() {
          if (isRefreshing) return;

          isRefreshing = true;
          showRefreshIndicator();

          try {
            const [statsRes, downloadsRes, downloadingRes, errorRes, upcomingRes, recentRes, systemRes, logsRes] = await Promise.all([
              fetch('/api/count'),
              fetch(buildDownloadsUrl()),
              fetch('/api/downloads?status=downloading&limit=100'),
              fetch('/api/downloads?status=error&limit=100'),
              fetch('/api/upcoming'),
              fetch('/api/recent'),
              fetch('/api/system'),
              fetch('/api/logs'),
            ]);

            const [statsData, downloadsData, downloadingData, errorData, upcomingData, recentData] = await Promise.all([
              statsRes.json(),
              downloadsRes.json(),
              downloadingRes.json(),
              errorRes.json(),
              upcomingRes.json(),
              recentRes.json(),
            ]);

            updateStats(statsData.statusGroups);
            updateAllDownloads(downloadsData.downloads, downloadsData.total, downloadsData.limit, downloadsData.offset);
            updateDownloadingSection(downloadingData.downloads);
            updateUpcomingSection(upcomingData.downloads, upcomingData.totalPending);
            updateRecentSection(recentData.downloads);
            updateErrorSection(errorData.downloads);

            if (systemRes.ok) {
              const systemData = await systemRes.json();
              updateSystemInfo(systemData);
            }

            if (logsRes.ok) {
              const logsData = await logsRes.json();
              updateLogs(logsData.logs.join('\\n'));
            }

            document.getElementById('last-update').textContent = new Date().toLocaleTimeString();

            } catch (error) {
              console.error('Failed to refresh data:', error);
              showNotification('Failed to refresh data', 'error');
            } finally {
              isRefreshing = false;
              hideRefreshIndicator();
            }
          }

          function updateStats(statusGroups) {
            const container = document.getElementById('stats-container');
            container.innerHTML = '';
            statusGroups.forEach(stat => {
              const statItem = document.createElement('div');
              statItem.className = 'stat-item';
              statItem.innerHTML = '<span class="stat-number ' + stat.status + '">' + stat.count + '</span>' +
                '<span class="stat-label">' + stat.status + '</span>';
              container.appendChild(statItem);
            });
          }

          function renderDownloadItem(download, extraPrefix) {
            const item = document.createElement('div');
            item.className = 'download-item';

            let actionsHtml = '';
            if (download.status === 'downloading') {
              actionsHtml = '<div class="download-actions">' +
                '<button onclick="resetDownload(' + download.id + ')" title="Reset to Pending">⟲</button>' +
                '</div>';
              } else if (download.status === 'error') {
                actionsHtml = '<div class="download-actions">' +
                  '<button onclick="retryDownload(' + download.id + ')" title="Retry">↻</button>' +
                  '<button onclick="deleteDownload(' + download.id + ')" title="Delete" style="background: var(--accent-red);">✗</button>' +
                  '</div>';
                } else if (download.status === 'success') {
                  actionsHtml = '<div class="download-actions">' +
                    '<button onclick="redownloadItem(' + download.id + ')" title="Redownload" style="background: var(--accent-purple);">↻</button>' +
                    '<button onclick="deleteDownload(' + download.id + ')" title="Delete" style="background: var(--accent-red);">✗</button>' +
                    '</div>';
                  } else if (download.status === 'pending') {
                    actionsHtml = '<div class="download-actions">' +
                      '<button onclick="deleteDownload(' + download.id + ')" title="Delete" style="background: var(--accent-red);">✗</button>' +
                      '</div>';
                    }

                    item.innerHTML = (extraPrefix || '') +
                      '<div class="download-info">' +
                      '<div class="download-title">' + (download.title || 'Untitled') + '</div>' +
                      '<div class="download-url">' + download.url + '</div>' +
                      '<div class="download-collection">Collection: ' + download.collection + ' | ID: ' + download.id + '</div>' +
                      (download.errorMessage ? '<div class="error-message">' + download.errorMessage + '</div>' : '') +
                      '</div>' +
                      '<div style="display: flex; align-items: center; gap: 8px;">' +
                      '<div class="download-status ' + download.status + '">' + download.status + '</div>' +
                      actionsHtml +
                      '</div>';

                      return item;
                    }

                    function updateDownloadingSection(downloads) {
                      const container = document.getElementById('downloading-container');
                      const controls = document.getElementById('downloading-controls');
                      container.innerHTML = '';

                      if (downloads.length === 0) {
                        container.innerHTML = '<div style="text-align: center; color: var(--text-secondary); display: inline-block; padding: 8px;">No downloads currently in progress</div>';
                        controls.style.display = 'none';
                      } else {
                        controls.style.display = 'inline-block';
                        downloads.forEach(d => container.appendChild(renderDownloadItem(d)));
                      }
                    }

                    function updateUpcomingSection(downloads, totalPending) {
                      const container = document.getElementById('upcoming-container');
                      const countEl = document.getElementById('upcoming-count');
                      container.innerHTML = '';

                      if (totalPending > 0) {
                        countEl.textContent = '(next ' + downloads.length + ' of ' + totalPending + ' pending)';
                      } else {
                        countEl.textContent = '';
                      }

                      if (downloads.length === 0) {
                        container.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 20px;">No pending downloads in queue</div>';
                      } else {
                        downloads.forEach((download, index) => {
                          const badge = '<div class="position-badge">' + (index + 1) + '</div>';
                          container.appendChild(renderDownloadItem(download, badge));
                        });
                      }
                    }

                    function updateRecentSection(downloads) {
                      const container = document.getElementById('recent-container');
                      container.innerHTML = '';

                      if (downloads.length === 0) {
                        container.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 20px;">No recent downloads</div>';
                      } else {
                        downloads.forEach(d => container.appendChild(renderDownloadItem(d)));
                      }
                    }

                    function updateAllDownloads(downloads, total, limit, offset) {
                      const container = document.getElementById('downloads-container');
                      container.innerHTML = '';

                      if (downloads.length === 0) {
                        container.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 20px;">No downloads found</div>';
                      } else {
                        downloads.forEach(d => container.appendChild(renderDownloadItem(d)));
                      }

                      // Update pagination
                      const totalPages = Math.max(1, Math.ceil(total / limit));
                      const page = Math.floor(offset / limit) + 1;

                      document.getElementById('pagination-info').textContent =
                        'Page ' + page + ' of ' + totalPages + ' (' + total + ' total)';

                        const prevBtn = document.getElementById('prev-page');
                        const nextBtn = document.getElementById('next-page');
                        prevBtn.disabled = (currentPage === 0);
                        nextBtn.disabled = (page >= totalPages);
                      }

                      function updateErrorSection(errorDownloads) {
                        const section = document.getElementById('error-section');
                        const container = document.getElementById('error-container');

                        if (errorDownloads.length === 0) {
                          section.style.display = 'none';
                          return;
                        }

                        section.style.display = 'block';
                        container.innerHTML = '';

                        errorDownloads.forEach(download => {
                          const item = document.createElement('div');
                          item.className = 'error-item';
                          item.innerHTML = '<div class="error-info">' +
                            '<strong>ID ' + download.id + ':</strong> ' + (download.title || 'Untitled') + '<br>' +
                            '<small>' + download.url + '</small>' +
                            (download.errorMessage ? '<div class="error-message">' + download.errorMessage + '</div>' : '') +
                            '</div>' +
                            '<div class="error-actions">' +
                            '<button onclick="retryDownload(' + download.id + ')" title="Retry">↻</button>' +
                            '<button onclick="deleteDownload(' + download.id + ')" title="Delete" style="background: var(--accent-red);">✗</button>' +
                            '</div>';
                          container.appendChild(item);
                        });
                      }

                      function updateSystemInfo(systemData) {
                        if (systemData.uptime) {
                          document.getElementById('uptime').textContent = systemData.uptime;
                        }
                        if (systemData.memory && systemData.memory.rss) {
                          document.getElementById('memory').textContent = systemData.memory.rss;
                        }
                        if (systemData.version && systemData.version.deno) {
                          document.getElementById('version').textContent = systemData.version.deno;
                        }
                      }

                      async function loadConfig() {
                        try {
                          const response = await fetch('/api/config');
                          if (response.ok) {
                            const config = await response.json();
                            updateConfigSection(config);
                          } else {
                            document.getElementById('config-container').innerHTML = '<div style="color: var(--text-secondary);">Configuration not available via API</div>';
                            showNotification('Configuration not available', 'error');
                          }
                        } catch (error) {
                          document.getElementById('config-container').innerHTML = '<div style="color: var(--accent-red);">Failed to load configuration</div>';
                          showNotification('Failed to load configuration', 'error');
                        }
                      }

                      function updateConfigSection(config) {
                        const container = document.getElementById('config-container');
                        container.innerHTML = '';

                        if (config.collections) {
                          Object.entries(config.collections).forEach(([name, collection]) => {
                            const item = document.createElement('div');
                            item.className = 'config-item';
                            item.innerHTML = '<strong>' + name + ':</strong><br>' +
                              '<small>Directory: ' + (collection.dir || 'N/A') + '</small><br>' +
                              '<small>Command: ' + (collection.command || 'N/A') + '</small><br>' +
                              '<small>Domains: ' + (collection.domains ? collection.domains.join(', ') : 'N/A') + '</small>';
                            container.appendChild(item);
                          });
                        } else {
                          container.innerHTML = 'No collections configured';
                        }
                      }

                      async function startDownloads() {
                        try {
                          const response = await fetch('/api/download', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ limit: 5 })
                          });

                          if (response.ok) {
                            const result = await response.json();
                            showNotification(result.message, 'success');
                            refreshData();
                          } else {
                            showNotification('Failed to start downloads', 'error');
                          }
                        } catch (error) {
                          showNotification('Failed to start downloads', 'error');
                        }
                      }

                      function clearForm() {
                        document.getElementById('urls').value = '';
                      }

                      function startAutoRefresh() {
                        refreshData();
                        refreshInterval = setInterval(refreshData, 10000);
                      }

                      function stopAutoRefresh() {
                        if (refreshInterval) {
                          clearInterval(refreshInterval);
                        }
                      }

                      // Handle form submission
                      document.getElementById('add-urls-form').addEventListener('submit', async function(e) {
                        e.preventDefault();
                        const formData = new FormData(this);
                        try {
                          const response = await fetch('/add-urls', {
                            method: 'POST',
                            body: formData
                          });
                          if (response.ok) {
                            clearForm();
                            refreshData();
                            showNotification('URLs added successfully', 'success');
                          } else {
                            showNotification('Failed to add URLs', 'error');
                          }
                        } catch (error) {
                          showNotification('Failed to add URLs', 'error');
                        }
                      });

                      document.addEventListener('visibilitychange', function() {
                        if (document.hidden) {
                          stopAutoRefresh();
                        } else {
                          startAutoRefresh();
                        }
                      });

                      document.addEventListener('keydown', function(e) {
                        if (e.ctrlKey || e.metaKey) {
                          switch(e.key) {
                            case 'r':
                              e.preventDefault();
                              refreshData();
                              break;
                            case 'd':
                              e.preventDefault();
                              startDownloads();
                              break;
                            }
                          }
                        });

                        function filterLogs(type) {
                          const lines = document.querySelectorAll('.log-line');
                          const buttons = document.querySelectorAll('.logs-controls button');

                          buttons.forEach(btn => btn.classList.remove('active'));
                          document.getElementById('filter-' + type).classList.add('active');

                          lines.forEach(line => {
                            line.classList.remove('hidden');
                            if (type !== 'all') {
                              if (type === 'error' && !line.textContent.toLowerCase().includes('error')) {
                                line.classList.add('hidden');
                              } else if (type === 'warning' && !line.textContent.toLowerCase().includes('warning')) {
                                line.classList.add('hidden');
                              } else if (type === 'info' && !line.textContent.toLowerCase().includes('info')) {
                                line.classList.add('hidden');
                              }
                            }
                          });
                        }

                        function searchLogs() {
                          const searchTerm = document.getElementById('log-search').value.toLowerCase();
                          const lines = document.querySelectorAll('.log-line');

                          lines.forEach(line => {
                            if (searchTerm === '' || line.textContent.toLowerCase().includes(searchTerm)) {
                              line.classList.remove('hidden');
                            } else {
                              line.classList.add('hidden');
                            }
                          });
                        }

                        function clearLogs() {
                          document.getElementById('logs-container').innerHTML = '<div class="log-line">Logs cleared</div>';
                        }

                        function updateLogs(logs) {
                          const container = document.getElementById('logs-container');
                          const lines = logs.split('\\n').map(line => {
                            const div = document.createElement('div');
                            div.className = 'log-line';
                            if (line.toLowerCase().includes('error')) {
                              div.classList.add('error');
                            } else if (line.toLowerCase().includes('warning')) {
                              div.classList.add('warning');
                            } else if (line.toLowerCase().includes('info')) {
                              div.classList.add('info');
                            }
                            div.textContent = line;
                            return div.outerHTML;
                          }).join('');
                          container.innerHTML = lines;
                        }

                        async function retryDownload(id) {
                          try {
                            const response = await fetch('/api/retry/' + id, { method: 'POST' });
                            if (response.ok) {
                              const result = await response.json();
                              showNotification(result.message, 'success');
                              refreshData();
                            } else {
                              showNotification('Failed to retry download', 'error');
                            }
                          } catch (error) {
                            showNotification('Failed to retry download', 'error');
                          }
                        }

                        async function deleteDownload(id) {
                          if (!confirm('Are you sure you want to delete this download?')) return;
                          try {
                            const response = await fetch('/api/download/' + id, { method: 'DELETE' });
                            if (response.ok) {
                              const result = await response.json();
                              showNotification(result.message, 'success');
                              refreshData();
                            } else {
                              showNotification('Failed to delete download', 'error');
                            }
                          } catch (error) {
                            showNotification('Failed to delete download', 'error');
                          }
                        }

                        async function retryAllFailed() {
                          if (!confirm('Are you sure you want to retry all failed downloads?')) return;
                          try {
                            const response = await fetch('/api/retry-all-failed', { method: 'POST' });
                            if (response.ok) {
                              const result = await response.json();
                              showNotification(result.message, 'success');
                              refreshData();
                            } else {
                              showNotification('Failed to retry downloads', 'error');
                            }
                          } catch (error) {
                            showNotification('Failed to retry downloads', 'error');
                          }
                        }

                        async function deleteAllFailed() {
                          if (!confirm('Are you sure you want to delete ALL failed downloads? This cannot be undone.')) return;
                          try {
                            const response = await fetch('/api/delete-all-failed', { method: 'DELETE' });
                            if (response.ok) {
                              const result = await response.json();
                              showNotification(result.message, 'success');
                              refreshData();
                            } else {
                              showNotification('Failed to delete downloads', 'error');
                            }
                          } catch (error) {
                            showNotification('Failed to delete downloads', 'error');
                          }
                        }

                        async function resetDownload(id) {
                          try {
                            const response = await fetch('/api/reset/' + id, { method: 'POST' });
                            if (response.ok) {
                              const result = await response.json();
                              showNotification(result.message, 'success');
                              refreshData();
                            } else {
                              showNotification('Failed to reset download', 'error');
                            }
                          } catch (error) {
                            showNotification('Failed to reset download', 'error');
                          }
                        }

                        async function resetAllDownloading() {
                          if (!confirm('Are you sure you want to reset all downloading items to pending?')) return;
                          try {
                            const response = await fetch('/api/reset-all-downloading', { method: 'POST' });
                            if (response.ok) {
                              const result = await response.json();
                              showNotification(result.message, 'success');
                              refreshData();
                            } else {
                              showNotification('Failed to reset downloads', 'error');
                            }
                          } catch (error) {
                            showNotification('Failed to reset downloads', 'error');
                          }
                        }

                        async function redownloadItem(id) {
                          if (!confirm('Are you sure you want to redownload this completed item?')) return;
                          try {
                            const response = await fetch('/api/redownload/' + id, { method: 'POST' });
                            if (response.ok) {
                              const result = await response.json();
                              showNotification(result.message, 'success');
                              refreshData();
                            } else {
                              showNotification('Failed to redownload item', 'error');
                            }
                          } catch (error) {
                            showNotification('Failed to redownload item', 'error');
                          }
                        }

                        // Start everything when page loads
                        window.addEventListener('load', function() {
                          startAutoRefresh();
                          loadConfig();

                          // Log search
                          document.getElementById('log-search').addEventListener('input', searchLogs);

                          // Download search with debounce
                          document.getElementById('download-search').addEventListener('input', function() {
                            clearTimeout(searchDebounceTimer);
                            searchDebounceTimer = setTimeout(function() {
                              currentSearch = document.getElementById('download-search').value;
                              currentPage = 0;
                              refreshData();
                            }, 300);
                          });

                          // Status filter buttons
                          document.querySelectorAll('#status-filters button').forEach(function(btn) {
                            btn.addEventListener('click', function() {
                              document.querySelectorAll('#status-filters button').forEach(function(b) { b.classList.remove('active'); });
                              btn.classList.add('active');
                              currentStatusFilter = btn.getAttribute('data-status');
                              currentPage = 0;
                              refreshData();
                            });
                          });

                          // Pagination
                          document.getElementById('prev-page').addEventListener('click', function() {
                            if (currentPage > 0) {
                              currentPage--;
                              refreshData();
                            }
                          });
                          document.getElementById('next-page').addEventListener('click', function() {
                            currentPage++;
                            refreshData();
                          });
                        });

                        window.addEventListener('beforeunload', function() {
                          stopAutoRefresh();
                        });
                      </script>
                    </body>
                  </html>
                `;
              }
