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
  errorMessage: string | null;
}

interface Download extends DownloadBase {
  id: number;
}

const logger = new Logger();

const DBFile = path.join(Deno.cwd(), "dlm.db");

/**
 * @returns the number of downloads in the database
 */
export function countDownloads(): { status: string; count: number }[] {
  const db = new DB(DBFile, { mode: "read" });
  const query = db.prepareQuery<[string, number]>(
    "SELECT status, COUNT(*) FROM downloads GROUP BY status;",
  );
  const counts = [];
  for (const c of query.iter()) {
    counts.push(c);
  }
  query.finalize();
  db.close();
  return counts.map(([status, count]) => {
    return { status: status, count: count };
  });
}

/**
 * Dowloads downloads from the database. Deletes upon success.
 *
 * @param limit how many downloads to download, pass in `0` to download all
 */
export async function downloadDownloads(
  downloads: Download[],
) {
  for (const download of downloads) {
    await downloadDownload(download);
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

  await Deno.mkdir(collection.dir, { recursive: true });

  download.status = DownloadStatus.downloading;
  updateDownload(download);

  const logFile = path.join(collection.dir, "downloads.log");

  const command = new Deno.Command(collectionCommand[0], {
    args: collectionCommand.slice(1),
    stdout: "piped",
    stderr: "piped",
    cwd: collection.dir,
  });
  const output = await command.output();

  // Write output to log file
  const logEntry =
    `\n=== Download ${download.id} - ${new Date().toISOString()} ===\n` +
    `URL: ${download.url}\n` +
    `Command: ${collectionCommand.join(" ")}\n` +
    `--- STDOUT ---\n${new TextDecoder().decode(output.stdout)}\n` +
    `--- STDERR ---\n${new TextDecoder().decode(output.stderr)}\n` +
    `--- END ---\n\n`;

  await Deno.writeTextFile(logFile, logEntry, { append: true });

  if (output.success) {
    download.status = DownloadStatus.success;
    download.downloadedAt = new Date();
    updateDownload(download);
    logger.log("successfully downloaded:", download.title || download.url); // display more info
  } else {
    download.status = DownloadStatus.error;
    const errorMessage = new TextDecoder().decode(output.stderr).trim() ||
      new TextDecoder().decode(output.stdout).trim() ||
      `Command failed with exit code ${output.code}`;
    download.errorMessage = errorMessage;
    updateDownload(download);
    logger.error(
      `error downloading url: ${download.id} ${download.url}: ${errorMessage}`,
    );
  }
}

export function deleteDownload(download: Download) {
  const db = new DB(DBFile, { mode: "write" });
  db.query("DELETE FROM downloads WHERE id = ?", [download.id]);
  db.close();
  logger.log(`download deleted from db: ${download.title || download.url}`);
}

export function getDownload(id: number): Download | null {
  const queryStr = `SELECT
      id,
      collection,
      createdAt,
      downloadedAt,
      priority,
      status,
      title,
      url,
      errorMessage
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
      string | null,
    ]
  >(
    queryStr,
  );
  let download: Download | null = null;
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
      errorMessage,
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
      errorMessage: errorMessage,
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
    `SELECT id, collection, createdAt, downloadedAt, priority, status, title, url, errorMessage
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
      string | null,
    ]
  >(queryStr);
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
      errorMessage,
    ] of query.iter()
  ) {
    downloads.push({
      id: id,
      priority: priority,
      url: url,
      createdAt: new Date(createdAt),
      title: title,
      downloadedAt: downloadedAt ? new Date(downloadedAt) : null,
      status: status,
      collection: collection,
      errorMessage: errorMessage || null,
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
    errorMessage: null,
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

export function retryDownload(id: number): boolean {
  const db = new DB(DBFile);
  db.query(
    "UPDATE downloads SET status = ?, errorMessage = NULL WHERE id = ? AND status = ?",
    [DownloadStatus.pending, id, DownloadStatus.error],
  );
  const changes = db.changes;
  db.close();
  return changes > 0;
}

export function retryAllFailedDownloads(): number {
  const db = new DB(DBFile);
  db.query(
    "UPDATE downloads SET status = ?, errorMessage = NULL WHERE status = ?",
    [DownloadStatus.pending, DownloadStatus.error],
  );
  const changes = db.changes;
  db.close();
  return changes;
}

export function deleteAllFailedDownloads(): number {
  const db = new DB(DBFile);
  db.query(
    "DELETE FROM downloads WHERE status = ?",
    [DownloadStatus.error],
  );
  const changes = db.changes;
  db.close();
  return changes;
}

export function resetDownload(id: number): boolean {
  const db = new DB(DBFile);
  db.query(
    "UPDATE downloads SET status = ? WHERE id = ? AND status = ?",
    [DownloadStatus.pending, id, DownloadStatus.downloading],
  );
  const changes = db.changes;
  db.close();
  return changes > 0;
}

export function resetAllDownloadingDownloads(): number {
  const db = new DB(DBFile);
  db.query(
    "UPDATE downloads SET status = ? WHERE status = ?",
    [DownloadStatus.pending, DownloadStatus.downloading],
  );
  const changes = db.changes;
  db.close();
  return changes;
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
    const collection = collectionForURL(collections, url);

    if (!collection) {
      console.error("No collection found for URL:", url);
      continue;
    }

    addDownload(url, collection.name);

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
    url TEXT NOT NULL UNIQUE,
    errorMessage TEXT
  )
`);

  // Add errorMessage column if it doesn't exist (migration)
  try {
    db.execute(`ALTER TABLE downloads ADD COLUMN errorMessage TEXT`);
  } catch (_error) {
    // Column already exists, ignore error
  }

  logger.log(download.url);
  db.query(
    `INSERT INTO downloads
      (collection, createdAt, downloadedAt, priority, status, title, url, errorMessage)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      download.collection,
      download.createdAt.toISOString(),
      download.downloadedAt?.toISOString() || null,
      download.priority,
      download.status,
      download.title,
      download.url,
      download.errorMessage,
    ],
  );
  db.close();
  logger.log(`added ${download.title || download.url} to db`);
}

function updateDownload(download: Download) {
  const db = new DB(DBFile);
  db.query(
    `UPDATE downloads SET
      collection = ?,
      createdAt = ?,
      downloadedAt = ?,
      priority = ?,
      status = ?,
      title = ?,
      url = ?,
      errorMessage = ?
    WHERE id = ?`,
    [
      download.collection,
      download.createdAt.toISOString(),
      download.downloadedAt?.toISOString() || null,
      download.priority,
      download.status,
      download.title,
      download.url,
      download.errorMessage,
      download.id,
    ],
  );
  db.close();
}

const FILE_EXTS = [".zip", ".mp4", ".mp3", ".png", ".jpg", ".jpeg", ".gif"];

async function pageTitle(url: string): Promise<string | null> {
  if (FILE_EXTS.some(ext => url.endsWith(ext))) {
    return null;
  }

  try {
    const res = await fetch(url);
    const html = await res.text();
    const document = new DOMParser().parseFromString(html, "text/html");
    if (document === null) {
      return null;
    }
    const title = document?.querySelector("title")?.textContent;
    return title || null;
  } catch (err) {
    logger.error(err);
    return null;
  }
}
