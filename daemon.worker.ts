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
  try {
    await downloadDownloads(downloads);
  } catch (error) {
    logger.error(`${ts()} daemon: error during download run:`, error);
  }
  isDownloading = false;

  if (shutdownRequested) {
    self.postMessage({ type: "shutdown-ready" });
  }
}

// Listen for messages from the main thread
self.addEventListener("message", async (event: MessageEvent) => {
  const { type, mins, downloadsPerRun } = event.data;

  if (type === "start") {
    self.postMessage({
      type: "started",
      message: `Daemon started with ${mins} minute interval`,
    });

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
    try {
      await runDaemon(downloadsPerRun);
    } catch (error) {
      logger.error(`${ts()} daemon: error during initial run:`, error);
    }

    // Set up interval
    setInterval(async () => {
      if (!shutdownRequested) {
        logger.log(`${ts()} daemon: starting run`);
        try {
          await runDaemon(downloadsPerRun);
        } catch (error) {
          logger.error(`${ts()} daemon: error during run:`, error);
        }
      }
    }, delay);
  }

  if (type === "shutdown") {
    shutdownRequested = true;
    if (isDownloading) {
      logger.log(
        `${ts()} daemon: shutdown requested, downloads still active — waiting for them to finish`,
      );
    } else {
      self.postMessage({ type: "shutdown-ready" });
    }
  }
});

// Notify main thread that worker is ready
self.postMessage({ type: "ready" });
