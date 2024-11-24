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

async function runDaemon() {
  logger.log("running daemon", new Date());
  const downloads = await selectDownloads(
    Deno.args[2] ? parseInt(Deno.args[2]) : 3,
    DownloadStatus.pending,
  );
  await downloadDownloads(downloads);
}

export function startDaemon() {
  const delay = minutesToMilli(parseInt(Deno.args[1] || "5"));
  logger.log(`running daemon every ${Deno.args[1]} minutes`);
  runDaemon();
  setInterval(runDaemon, delay);
}

if (import.meta.main) {
  startDaemon();
}
