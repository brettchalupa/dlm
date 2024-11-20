function runCLI() {
  const command = Deno.args[0];

  switch (command) {
    case undefined:
      console.log("dlm cli");
      console.log("Commands:");
      console.log("count");
      console.log("add");
      console.log("list");
      console.log("dl LIMIT");
      console.log("delete ID");
      console.log("init");
      break;
    case "add": {
      addURLs();
      break;
    }
    case "init": {
      init();
      break;
    }
    case "dl": {
      downloadVideos();
      break;
    }
    case "ls": {
      listVideos();
      break;
    }
    case "del": {
      deleteVideo();
      break;
    }
    case "count": {
      countVideos();
      break;
    }
    default:
      console.error(`Unsupported command: ${command}`);
      Deno.exit(1);
  }
}

import { parse as parseTOML, stringify as stringifyTOML } from "jsr:@std/toml";

const configFile = "dlm.toml";

async function init(): Promise<void> {
  const apiURL = prompt("enter API URL:");
  if (apiURL == null) {
    console.error("API URL must be entered");
    Deno.exit(1);
  }
  const config = {
    api_url: apiURL,
  };
  const tomlConfig = stringifyTOML(config);
  await Deno.writeTextFile(configFile, tomlConfig);
  console.log(`dlm config written to ${configFile}`);
}

async function apiURL(): Promise<string> {
  try {
    const tomlText = await Deno.readTextFile(configFile);
    const config = parseTOML(tomlText);
    if (typeof config.api_url !== "string") {
      throw new Error(`api_url not properly configured in ${configFile}`);
    }
    return config.api_url;
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      console.error("dlm config not found, run `dlm init`");
      Deno.exit(1);
    } else {
      // otherwise re-throw
      throw error;
    }
  }
}

enum HTTPMethod {
  "GET" = "GET",
  "POST" = "POST",
  "DELETE" = "DELETE",
  "PUT" = "PUT",
}

async function myFetch(
  url: string,
  method: HTTPMethod,
  body: string | undefined = undefined,
) {
  return (await fetch(url, {
    method: method.toString(),
    headers: {
      "User-Agent": `dlm cli`,
    },
    body: body,
  })).json();
}
async function httpGet(path: string) {
  const url = await apiURL();
  return myFetch(url + path, HTTPMethod.GET);
}

async function httpPost(path: string, body: Record<string, unknown>) {
  const url = await apiURL();
  return myFetch(url + path, HTTPMethod.POST, JSON.stringify(body));
}

async function httpDelete(path: string) {
  const url = await apiURL();
  return myFetch(url + path, HTTPMethod.DELETE);
}

async function countVideos() {
  const res = await httpGet("/api/count");
  console.log(`${res["count"]} videos`);
}

async function downloadVideos() {
  const limitArg = Deno.args[1];
  let limit = 0;
  if (limitArg) {
    limit = Number.parseInt(limitArg);
  }
  const res = await httpPost("/api/download", { limit: limit });
  console.log(res["message"]);
}

async function addURLs() {
  let urls: string[] = Deno.args.slice(1);
  urls = urls.flatMap((url) => url.trim().split(","));

  const decoder = new TextDecoder();

  if (urls[0] === "-") {
    urls = urls.slice(1);
    for await (const chunk of Deno.stdin.readable) {
      const text = decoder.decode(chunk);
      urls = [
        ...urls,
        ...text.trim().split(/\\n|\\r|\\r\\n/).map((u) => u.trim()),
      ].flat();
    }
  }

  if (urls.length === 0) {
    console.error("No URLs provided");
  }

  urls = urls.map((u) => u.trim()).filter((u) => u !== "");
  const res = await httpPost("/api/add-urls", { urls });
  console.log(res);
}

async function deleteVideo() {
  const id = Deno.args[1];
  const res = await httpDelete(`/api/video/${id}`);
  console.log(res['message']);
}

async function listVideos() {
  const res = await httpGet(`/api/videos`);
  // TODO: render this as a nice table
  console.log(res['videos']);
}

if (import.meta.main) {
  runCLI();
}
