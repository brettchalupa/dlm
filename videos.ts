import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.43/deno-dom-wasm.ts";
import { DB } from "https://deno.land/x/sqlite@v3.9.1/mod.ts";

import { Video } from "./types.ts";

const DBFile = "dlm.db";

/**
 * @returns the number of videos in the database
 */
export function countVideos(): number {
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

/**
 * Dowloads videos from the database. Deletes upon success.
 *
 * @param limit how many videos to download, pass in `0` to download all
 */
export async function downloadVideos(limit: number = 0): Promise<Video[]> {
  const videos = selectVideos(limit);

    for await (const video of videos) {
        console.log("downloading", video.title || video.url);

        const command = new Deno.Command("yt-dlp", {
            args: [video.url],
            stdout: "inherit",
            stderr: "inherit",
        });
        const output = await command.output();
        if (output.success) {
            deleteVideo(video);
        } else {
            console.error(`error downloading video: ${video.title || video.url}`);
        }
  }

  console.log("Finished downloading videos.");
  return videos;
}

export function deleteVideo(video: Video) {
  const db = new DB(DBFile, { mode: "write" });
  db.query("DELETE FROM videos WHERE id = ?", [video.id]);
  db.close();
  console.log(`video deleted from db: ${video.title || video.url}`);
}

export async function getVideo(id: number): Promise<Video | null> {
  const queryStr =
    `SELECT id, url, created_at, title FROM videos WHERE id = ${id}`;

  const db = new DB(DBFile, { mode: "read" });
  const query = db.prepareQuery<[number, string, string, string?]>(
    queryStr,
  );
  let video: Video | null = null;
  for await (const [id, url, createdAt, title] of query.iter()) {
    video = {
      id: id,
      url: url,
      createdAt: new Date(createdAt),
      title: title,
    };
  }
  query.finalize();
  db.close();
  return video;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Fetches videos from the database
 * @param limit how many videos to fetch
 * @returns an array of Videos
 */
export function selectVideos(limit: number): Video[] {
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

/**
 * Adds videos to the database, fetching title from the URL
 * @param urls urls of videos to add
 */
export async function addVideos(urls: string[]) {
  urls = urls.filter((u) => u.trim() !== "");
  for await (const url of urls) {
    const video: Video = {
      url: url,
      createdAt: new Date(),
      title: await pageTitle(url),
    };

    try {
      insertVideo(video);
    } catch (error: unknown) {
        const e = error as Record<string, string | undefined | null>;
      if (
        e?.name == "SqliteError" &&
        e?.message?.includes("UNIQUE constraint failed")
      ) {
        console.log(`${video.title || video.url} already present`);
      } else {
        console.error(`error inserting ${video.title || video.url}`);
        console.error(e);
      }
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
