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
  const downloads = selectDownloads(
    Deno.args[2] ? parseInt(Deno.args[2]) : 3,
    DownloadStatus.pending,
  );
  await downloadDownloads(downloads);
}

export async function startDaemon() {
  const mins = Deno.args[1] || "5";
  const delay = minutesToMilli(parseInt(mins));
  logger.log(`running daemon every ${mins} minutes`);
  await runDaemon();
  setInterval(async () => {
    await runDaemon();
  }, delay);
}

if (import.meta.main) {
  startDaemon();
}
