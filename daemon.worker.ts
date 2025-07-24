/// <reference no-default-lib="true" />
/// <reference lib="deno.worker" />

import {
  downloadDownloads,
  DownloadStatus,
  selectDownloads,
} from "./download.ts";
import { Logger } from "./logger.ts";

const logger = new Logger();

function minutesToMilli(minutes: number): number {
  return 1000 * 60 * minutes;
}

async function runDaemon(numDownloads: number) {
  const downloads = selectDownloads(
    numDownloads,
    DownloadStatus.pending,
  );
  await downloadDownloads(downloads);

  // Send status back to main thread
  self.postMessage({
    type: "status",
    message: `Completed processing ${downloads.length} downloads`,
  });
}

// Listen for messages from the main thread
self.addEventListener("message", async (event: MessageEvent) => {
  const { type, mins, downloadsPerRun } = event.data;

  if (type === "start") {
    const delay = minutesToMilli(mins);
    logger.log(`Worker: running daemon every ${mins} minutes`);

    // Run immediately
    await runDaemon(downloadsPerRun);

    // Set up interval
    setInterval(async () => {
      await runDaemon(downloadsPerRun);
    }, delay);

    self.postMessage({
      type: "started",
      message: `Daemon started with ${mins} minute interval`,
    });
  }
});

// Notify main thread that worker is ready
self.postMessage({ type: "ready" });
