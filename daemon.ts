import { downloadVideos } from "./videos.ts";

function minutesToMilli(minutes: number): number {
  return 1000 * 60 * minutes;
}

async function runDaemon() {
  console.log("running daemon", new Date());
  await downloadVideos(2);
}

export function startDaemon() {
  const delay = minutesToMilli(parseInt(Deno.args[1] || "5"));
  console.log(`running daemon every ${Deno.args[1]} minutes`);
  runDaemon();
  setInterval(runDaemon, delay);
}

if (import.meta.main) {
  startDaemon();
}
