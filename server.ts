import { startDaemon } from "./daemon.ts";
import { Logger } from "./logger.ts";
import { addVideos, countVideos, downloadVideos } from "./videos.ts";
import { runWebServer } from "./web.ts";

const logger = new Logger();

export async function runServerCLI() {
  const command = Deno.args[0];

  switch (command) {
    case undefined:
      logger.log("dlm_server");
      logger.log("Commands:");
      logger.log("serve");
      logger.log("count");
      logger.log("add");
      logger.log("dl");
      logger.log("dl LIMIT");
      logger.log("dd DELAY - daemon download every N minutes");
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

      addVideos(urls);
      break;
    }
    case "dl": {
      const limitArg = Deno.args[1];
      let limit = 0;
      if (limitArg) {
        limit = Number.parseInt(limitArg);
      }
      downloadVideos(limit);
      break;
    }
    case "count": {
      const count = countVideos();
      logger.log(`videos in db: ${count}`);
      break;
    }
    case "serve": {
      runWebServer();
      break;
    }
    case "dd": {
      startDaemon();
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
