/**
 * vdm - video download manager
 *
 * Maintains a list of videos to download and then handles downloading them.
 * Requires yt-dlp to be installed.
 * Stores the videos in a SQLite3 database.
 *
 * Examples:
 * vdm add URL
 * cat foo.txt | vdm add
 * vdm dl // download all videos in database
 * vdm dl 10 // download next 10 vids
 */

import { DB } from "https://deno.land/x/sqlite@v3.9.1/mod.ts";
import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.43/deno-dom-wasm.ts";

const DBFile = "vdm.db";

interface Video {
  id?: number;
  url: string;
  title?: string;
  createdAt: Date;
}

async function main() {
  const command = Deno.args[0];

  switch (command) {
    case undefined:
      console.log("vdm - video download manager");
      console.log("Commands:");
      console.log("add");
      console.log("dl");
      console.log("dl LIMIT");
      break;
    case "add": {
      let urls: string[] = Deno.args.slice(1);

      const decoder = new TextDecoder();

      if (urls[0] === "-") {
        urls = urls.slice(1);
        for await (const chunk of Deno.stdin.readable) {
          const text = decoder.decode(chunk);
          urls = [
            ...urls,
            ...text.trim().split("\n"),
          ];
        }
      }

      if (urls.length === 0) {
        console.error("No URLs provided");
        Deno.exit(1);
      }

      addVideos(urls);
      break;
    }
    case "dl":
      downloadVideos();
      break;
    case "count": {
      const count = countVideos();
      console.log(`videos in db: ${count}`);
      break;
    }
    case "serve":
      runWebServer();
      break;
    default:
      console.error(`Unsupported command: ${command}`);
      Deno.exit(1);
  }
}

function countVideos(): number {
  const db = new DB(DBFile, { mode: "read" });
  const query = db.prepareQuery<[number]>(
    "SELECT COUNT(*) FROM videos;",
  );
  let count = 0;
  for (const [c] of query.iter()) {
    count = c;
  }
  query.finalize();
  db.close();
  return count;
}

function downloadVideos() {
  const limitArg = Deno.args[1];
  let limit = 0;
  if (limitArg) {
    limit = Number.parseInt(limitArg);
  }

  const videos = selectVideos(limit);

  videos.forEach((video) => {
    console.log("downloading", video.title || video.url);

    const command = new Deno.Command("yt-dlp", {
      args: [video.url],
      stdout: "inherit",
      stderr: "inherit",
    });
    const output = command.outputSync();
    if (output.success) {
      deleteVideo(video);
    } else {
      console.error(`error downloading video: ${video.title || video.url}`);
    }
  });

  console.log("Finished downloading videos.");
}

function deleteVideo(video: Video) {
  const db = new DB(DBFile, { mode: "write" });
  db.query("DELETE FROM videos WHERE id = ?", [video.id]);
  db.close();
  console.log(`video deleted from db: ${video.title || video.url}`);
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function selectVideos(limit: number): Video[] {
  let queryStr =
    `SELECT id, url, created_at, title FROM videos ORDER BY id DESC`;

  if (limit > 0) {
    queryStr = queryStr + ` LIMIT ${limit};`;
  } else {
    queryStr = queryStr + `;`;
  }

  const db = new DB(DBFile, { mode: "read" });
  const query = db.prepareQuery<[number, string, string, string?]>(
    queryStr,
  );
  const videos: Video[] = [];
  for (const [id, url, createdAt, title] of query.iter()) {
    videos.push({
      id: id,
      url: url,
      createdAt: new Date(createdAt),
      title: title,
    });
  }
  query.finalize();
  db.close();
  return videos;
}

async function addVideos(urls: string[]) {
  for await (const url of urls) {
    const video: Video = {
      url: url,
      createdAt: new Date(),
      title: await pageTitle(url),
    };

    try {
      insertVideo(video);
    } catch (error) {
      console.error(`error inserting ${video.title || video.url}`);
      console.error(error);
    }

    if (urls.length > 1) {
      await sleep(1000);
    }
  }
}

function insertVideo(video: Video) {
  const db = new DB(DBFile);
  db.execute(`
  CREATE TABLE IF NOT EXISTS videos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL,
    url TEXT NOT NULL UNIQUE,
    title TEXT
  )
`);

  console.log(video.url);
  db.query("INSERT INTO videos (created_at, url, title) VALUES (?, ?, ?)", [
    video.createdAt,
    video.url,
    video.title,
  ]);
  db.close();
  console.log(`added ${video.title || video.url} to db`);
}

async function pageTitle(url: string): Promise<string | undefined> {
  const res = await fetch(url);
  const html = await res.text();
  const document = new DOMParser().parseFromString(html, "text/html");
  if (document === null) {
    return undefined;
  }
  const title = document?.querySelector("title")?.textContent;
  return title;
}

//////////////// web
import * as hono from "jsr:@hono/hono";
import { html, raw } from "jsr:@hono/hono/html";
function runWebServer() {
  const app = new hono.Hono();

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

  Deno.serve(app.fetch);
}
//////////////// web

await main();
