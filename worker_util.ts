// deno-lint-ignore no-explicit-any
export function spawnWorker(workerFile: string, message: any) {
  const worker = new Worker(
    new URL(workerFile, import.meta.url).href,
    {
      type: "module",
    },
  );

  worker.onmessage = (e) => {
    console.log("main thread received:", e.data);
  };

  worker.postMessage(message);

  return worker;
}
