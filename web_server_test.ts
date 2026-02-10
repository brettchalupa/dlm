import { assertEquals } from "@std/testing/asserts";
import { initDB } from "./download.ts";
import { createApp } from "./web.ts";

// Set up test DB and config before any tests run
const testDir = await Deno.makeTempDir({ prefix: "dlm_test_" });
const testDbPath = `${testDir}/dlm_test.db`;
const testConfigPath = `${testDir}/dlm.yml`;
Deno.env.set("DLM_DB", testDbPath);
Deno.env.set("DLM_CONFIG", testConfigPath);

await Deno.writeTextFile(
  testConfigPath,
  `collections:
  test:
    domains:
      - example.com
    dir: ${testDir}/downloads
    command: "echo %"
  videos:
    domains:
      - youtube.com
      - youtu.be
    dir: ${testDir}/videos
    command: "echo %"
`,
);

initDB();

const app = createApp();

// --- /api/system ---

Deno.test("GET /api/system returns system info", async () => {
  const res = await app.request("/api/system");
  assertEquals(res.status, 200);
  const json = await res.json();
  assertEquals(typeof json.memory.rss, "string");
  assertEquals(typeof json.version.deno, "string");
  assertEquals(typeof json.uptime, "string");
});

// --- /api/count ---

Deno.test("GET /api/count returns empty counts on fresh DB", async () => {
  const res = await app.request("/api/count");
  assertEquals(res.status, 200);
  const json = await res.json();
  assertEquals(json.statusGroups, []);
});

// --- /api/downloads ---

Deno.test("GET /api/downloads returns empty list on fresh DB", async () => {
  const res = await app.request("/api/downloads");
  assertEquals(res.status, 200);
  const json = await res.json();
  assertEquals(json.downloads, []);
});

// --- /api/add-urls + /api/downloads ---

Deno.test("POST /api/add-urls adds URLs and they appear in downloads", async () => {
  const res = await app.request("/api/add-urls", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ urls: ["https://example.com/file1.zip"] }),
  });
  assertEquals(res.status, 200);
  const json = await res.json();
  assertEquals(json.message, "Downloads being added to database.");

  // Wait briefly for async addURLs to process
  await new Promise((r) => setTimeout(r, 200));

  const dlRes = await app.request("/api/downloads");
  const dlJson = await dlRes.json();
  const found = dlJson.downloads.find(
    (d: { url: string }) => d.url === "https://example.com/file1.zip",
  );
  assertEquals(found?.status, "pending");
  assertEquals(found?.collection, "test");
});

// --- /api/count after adding ---

Deno.test("GET /api/count reflects added downloads", async () => {
  const res = await app.request("/api/count");
  assertEquals(res.status, 200);
  const json = await res.json();
  const pending = json.statusGroups.find(
    (g: { status: string }) => g.status === "pending",
  );
  assertEquals(pending?.count >= 1, true);
});

// --- /api/download/:id ---

Deno.test("GET /api/download/:id returns a download", async () => {
  const res = await app.request("/api/download/1");
  assertEquals(res.status, 200);
  const json = await res.json();
  assertEquals(json.download.id, 1);
  assertEquals(typeof json.download.url, "string");
});

Deno.test("GET /api/download/:id returns 404 for missing ID", async () => {
  const res = await app.request("/api/download/99999");
  assertEquals(res.status, 404);
});

// --- /api/status ---

Deno.test("GET /api/status returns download by URL", async () => {
  const res = await app.request(
    "/api/status?url=https://example.com/file1.zip",
  );
  assertEquals(res.status, 200);
  const json = await res.json();
  assertEquals(json.download?.url, "https://example.com/file1.zip");
});

Deno.test("GET /api/status returns 400 without url param", async () => {
  const res = await app.request("/api/status");
  assertEquals(res.status, 400);
});

Deno.test("GET /api/status returns null for unknown URL", async () => {
  const res = await app.request(
    "/api/status?url=https://unknown.com/nope",
  );
  assertEquals(res.status, 200);
  const json = await res.json();
  assertEquals(json.download, null);
});

// --- /api/upcoming ---

Deno.test("GET /api/upcoming returns pending downloads", async () => {
  const res = await app.request("/api/upcoming");
  assertEquals(res.status, 200);
  const json = await res.json();
  assertEquals(Array.isArray(json.downloads), true);
  for (const d of json.downloads) {
    assertEquals(d.status, "pending");
  }
});

