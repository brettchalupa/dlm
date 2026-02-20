import { Logger } from "./logger.ts";
import { resetAllDownloadingDownloads } from "./download.ts";

const logger = new Logger();

export function startDaemon(
  mins: number,
  downloadsPerRun: number,
): { worker: Worker; shutdown: () => Promise<void> } {
  // Create a new web worker
  const worker = new Worker(
    new URL("./daemon.worker.ts", import.meta.url).href,
    { type: "module" },
  );

  let shutdownResolve: (() => void) | null = null;

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
      case "shutdown-ready":
        logger.log("Worker finished, shutting down");
        if (shutdownResolve) shutdownResolve();
        break;
      default:
        logger.log(`Unknown message type: ${type}`);
    }
  });

  // Handle worker errors — prevent unhandled errors from crashing the process
  worker.addEventListener("error", (event) => {
    event.preventDefault();
    logger.error("Worker error:", event.message);
  });

  const shutdown = () => {
    return new Promise<void>((resolve) => {
      shutdownResolve = () => {
        worker.terminate();
        resolve();
      };
      worker.postMessage({ type: "shutdown" });
    });
  };

  return { worker, shutdown };
}

export function runDaemonFromCLI() {
  const mins = Deno.args[1] || "5";
  const downloadsPerRun = Deno.args[2] ? parseInt(Deno.args[2]) : 3;

  const { worker, shutdown } = startDaemon(parseInt(mins), downloadsPerRun);

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
    shutdown().then(() => cleanup());
  });
}

if (import.meta.main) {
  runDaemonFromCLI();
}
