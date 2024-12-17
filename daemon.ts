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
  logger.log("running daemon", new Date());
  const downloads = selectDownloads(
    numDownloads,
    DownloadStatus.pending,
  );
  await downloadDownloads(downloads);
}

export async function startDaemon(mins: number, downloadsPerRun: number) {
  const delay = minutesToMilli(mins);
  logger.log(`running daemon every ${mins} minutes`);
  await runDaemon(downloadsPerRun);
  setInterval(async () => {
    await runDaemon(downloadsPerRun);
  }, delay);
}

export function runDaemonFromCLI() {
  const mins = Deno.args[1] || "5";
  const downloadsPerRun = Deno.args[2] ? parseInt(Deno.args[2]) : 3;
  startDaemon(parseInt(mins), downloadsPerRun);
}

if (import.meta.main) {
  runDaemonFromCLI();
}
