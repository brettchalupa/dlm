import { assertEquals } from "@std/testing/asserts";
import { Collection, collectionForURL } from "./collection.ts";

const collections: Collection[] = [
  {
    name: "yt",
    domains: ["youtube.com", "youtu.be"],
    dir: "/tmp/yt",
    command: "yt-dlp %",
  },
  {
    name: "images",
    domains: ["imgur.com", "flickr.com"],
    dir: "/tmp/images",
    command: "gallery-dl %",
  },
  {
    name: "files",
    domains: ["example.com"],
    dir: "/tmp/files",
    command: "wget %",
  },
];

Deno.test("collectionForURL matches youtube.com", () => {
  const result = collectionForURL(
    collections,
    "https://www.youtube.com/watch?v=abc123",
  );
  assertEquals(result?.name, "yt");
});

Deno.test("collectionForURL matches youtu.be short URL", () => {
  const result = collectionForURL(collections, "https://youtu.be/abc123");
  assertEquals(result?.name, "yt");
});

Deno.test("collectionForURL matches second collection", () => {
  const result = collectionForURL(
    collections,
    "https://imgur.com/gallery/abc",
  );
  assertEquals(result?.name, "images");
});

Deno.test("collectionForURL returns null for unknown domain", () => {
  const result = collectionForURL(
    collections,
    "https://unknown-site.org/page",
  );
  assertEquals(result, null);
});

Deno.test("collectionForURL returns null for empty collections", () => {
  const result = collectionForURL([], "https://youtube.com/watch?v=abc");
  assertEquals(result, null);
});

Deno.test("collectionForURL returns first match when domains overlap", () => {
  const overlapping: Collection[] = [
    {
      name: "first",
      domains: ["example.com"],
      dir: "/tmp/a",
      command: "wget %",
    },
    {
      name: "second",
      domains: ["example.com"],
      dir: "/tmp/b",
      command: "curl %",
    },
  ];
  const result = collectionForURL(overlapping, "https://example.com/file");
  assertEquals(result?.name, "first");
});

Deno.test("collectionForURL matches subdomain URLs", () => {
  const result = collectionForURL(
    collections,
    "https://i.imgur.com/image.jpg",
  );
  assertEquals(result?.name, "images");
});
