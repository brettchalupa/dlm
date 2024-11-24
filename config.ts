import { parse as parseYAML } from "jsr:@std/yaml";
import { Collection, CollectionBase } from "./collection.ts";
import { Logger } from "./logger.ts";

const logger = new Logger();

interface Config {
  collections: Record<string, CollectionBase>;
}

export async function loadCollectonsFromConfig(
  file: string = "dlm.yml",
): Promise<Collection[]> {
  const parsedConfig = parseYAML(await Deno.readTextFile(file));
  const config = validateConfig(parsedConfig);
  return Object.entries(config.collections).map(
    ([name, base]) => {
      return {
        name: name,
        ...base,
      };
    },
  );
}

// TODO: make this more robust
function validateConfig(parsedConfig: unknown): Config {
  if (parsedConfig && Object.entries(parsedConfig)) {
    return parsedConfig as Config;
  } else {
    logger.error("config is invalid");
    Deno.exit(1);
  }
}
