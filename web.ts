import * as hono from "@hono/hono";
import { Logger } from "./logger.ts";
import { logger as honoLogger } from "@hono/hono/logger";
import {
  addURLs,
  countDownloads,
  countFilteredDownloads,
  deleteAllFailedDownloads,
  deleteDownload,
  downloadDownloads,
  DownloadStatus,
  getDownload,
  getDownloadByURL,
  redownload,
  resetAllDownloadingDownloads,
  resetDownload,
  retryAllFailedDownloads,
  retryDownload,
  selectDownloads,
} from "./download.ts";
import { loadCollectonsFromConfig } from "./config.ts";
import { parseUrls } from "./urls.ts";
import { renderWeb } from "./render_web.ts";

const logger = new Logger();

export function createApp(): hono.Hono {
  const app = new hono.Hono();

  app.use(honoLogger());
  app.use(async (c, next) => {
    const userAgent = c.req.header("User-Agent");
    const host = c.req.header("host");
    logger.log(`[${c.req.method}] ${c.req.url} ${userAgent} ${host}`);
    await next();
  });

  app.get("/", async (c) => {
    const counts = countDownloads().map((c) =>
      `<div class="stat-item">
        <span class="stat-number ${c.status}">${c.count}</span>
        <span class="stat-label">${c.status}</span>
      </div>`
    ).join("");

    const downloads = selectDownloads(50);
    const downloadsList = downloads.map((d) =>
      `<div class="download-item">
        <div class="download-info">
          <div class="download-title">${d.title || "Untitled"}</div>
          <div class="download-url">${d.url}</div>
          <div class="download-collection">Collection: ${d.collection} | ID: ${d.id}</div>
        </div>
        <div style="display: flex; gap: 8px; align-items: center;">
          <div class="download-status ${d.status}">${d.status}</div>
          ${
        d.status === "success"
          ? `<button onclick="redownloadItem(${d.id})" title="Redownload" style="padding: 4px 8px; font-size: 12px; background: var(--accent-purple);">↻</button>`
          : ""
      }
          ${
        d.status === "error"
          ? `<button onclick="retryDownload(${d.id})" title="Retry" style="padding: 4px 8px; font-size: 12px;">↻</button>`
          : ""
      }
          ${
        d.status === "pending"
          ? `<button onclick="deleteDownload(${d.id})" title="Delete" style="padding: 4px 8px; font-size: 12px; background: var(--accent-red);">✗</button>`
          : ""
      }
        </div>
      </div>`
    ).join("");

    // Get error downloads for initial page load
    const errorDownloads = selectDownloads(100, DownloadStatus.error);
    const errorSection = errorDownloads.length > 0 ? "block" : "none";
    const errorList = errorDownloads.map((d) =>
      `<div class="error-item">
        <div class="error-info">
          <strong>ID ${d.id}:</strong> ${d.title || "Untitled"}<br>
          <small>${d.url}</small>
          ${
        d.errorMessage
          ? `<div class="error-message">${d.errorMessage}</div>`
          : ""
      }
        </div>
        <div class="error-actions">
          <button onclick="retryDownload(${d.id})" title="Retry">↻</button>
          <button onclick="deleteDownload(${d.id})" title="Delete" style="background: var(--accent-red);">✗</button>
        </div>
      </div>`
    ).join("");

    let logs = "";
    try {
      logs = await Deno.readTextFile("dlm.log");
      logs = logs.split("\n").slice(-100).join("\n");
    } catch (_error) {
      logs = "No log file found or error reading logs.";
    }

    return c.html(
      renderWeb(counts, downloadsList, logs, errorSection, errorList),
    );
  });

  app.post("/add-urls", async (c) => {
    const rawUrls = (await c.req.parseBody())["urls"];
    const urls = parseUrls(rawUrls);
    addURLs(urls);
    logger.log("urls", urls);
    return c.redirect("/");
  });

  app.post("/api/add-urls", async (c) => {
    const rawUrls = (await c.req.json())["urls"];
    const urls = parseUrls(rawUrls);
    addURLs(urls);
    logger.log("added URLs:", urls.join(", "));
    return c.json({ message: "Downloads being added to database." });
  });

  app.get("/api/count", (c) => {
    return c.json({ statusGroups: countDownloads() });
  });

  app.get("/api/status", (c) => {
    const url = c.req.query("url");
    if (!url) {
      return c.json({ error: "url query parameter required" }, 400);
    }
    const download = getDownloadByURL(url);
    return c.json({ download });
  });

  app.post("/api/download", async (c) => {
    const limitBody = (await c.req.json())["limit"];
    let limit = 3;
    if (limitBody) {
      limit = parseInt(limitBody);
    }
    const downloads = selectDownloads(limit);
    downloadDownloads(downloads);
    return c.json({ message: `Downloading ${limit} downloads async` });
  });

  app.get("/api/downloads", (c) => {
    const limit = parseInt(c.req.query("limit") || "50") || 50;
    const offset = parseInt(c.req.query("offset") || "0") || 0;
    const search = c.req.query("search") || "";
    const statusParam = c.req.query("status") || "all";
    const filter = statusParam !== "all" &&
        Object.values(DownloadStatus).includes(
          statusParam as DownloadStatus,
        )
      ? (statusParam as DownloadStatus)
      : ("all" as const);

    const downloads = selectDownloads(limit, filter, offset, search);
    const total = countFilteredDownloads(filter, search);
    return c.json({ downloads, total, limit, offset });
  });

  app.get("/api/upcoming", (c) => {
    const upcoming = selectDownloads(10, DownloadStatus.pending);
    const totalPending = countFilteredDownloads(DownloadStatus.pending);
    return c.json({ downloads: upcoming, totalPending });
  });

  app.get("/api/recent", (c) => {
    const recent = selectDownloads(10);
    return c.json({ downloads: recent });
  });

  app.get("/api/config", async (c) => {
    try {
      const collections = await loadCollectonsFromConfig();
      const config = {
        collections: collections.reduce((acc, collection) => {
          acc[collection.name] = {
            dir: collection.dir,
            command: collection.command,
            domains: collection.domains,
          };
          return acc;
        }, {} as Record<string, {
          dir: string;
          command: string;
          domains: string[];
        }>),
      };
      return c.json(config);
    } catch (_error) {
      return c.json({ error: "Failed to load configuration" }, 500);
    }
  });

  app.get("/api/system", (c) => {
    const memoryUsage = Deno.memoryUsage();
    const systemInfo = {
      memory: {
        rss: Math.round(memoryUsage.rss / 1024 / 1024) + " MB",
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + " MB",
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + " MB",
      },
      version: Deno.version,
      uptime: Math.floor(performance.now() / 1000) + "s",
    };
    return c.json(systemInfo);
  });

  app.get("/api/logs", async (c) => {
    try {
      const logs = await Deno.readTextFile("dlm.log");
      const lines = logs.split("\n").slice(-100)
        .filter((line) => line.trim())
        .filter((line) => !line.includes("[GET]") && !line.includes("[POST]"));
      return c.json({ logs: lines });
    } catch (_error) {
      return c.json({ logs: ["No log file found or error reading logs."] });
    }
  });

  app.get("/api/download/:id", async (c) => {
    const id = parseInt(c.req.param("id"));
    const download = await getDownload(id);
    if (download) {
      return c.json({ download: download });
    } else {
      return c.json({ message: "download not found" }, 404);
    }
  });

  app.delete("/api/download/:id", async (c) => {
    const id = parseInt(c.req.param("id"));
    const download = await getDownload(id);
    if (download) {
      deleteDownload(download);
      return c.json({ message: "download deleted" });
    } else {
      return c.json({ message: "download not found" }, 404);
    }
  });

  app.post("/api/retry/:id", (c) => {
    const id = parseInt(c.req.param("id"));
    const success = retryDownload(id);
    if (success) {
      return c.json({ message: "download marked for retry" });
    } else {
      return c.json(
        { message: "download not found or not in error state" },
        404,
      );
    }
  });

  app.post("/api/retry-all-failed", (c) => {
    const count = retryAllFailedDownloads();
    return c.json({ message: `${count} failed downloads marked for retry` });
  });

  app.delete("/api/delete-all-failed", (c) => {
    const count = deleteAllFailedDownloads();
    return c.json({ message: `${count} failed downloads deleted` });
  });

  app.post("/api/reset/:id", (c) => {
    const id = parseInt(c.req.param("id"));
    const success = resetDownload(id);
    if (success) {
      return c.json({ message: "download reset to pending" });
    } else {
      return c.json(
        { message: "download not found or not in downloading state" },
        404,
      );
    }
  });

  app.post("/api/reset-all-downloading", (c) => {
    const count = resetAllDownloadingDownloads();
    return c.json({
      message: `${count} downloading downloads reset to pending`,
    });
  });

  app.post("/api/redownload/:id", (c) => {
    const id = parseInt(c.req.param("id"));
    const success = redownload(id);
    if (success) {
      return c.json({ message: "download marked for redownload" });
    } else {
      return c.json(
        { message: "download not found or not in success state" },
        404,
      );
    }
  });

  return app;
}

export function runWebServer() {
  const app = createApp();

  let port = 8001;
  const envPort = Deno.env.get("PORT");
  if (envPort != undefined) {
    port = parseInt(envPort);
  }

  Deno.serve({ port }, app.fetch);
}

if (import.meta.main) {
  runWebServer();
}
