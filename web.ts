import * as hono from "jsr:@hono/hono";
import { html, raw } from "jsr:@hono/hono/html";
import { logger } from "jsr:@hono/hono/logger";
import {
  addVideos,
  countVideos,
  deleteVideo,
  downloadVideos,
  getVideo,
  selectVideos,
} from "./videos.ts";

export function runWebServer() {
  const app = new hono.Hono();

  app.use(logger());
  app.use(async (c, next) => {
    const userAgent = c.req.header("User-Agent");
    const host = c.req.header("host");
    console.log(`[${c.req.method}] ${c.req.url} ${userAgent} ${host}`);
    await next();
  });

  app.get("/", (c) => {
    const count = countVideos();
    const videosList = selectVideos(10).map((v) =>
      `<li>${v.id} - ${v.title} - ${v.url}</li>`
    ).join("");

    return c.html(
      html`<!doctype html>
    <html>
      <head>
        <title>vdm</title>
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
        <h1>vdm</h1>

        <p>Videos in database: ${count}</p>

        <h2>Next 10 Videos</h2>

        <ul>${raw(videosList)}</ul>

        <h2>Logs</h2>

        <h2>Add Videos</h2>

        <form action="/add-urls" method="POST">
          <label>
            URLs:
            <textarea name="urls"></textarea>
          </label>
          <br>
          <button type="submit">Add</button>
        </form>
      </body>
    </html>`,
    );
  });

  app.post("/add-urls", async (c) => {
    const urls = (await c.req.parseBody())["urls"].toString().split("\n");
    addVideos(urls);
    console.log("urls", urls);
    return c.redirect("/");
  });

  app.post("/api/add-urls", async (c) => {
    const urls = (await c.req.json())["urls"].toString().split("\n").flatMap(
      (u:string) => u.split("\r"),
    );
    addVideos(urls);
    console.log("added URL", urls);
    return c.json({ message: "Videos being added to database." });
  });

  app.get("/api/count", (c) => {
    return c.json({ count: countVideos() });
  });

  app.post("/api/download", async (c) => {
    const limitBody = (await c.req.json())["limit"];
    let limit = 3;
    if (limitBody) {
      limit = parseInt(limitBody);
    }
    downloadVideos(limit);
    return c.json({ message: `Downloading ${limit} videos async` });
  });

  app.get("/api/videos", (c) => {
    const videos = selectVideos(0);
    return c.json({ videos });
  });

  app.get("/api/video/:id", async (c) => {
    const id = parseInt(c.req.param("id"));
    const video = await getVideo(id);
    if (video) {
      return c.json({ video: video });
    } else {
      return c.json({ message: "video not found" }, 404);
    }
  });

  app.delete("/api/video/:id", async (c) => {
    const id = parseInt(c.req.param("id"));
    const video = await getVideo(id);
    if (video) {
      deleteVideo(video);
      return c.json({ message: "video deleted" });
    } else {
      return c.json({ message: "video not found" }, 404);
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
