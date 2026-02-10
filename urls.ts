export function parseUrls(rawUrls: unknown): string[] {
  if (Array.isArray(rawUrls)) {
    return rawUrls.map((u) => u.toString().trim()).filter((u) => u);
  }

  if (typeof rawUrls === "string") {
    return rawUrls
      .split("\n")
      .flatMap((u: string) => u.split(","))
      .map((u) => u.trim())
      .filter((u) => u);
  }

  return [];
}
