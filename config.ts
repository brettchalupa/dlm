import { parse as parseYAML } from "@std/yaml";
import { Collection, CollectionBase } from "./collection.ts";
import { Logger } from "./logger.ts";

const logger = new Logger();

export interface ScrapeRule {
  pattern: string;
  selector?: string;
}

interface Config {
  collections: Record<string, CollectionBase>;
  scrape?: Record<string, ScrapeRule>;
}

async function loadConfig(file: string = "dlm.yml"): Promise<Config> {
  const parsedConfig = parseYAML(await Deno.readTextFile(file));
  return validateConfig(parsedConfig);
}

export async function loadCollectonsFromConfig(
  file: string = Deno.env.get("DLM_CONFIG") || "dlm.yml",
): Promise<Collection[]> {
  const config = await loadConfig(file);
  return Object.entries(config.collections).map(
    ([name, base]) => {
      return {
        name: name,
        ...base,
      };
    },
  );
}

export async function loadScrapeRules(
  file: string = "dlm.yml",
): Promise<Record<string, ScrapeRule>> {
  const config = await loadConfig(file);
  return config.scrape ?? {};
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
