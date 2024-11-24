import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.43/deno-dom-wasm.ts";
import { DB } from "https://deno.land/x/sqlite@v3.9.1/mod.ts";
import { Logger } from "./logger.ts";
import { collectionForURL } from "./collection.ts";
import { loadCollectonsFromConfig } from "./config.ts";
import * as path from "jsr:@std/path";

export enum DownloadStatus {
  "downloading" = "downloading",
  "error" = "error",
  "success" = "success",
  "pending" = "pending",
}

enum Priority {
  "normal" = "normal",
  "high" = "high",
}

interface DownloadBase {
  collection: string;
  createdAt: Date;
  downloadedAt: Date | null;
  priority: Priority;
  status: DownloadStatus;
  title: string | null;
  url: string;
}

interface Download extends DownloadBase {
  id: number;
}

const logger = new Logger();

const DBFile = path.join(Deno.cwd(), "dlm.db");

/**
 * @returns the number of downloads in the database
 */
export function countDownloads(): number {
  const db = new DB(DBFile, { mode: "read" });
  const query = db.prepareQuery<[number]>(
    "SELECT COUNT(*) FROM downloads;",
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
 * Dowloads downloads from the database. Deletes upon success.
 *
 * @param limit how many downloads to download, pass in `0` to download all
 */
export function downloadDownloads(
  downloads: Download[],
) {
  for (const download of downloads) {
    downloadDownload(download);
  }
}

async function downloadDownload(download: Download) {
  const collections = await loadCollectonsFromConfig();
  const collection = collections.find((c) => c.name == download.collection);
  if (!collection) {
    throw new Error(
      `Collection for download missing from config: ${collection}`,
    );
  }
  const collectionCommand = collection.command.replace("%", download.url).split(
    " ",
  );
  logger.debug("command:", collectionCommand.join(" "));

  await Deno.mkdir(collection.dir, { recursive: true });
  const startDir = Deno.cwd();

  Deno.chdir(collection.dir);
  download.status = DownloadStatus.downloading;
  updateDownload(download);

  const command = new Deno.Command(collectionCommand[0], {
    args: collectionCommand.slice(1),
    stdout: "inherit",
    stderr: "inherit",
  });
  const output = await command.output();
  if (output.success) {
    download.status = DownloadStatus.success;
    download.downloadedAt = new Date();
    updateDownload(download);
    logger.log("successfully downloaded:", download.title || download.url); // display more info
  } else {
    download.status = DownloadStatus.error;
    updateDownload(download);
    logger.error(`error downloading url: ${download.id} ${download.url}`);
  }
  Deno.chdir(startDir);
}

export function deleteDownload(download: Download) {
  const db = new DB(DBFile, { mode: "write" });
  db.query("DELETE FROM downloads WHERE id = ?", [download.id]);
  db.close();
  logger.log(`download deleted from db: ${download.title || download.url}`);
}

export async function getDownload(id: number): Promise<Download | null> {
  const queryStr = `SELECT
      id,
      collection
      createdAt,
      downloadedAt,
      priority,
      status,
      title,
      url,
    FROM downloads
    WHERE id = ${id}`;

  const db = new DB(DBFile, { mode: "read" });
  const query = db.prepareQuery<
    [
      number,
      string,
      string,
      string | null,
      Priority,
      DownloadStatus,
      string | null,
      string,
    ]
  >(
    queryStr,
  );
  let download: Download | null = null;
  for await (
    const [
      id,
      collection,
      createdAt,
      downloadedAt,
      priority,
      status,
      title,
      url,
    ] of query.iter()
  ) {
    download = {
      id: id,
      priority: priority,
      url: url,
      createdAt: new Date(createdAt),
      title: title,
      downloadedAt: downloadedAt ? new Date(downloadedAt) : null,
      status: status,
      collection: collection,
    };
  }
  query.finalize();
  db.close();
  return download;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const AllFilter = "all";

/**
 * Fetches downloads from the database
 * @param limit how many downloads to fetch
 * @returns an array of Downloads
 */
export function selectDownloads(
  limit: number,
  filter: DownloadStatus | typeof AllFilter = AllFilter,
): Download[] {
  let queryStr =
    `SELECT id, collection, createdAt, downloadedAt, priority, status, title, url
    FROM downloads`;
  if (filter != AllFilter) {
    queryStr += ` WHERE status='${filter}'`;
  }

  queryStr += ` ORDER BY priority DESC, id DESC`;

  if (limit > 0) {
    queryStr = queryStr + ` LIMIT ${limit};`;
  } else {
    queryStr = queryStr + `;`;
  }

  const db = new DB(DBFile, { mode: "read" });
  const query = db.prepareQuery<
    [
      number,
      string,
      string,
      string | null,
      Priority,
      DownloadStatus,
      string | null,
      string,
    ]
  >(
    queryStr,
  );
  const downloads: Download[] = [];
  for (
    const [
      id,
      collection,
      createdAt,
      downloadedAt,
      priority,
      status,
      title,
      url,
    ] of query
      .iter()
  ) {
    downloads.push({
      id: id,
      priority: priority,
      url: url,
      createdAt: new Date(createdAt),
      title: title,
      status: status,
      downloadedAt: downloadedAt ? new Date(downloadedAt) : null,
      collection: collection,
    });
  }
  query.finalize();
  db.close();
  return downloads;
}

/**
 * Adds downloads to the database, fetching title from the URL
 * @param urls urls of downloads to add
 */
export async function addDownload(url: string, collection: string) {
  const download: DownloadBase = {
    url: url,
    createdAt: new Date(),
    title: await pageTitle(url),
    downloadedAt: null,
    priority: Priority.normal,
    collection: collection,
    status: DownloadStatus.pending,
  };

  try {
    insertDownload(download);
  } catch (error: unknown) {
    const e = error as Record<string, string | undefined | null>;
    if (
      e?.name == "SqliteError" &&
      e?.message?.includes("UNIQUE constraint failed")
    ) {
      logger.log(`${download.title || download.url} already present`);
    } else {
      logger.error(`error inserting ${download.title || download.url}`);
      logger.error(e);
    }
  }
}

/**
 * Saves the URLs to the database in collection set from database.
 *
 * @param urls array of urls to add
 */
export async function addURLs(urls: string[]) {
  const collections = await loadCollectonsFromConfig();
  urls = urls.filter((u) => u.trim() !== "");
  for (const url of urls) {
    addDownload(url, collectionForURL(collections, url).name);

    if (urls.length > 1) {
      // lazy rate-limit avoiding
      await sleep(500);
    }
  }
}

function insertDownload(download: DownloadBase) {
  const db = new DB(DBFile);
  db.execute(`
  CREATE TABLE IF NOT EXISTS downloads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    collection TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    downloadedAt TEXT,
    priority TEXT NOT NULL,
    status TEXT NOT NULL,
    title TEXT,
    url TEXT NOT NULL UNIQUE
  )
`);

  logger.log(download.url);
  db.query(
    `INSERT INTO downloads
      (collection, createdAt, downloadedAt, priority, status, title, url)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      download.collection,
      download.createdAt,
      download.downloadedAt,
      download.priority,
      download.status,
      download.title,
      download.url,
    ],
  );
  db.close();
  logger.log(`added ${download.title || download.url} to db`);
}

function updateDownload(download: Download) {
  const db = new DB(DBFile);
  db.query(
    `UPDATE downloads
    SET
      collection = ?,
      createdAt = ?,
      downloadedAt = ?,
      priority = ?,
      status = ?,
      title = ?,
      url = ?
    WHERE id = ?`,
    [
      download.collection,
      download.createdAt,
      download.downloadedAt,
      download.priority,
      download.status,
      download.title,
      download.url,
      download.id,
    ],
  );
  db.close();
}

async function pageTitle(url: string): Promise<string | null> {
  const res = await fetch(url);
  const html = await res.text();
  const document = new DOMParser().parseFromString(html, "text/html");
  if (document === null) {
    return null;
  }
  const title = document?.querySelector("title")?.textContent;
  return title || null;
}
