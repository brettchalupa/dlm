import { assertEquals } from "@std/testing/asserts";
import { parseUrls } from "./urls.ts";

Deno.test("parseUrls handles newline-separated string", () => {
  const result = parseUrls("https://a.com\nhttps://b.com\nhttps://c.com");
  assertEquals(result, ["https://a.com", "https://b.com", "https://c.com"]);
});

Deno.test("parseUrls handles comma-separated string", () => {
  const result = parseUrls("https://a.com,https://b.com");
  assertEquals(result, ["https://a.com", "https://b.com"]);
});

Deno.test("parseUrls handles mixed newline and comma separators", () => {
  const result = parseUrls("https://a.com,https://b.com\nhttps://c.com");
  assertEquals(result, ["https://a.com", "https://b.com", "https://c.com"]);
});

Deno.test("parseUrls handles array input", () => {
  const result = parseUrls(["https://a.com", "https://b.com"]);
  assertEquals(result, ["https://a.com", "https://b.com"]);
});

Deno.test("parseUrls trims whitespace from array items", () => {
  const result = parseUrls(["  https://a.com  ", "  https://b.com "]);
  assertEquals(result, ["https://a.com", "https://b.com"]);
});

Deno.test("parseUrls trims whitespace from string input", () => {
  const result = parseUrls("  https://a.com  \n  https://b.com  ");
  assertEquals(result, ["https://a.com", "https://b.com"]);
});

Deno.test("parseUrls filters empty strings", () => {
  const result = parseUrls("https://a.com\n\n\nhttps://b.com\n");
  assertEquals(result, ["https://a.com", "https://b.com"]);
});

Deno.test("parseUrls filters empty array items", () => {
  const result = parseUrls(["https://a.com", "", "  ", "https://b.com"]);
  assertEquals(result, ["https://a.com", "https://b.com"]);
});

Deno.test("parseUrls returns empty array for null", () => {
  const result = parseUrls(null);
  assertEquals(result, []);
});

Deno.test("parseUrls returns empty array for undefined", () => {
  const result = parseUrls(undefined);
  assertEquals(result, []);
});

Deno.test("parseUrls returns empty array for number", () => {
  const result = parseUrls(42);
  assertEquals(result, []);
});

Deno.test("parseUrls returns empty array for empty string", () => {
  const result = parseUrls("");
  assertEquals(result, []);
});

Deno.test("parseUrls converts non-string array items to strings", () => {
  const result = parseUrls([123, "https://a.com"]);
  assertEquals(result, ["123", "https://a.com"]);
});
