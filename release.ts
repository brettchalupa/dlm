/**
 * Compiles dlm for all supported platforms.
 *
 * Usage:
 *   deno task release
 */

import denoConfig from "./deno.json" with { type: "json" };

const version = denoConfig.version;

if (version.includes("-dev")) {
  console.error(
    `Version is ${version} — update deno.json to remove the -dev suffix before releasing.`,
  );
  Deno.exit(1);
}

const targets = [
  { target: "x86_64-unknown-linux-gnu", name: `dlm-${version}-linux-x86_64` },
  {
    target: "aarch64-unknown-linux-gnu",
    name: `dlm-${version}-linux-aarch64`,
  },
  {
    target: "x86_64-apple-darwin",
    name: `dlm-${version}-darwin-x86_64`,
  },
  {
    target: "aarch64-apple-darwin",
    name: `dlm-${version}-darwin-aarch64`,
  },
  {
    target: "x86_64-pc-windows-msvc",
    name: `dlm-${version}-windows-x86_64.exe`,
  },
];

const outDir = "dist";

try {
  await Deno.remove(outDir, { recursive: true });
} catch {
  // dir doesn't exist, that's fine
}
await Deno.mkdir(outDir);

console.log(`Building dlm ${version} for ${targets.length} targets...\n`);

for (const { target, name } of targets) {
  const outPath = `${outDir}/${name}`;
  console.log(`Compiling ${target} → ${outPath}`);

  const cmd = new Deno.Command("deno", {
    args: ["compile", "-A", "--target", target, "--output", outPath, "main.ts"],
    stdout: "inherit",
    stderr: "inherit",
  });

  const { code } = await cmd.output();

  if (code !== 0) {
    console.error(`\nFailed to compile for ${target} (exit code ${code})`);
    Deno.exit(1);
  }
}

console.log(`\nDone! Binaries are in ${outDir}/`);

for await (const entry of Deno.readDir(outDir)) {
  const stat = await Deno.stat(`${outDir}/${entry.name}`);
  const sizeMB = (stat.size / 1024 / 1024).toFixed(1);
  console.log(`  ${entry.name}  (${sizeMB} MB)`);
}
