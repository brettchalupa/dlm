/**
 * TODO
 * - download logic based on config
 * - generic db with URL tracking historically
 * - http api
 * - better web interface
 * - test putting on different disks to see if that works
 * - port from config
 */

import { runDaemonFromCLI, startDaemon } from "./daemon.ts";
import { Logger } from "./logger.ts";
import {
  addURLs,
  countDownloads,
  downloadDownloads,
  DownloadStatus,
  selectDownloads,
} from "./download.ts";
import { runWebServer } from "./web.ts";

const logger = new Logger();

export async function runServerCLI() {
  const command = Deno.args[0];

  switch (command) {
    case undefined:
      logger.log("dlm_server");
      logger.log("Commands:");
      logger.log("\tserve");
      logger.log("\tcount");
      logger.log("\tadd");
      logger.log("\tdl");
      logger.log("\tdl LIMIT");
      logger.log("\tdd DELAY - daemon download every N minutes");
      break;
    case "add": {
      let urls: string[] = Deno.args.slice(1);

      const decoder = new TextDecoder();

      if (urls[0] === "-") {
        urls = urls.slice(1);
        for await (const chunk of Deno.stdin.readable) {
          const text = decoder.decode(chunk);
          urls = [
            ...urls,
            ...text.trim().split("\n"),
          ];
        }
      }

      if (urls.length === 0) {
        logger.error("No URLs provided");
        Deno.exit(1);
      }

      addURLs(urls);
      break;
    }
    case "dl": {
      const limitArg = Deno.args[1];
      let limit = 0;
      if (limitArg) {
        limit = Number.parseInt(limitArg);
      }
      const downloads = selectDownloads(limit, DownloadStatus.pending);
      downloadDownloads(downloads);
      break;
    }
    case "count": {
      const counts = countDownloads();
      logger.log(
        `downloads in db:\n${
          counts.map((c) => `${c.status}: ${c.count}`).join("\n")
        }`,
      );
      break;
    }
    case "serve": {
      if (Deno.args[1] == "--with-daemon") {
        startDaemon(2, 2);
      }
      runWebServer();
      break;
    }
    case "dd": {
      runDaemonFromCLI();
      break;
    }
    default:
      logger.error(`Unsupported command: ${command}`);
      Deno.exit(1);
  }
}

if (import.meta.main) {
  runServerCLI();
}
