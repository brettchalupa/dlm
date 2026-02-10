/// <reference lib="deno.worker" />

import {
  downloadDownloads,
  DownloadStatus,
  resetAllDownloadingDownloads,
  selectDownloads,
} from "./download.ts";
import { Logger } from "./logger.ts";

const logger = new Logger();

let isDownloading = false;
let shutdownRequested = false;

function ts(): string {
  return `[${new Date().toISOString()}]`;
}

function minutesToMilli(minutes: number): number {
  return 1000 * 60 * minutes;
}

async function runDaemon(numDownloads: number) {
  if (shutdownRequested) return;

  const downloads = selectDownloads(
    numDownloads,
    DownloadStatus.pending,
  );

  if (downloads.length === 0) {
    logger.log(`${ts()} daemon: no pending downloads, sleeping`);
    return;
  }

  logger.log(`${ts()} daemon: found ${downloads.length} pending downloads`);

  isDownloading = true;
  await downloadDownloads(downloads);
  isDownloading = false;

  if (shutdownRequested) {
    self.postMessage({ type: "shutdown-ready" });
  }
}

// Listen for messages from the main thread
self.addEventListener("message", async (event: MessageEvent) => {
  const { type, mins, downloadsPerRun } = event.data;

  if (type === "start") {
    // Crash recovery: reset any downloads stuck in "downloading" from a previous run
    const resetCount = resetAllDownloadingDownloads();
    if (resetCount > 0) {
      logger.log(
        `${ts()} daemon: reset ${resetCount} interrupted downloads to pending`,
      );
    }

    const delay = minutesToMilli(mins);
    logger.log(
      `${ts()} daemon: running every ${mins} minutes, ${downloadsPerRun} downloads per run`,
    );

    // Run immediately
    await runDaemon(downloadsPerRun);

    // Set up interval
    setInterval(async () => {
      if (!shutdownRequested) {
        logger.log(`${ts()} daemon: starting run`);
        await runDaemon(downloadsPerRun);
      }
    }, delay);

    self.postMessage({
      type: "started",
      message: `Daemon started with ${mins} minute interval`,
    });
  }

  if (type === "shutdown") {
    shutdownRequested = true;
    if (isDownloading) {
      logger.log(
        `${ts()} daemon: shutdown requested, 1 download still active — waiting for it to finish`,
      );
    } else {
      self.postMessage({ type: "shutdown-ready" });
    }
  }
});

// Notify main thread that worker is ready
self.postMessage({ type: "ready" });
