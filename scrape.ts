import { DOMParser, Element } from "deno-dom";
import { Logger, LogOutput } from "./logger.ts";
import { addURLs } from "./download.ts";
import { loadScrapeRules, ScrapeRule } from "./config.ts";

const logger = new Logger([LogOutput.stdout]);

interface ScrapeOptions {
  url: string;
  pattern: string;
  selector: string;
  dryRun: boolean;
}

function parsePattern(pattern: string): (href: string) => boolean {
  // If pattern looks like /regex/ or /regex/i, treat as regex
  const regexMatch = pattern.match(/^\/(.+)\/([gimsuy]*)$/);
  if (regexMatch) {
    const re = new RegExp(regexMatch[1], regexMatch[2]);
    return (href) => re.test(href);
  }
  // Otherwise substring match
  return (href) => href.includes(pattern);
}

export async function scrapeURLs(
  pageURL: string,
  selector: string,
  filter: (href: string) => boolean,
): Promise<string[]> {
  const res = await fetch(pageURL, {
    headers: { "User-Agent": "dlm scraper" },
  });
  if (!res.ok) {
    throw new Error(
      `Failed to fetch ${pageURL}: ${res.status} ${res.statusText}`,
    );
  }
  const html = await res.text();
  const doc = new DOMParser().parseFromString(html, "text/html");
  if (!doc) throw new Error("Failed to parse HTML");

  const anchors = [...doc.querySelectorAll(selector)] as Element[];
  const urls = anchors
    .map((a) => a.getAttribute("href"))
    .filter((href): href is string => href != null && href !== "")
    .map((href) => {
      try {
        return new URL(href, pageURL).href;
      } catch {
        return null;
      }
    })
    .filter((url): url is string => url != null)
    .filter(filter);

  // Dedupe preserving order
  return [...new Set(urls)];
}

function findRule(
  rules: Record<string, ScrapeRule>,
  hostname: string,
): ScrapeRule | null {
  // Try exact match first, then check if hostname ends with a rule key
  // so "example.com" matches "www.example.com"
  for (const [domain, rule] of Object.entries(rules)) {
    if (hostname === domain || hostname.endsWith("." + domain)) {
      return rule;
    }
  }
  return null;
}

function parseArgs(args: string[]): ScrapeOptions {
  const url = args[0];
  if (!url) {
    logger.error(
      "Usage: dlm scrape <url> [pattern] [--selector <sel>] [--dry-run]",
    );
    Deno.exit(1);
  }

  let pattern = "";
  let selector = "";
  let dryRun = false;

  const rest = args.slice(1);
  for (let i = 0; i < rest.length; i++) {
    if (rest[i] === "--selector" && rest[i + 1]) {
      selector = rest[++i];
    } else if (rest[i] === "--dry-run") {
      dryRun = true;
    } else if (!pattern) {
      pattern = rest[i];
    }
  }

  return { url, pattern, selector, dryRun };
}

export async function runScrape(args: string[]) {
  const opts = parseArgs(args);

  // Look up saved rule by hostname
  let hostname: string;
  try {
    hostname = new URL(opts.url).hostname;
  } catch {
    logger.error(`Invalid URL: ${opts.url}`);
    Deno.exit(1);
  }

  const rules = await loadScrapeRules();
  const rule = findRule(rules, hostname);

  // CLI args override saved rule; saved rule fills in gaps
  const pattern = opts.pattern || rule?.pattern;
  const selector = opts.selector || rule?.selector || "a[href]";

  if (!pattern) {
    if (rule) {
      logger.error(`Saved rule for ${hostname} has no pattern`);
    } else {
      logger.error(`No saved rule for ${hostname} and no pattern given`);
      logger.error(
        "Usage: dlm scrape <url> [pattern] [--selector <sel>] [--dry-run]",
      );
    }
    Deno.exit(1);
  }

  const filter = parsePattern(pattern);

  logger.log(`Scraping ${opts.url}`);
  if (rule && !opts.pattern) {
    logger.log(`Using saved rule for ${hostname}`);
  }
  logger.log(`Pattern: ${pattern}`);
  if (selector !== "a[href]") {
    logger.log(`Selector: ${selector}`);
  }

  const urls = await scrapeURLs(opts.url, selector, filter);

  if (urls.length === 0) {
    logger.log("No matching URLs found.");
    return;
  }

  logger.log(`Found ${urls.length} URLs:`);
  for (const u of urls) {
    logger.log(`  ${u}`);
  }

  if (opts.dryRun) {
    logger.log("(dry run, not adding to DLM)");
    return;
  }

  await addURLs(urls);
  logger.log(`Added ${urls.length} URLs to DLM.`);
}
