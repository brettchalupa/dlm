import { assertEquals } from "https://deno.land/std@0.220.0/testing/asserts.ts";
import { startDaemon } from "./daemon.ts";

Deno.test("daemon worker starts successfully", async () => {
  let workerReady = false;
  let workerStarted = false;

  // Start the daemon with short interval for testing
  const worker = startDaemon(1, 1);

  // Create a promise that resolves when worker is ready and started
  const workerPromise = new Promise<void>((resolve) => {
    const originalListener = worker.onmessage;
    worker.onmessage = (event) => {
      if (originalListener) originalListener.call(worker, event);

      const { type } = event.data;
      if (type === "ready") {
        workerReady = true;
      } else if (type === "started") {
        workerStarted = true;
        resolve();
      }
    };
  });

  // Wait for worker to be ready and started
  await workerPromise;

  // Verify worker states
  assertEquals(workerReady, true, "Worker should be ready");
  assertEquals(workerStarted, true, "Worker should be started");

  // Clean up
  worker.terminate();
});

Deno.test("daemon worker handles multiple intervals", async () => {
  const statusMessages: string[] = [];

  // Start the daemon with very short interval for testing
  const worker = startDaemon(0.01, 1); // 0.6 seconds

  // Track status messages
  const statusPromise = new Promise<void>((resolve) => {
    let messageCount = 0;
    const originalListener = worker.onmessage;
    worker.onmessage = (event) => {
      if (originalListener) originalListener.call(worker, event);

      const { type, message } = event.data;
      if (type === "status") {
        statusMessages.push(message);
        messageCount++;
        if (messageCount >= 2) {
          resolve();
        }
      }
    };
  });

  // Wait for at least 2 status messages
  await statusPromise;

  // Verify we received status messages
  assertEquals(
    statusMessages.length >= 2,
    true,
    "Should receive at least 2 status messages",
  );
  assertEquals(
    statusMessages.every((msg) => msg.includes("Completed processing")),
    true,
    "All status messages should indicate completion",
  );

  // Clean up
  worker.terminate();
});

Deno.test("daemon worker handles errors gracefully", async () => {
  let errorHandled = false;

  const worker = startDaemon(1, 1);

  // Set up error handler
  worker.onerror = (error) => {
    errorHandled = true;
  };

  // Wait a bit to ensure worker is set up
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Worker should be running without errors
  assertEquals(
    errorHandled,
    false,
    "No errors should occur during normal operation",
  );

  // Clean up
  worker.terminate();
});
