import { html, raw } from "jsr:@hono/hono/html";
import { HtmlEscapedString } from "jsr:@hono/hono/utils/html";

export function renderWeb(
  counts: string,
  downloadsList: string,
  logs: string,
): HtmlEscapedString | Promise<HtmlEscapedString> {
  return html`
    <!DOCTYPE html>
    <html>
      <head>
        <title>dlm</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>
        body {
          font-family: sans-serif;
          max-width: 1200px;
          width: 100%;
          margin: 0 auto;
          padding: 12px;
        }
        </style>
      </head>

      <body>
        <h1>dlm</h1>

        <p>
          <strong>Downloads in database:</strong>
          <br>${raw(counts)}
        </p>

        <h2>Add Downloads</h2>

        <form action="/add-urls" method="POST">
          <label>
            URLs:
            <textarea
              rows="5"
              style="width: 100%;max-width: 520px"
              name="urls"
            ></textarea>
          </label>
          <br>
          <button type="submit">Add</button>
        </form>

        <h2>Next 50 Pending Downloads</h2>

        <ul style="overflow: scroll">${raw(downloadsList)}</ul>

        <h2>Logs</h2>

        <p>Last 50 lines of the <code>dlm.log</code> file:</p>

        <pre style="overflow:scroll">${raw(logs)}</pre>
      </body>
    </html>
  `;
}
