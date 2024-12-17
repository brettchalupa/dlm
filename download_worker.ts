/// <reference lib="webworker" />

import { downloadDownload } from "./download.ts";
import { Logger } from "./logger.ts";

self.onmessage = async (e) => {
  const download = e.data.download;
  const logger = new Logger();
  logger.debug("download worker running");

  // TODO: ensure `e.data.download` is present and matches the interface
  await downloadDownload(download);
  postMessage(`done downloading download id: ${download.id}`);
  self.close();
};
