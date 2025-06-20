import * as hono from "jsr:@hono/hono";
import { Logger } from "./logger.ts";
import { logger as honoLogger } from "jsr:@hono/hono/logger";
import {
  addURLs,
  countDownloads,
  deleteDownload,
  downloadDownloads,
  DownloadStatus,
  getDownload,
  selectDownloads,
} from "./download.ts";

function parseUrls(rawUrls: unknown): string[] {
  if (Array.isArray(rawUrls)) {
    return rawUrls.map((u) => u.toString().trim()).filter((u) => u);
  }

  if (typeof rawUrls === "string") {
    return rawUrls
      .split("\n")
      .flatMap((u: string) => u.split(","))
      .map((u) => u.trim())
      .filter((u) => u);
  }

  return [];
}
import { renderWeb } from "./render_web.ts";

const logger = new Logger();

export function runWebServer() {
  const app = new hono.Hono();

  app.use(honoLogger());
  app.use(async (c, next) => {
    const userAgent = c.req.header("User-Agent");
    const host = c.req.header("host");
    logger.log(`[${c.req.method}] ${c.req.url} ${userAgent} ${host}`);
    await next();
  });

  app.get("/", async (c) => {
    const counts = countDownloads().map((c) => `${c.status}: ${c.count}`).join(
      "<br>",
    );
    const downloadsList = selectDownloads(50, DownloadStatus.pending).map((d) =>
      `<li>${d.id} - ${d.title} - ${d.url} - ${d.status}</li>`
    ).join("");

    let logs = await Deno.readTextFile("dlm.log");
    logs = logs.split("\n").slice(-50).join("<br>");

    return c.html(renderWeb(counts, downloadsList, logs));
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
    const downloads = selectDownloads(0);
    return c.json({ downloads });
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
