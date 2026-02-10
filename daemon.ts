import { Logger } from "./logger.ts";
import { resetAllDownloadingDownloads } from "./download.ts";

const logger = new Logger();

export function startDaemon(mins: number, downloadsPerRun: number) {
  // Create a new web worker
  const worker = new Worker(
    new URL("./daemon.worker.ts", import.meta.url).href,
    { type: "module" },
  );

  // Set up message handler
  worker.addEventListener("message", (event) => {
    const { type, message } = event.data;

    switch (type) {
      case "ready":
        logger.log("Daemon worker is ready");
        // Start the daemon
        worker.postMessage({
          type: "start",
          mins,
          downloadsPerRun,
        });
        break;
      case "started":
        logger.log(`Main thread: ${message}`);
        break;
      default:
        logger.log(`Unknown message type: ${type}`);
    }
  });

  // Handle worker errors
  worker.addEventListener("error", (error) => {
    logger.error("Worker error:", error);
  });

  return worker;
}

export function runDaemonFromCLI() {
  const mins = Deno.args[1] || "5";
  const downloadsPerRun = Deno.args[2] ? parseInt(Deno.args[2]) : 3;

  const worker = startDaemon(parseInt(mins), downloadsPerRun);

  // Keep the main thread alive
  logger.log("Daemon running in worker thread. Press Ctrl+C to stop.");

  let shutdownInProgress = false;

  function cleanup() {
    const resetCount = resetAllDownloadingDownloads();
    if (resetCount > 0) {
      logger.log(`Reset ${resetCount} downloading entries to pending`);
    }
    worker.terminate();
    Deno.exit(0);
  }

  // Listen for shutdown-ready from worker
  worker.addEventListener("message", (event) => {
    if (event.data.type === "shutdown-ready" && shutdownInProgress) {
      logger.log("Worker finished, shutting down");
      cleanup();
    }
  });

  // Handle graceful shutdown
  Deno.addSignalListener("SIGINT", () => {
    if (shutdownInProgress) {
      // Second Ctrl+C: force exit
      logger.log("Force shutdown");
      cleanup();
      return;
    }

    shutdownInProgress = true;
    logger.log("Shutting down daemon worker... (Ctrl+C again to force)");
    worker.postMessage({ type: "shutdown" });
  });
}

if (import.meta.main) {
  runDaemonFromCLI();
}