// --- /api/recent ---

Deno.test("GET /api/recent returns recent downloads", async () => {
  const res = await app.request("/api/recent");
  assertEquals(res.status, 200);
  const json = await res.json();
  assertEquals(Array.isArray(json.downloads), true);
});

// --- /api/config ---

Deno.test("GET /api/config returns collections from config", async () => {
  const res = await app.request("/api/config");
  assertEquals(res.status, 200);
  const json = await res.json();
  assertEquals(json.collections.test.domains, ["example.com"]);
  assertEquals(json.collections.videos.domains, ["youtube.com", "youtu.be"]);
});

// --- /api/logs ---

Deno.test("GET /api/logs returns log entries", async () => {
  const res = await app.request("/api/logs");
  assertEquals(res.status, 200);
  const json = await res.json();
  assertEquals(Array.isArray(json.logs), true);
});

// --- /api/retry/:id ---

Deno.test("POST /api/retry/:id returns 404 for non-error download", async () => {
  const res = await app.request("/api/retry/1", { method: "POST" });
  assertEquals(res.status, 404);
});

// --- /api/retry-all-failed ---

Deno.test("POST /api/retry-all-failed returns count", async () => {
  const res = await app.request("/api/retry-all-failed", { method: "POST" });
  assertEquals(res.status, 200);
  const json = await res.json();
  assertEquals(typeof json.message, "string");
});

// --- /api/reset/:id ---

Deno.test("POST /api/reset/:id returns 404 for non-downloading item", async () => {
  const res = await app.request("/api/reset/1", { method: "POST" });
  assertEquals(res.status, 404);
});

// --- /api/reset-all-downloading ---

Deno.test("POST /api/reset-all-downloading returns count", async () => {
  const res = await app.request("/api/reset-all-downloading", {
    method: "POST",
  });
  assertEquals(res.status, 200);
  const json = await res.json();
  assertEquals(typeof json.message, "string");
});

// --- /api/redownload/:id ---

Deno.test("POST /api/redownload/:id returns 404 for non-success item", async () => {
  const res = await app.request("/api/redownload/1", { method: "POST" });
  assertEquals(res.status, 404);
});

// --- DELETE /api/download/:id ---

Deno.test("DELETE /api/download/:id deletes a download", async () => {
  // Add a URL to delete
  await app.request("/api/add-urls", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ urls: ["https://example.com/to-delete.zip"] }),
  });
  await new Promise((r) => setTimeout(r, 200));

  // Find the download
  const dlRes = await app.request("/api/downloads");
  const dlJson = await dlRes.json();
  const toDelete = dlJson.downloads.find(
    (d: { url: string }) => d.url === "https://example.com/to-delete.zip",
  );

  const res = await app.request(`/api/download/${toDelete.id}`, {
    method: "DELETE",
  });
  assertEquals(res.status, 200);
  const json = await res.json();
  assertEquals(json.message, "download deleted");

  // Verify it's gone
  const checkRes = await app.request(`/api/download/${toDelete.id}`);
  assertEquals(checkRes.status, 404);
});

Deno.test("DELETE /api/download/:id returns 404 for missing ID", async () => {
  const res = await app.request("/api/download/99999", { method: "DELETE" });
  assertEquals(res.status, 404);
});

// --- DELETE /api/delete-all-failed ---

Deno.test("DELETE /api/delete-all-failed returns count", async () => {
  const res = await app.request("/api/delete-all-failed", {
    method: "DELETE",
  });
  assertEquals(res.status, 200);
  const json = await res.json();
  assertEquals(typeof json.message, "string");
});

// --- GET / (web UI) ---

Deno.test("GET / returns HTML page", async () => {
  const res = await app.request("/");
  assertEquals(res.status, 200);
  const html = await res.text();
  assertEquals(html.includes("DLM"), true);
});

// --- Cleanup ---

Deno.test({
  name: "cleanup test files",
  fn: async () => {
    Deno.env.delete("DLM_DB");
    Deno.env.delete("DLM_CONFIG");
    await Deno.remove(testDir, { recursive: true });
  },
  sanitizeResources: false,
  sanitizeOps: false,
});
