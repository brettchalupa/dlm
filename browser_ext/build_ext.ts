#!/usr/bin/env -S deno run --allow-read --allow-write --allow-run

// Build script for DLM browser extensions
// This script packages the extensions for distribution using Deno

import { ensureDir, exists } from "https://deno.land/std@0.208.0/fs/mod.ts";
import { join } from "https://deno.land/std@0.208.0/path/join.ts";
import { copy } from "https://deno.land/std@0.208.0/fs/copy.ts";

// Colors for console output
const colors = {
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  reset: "\x1b[0m",
} as const;

function log(color: keyof typeof colors, message: string): void {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function success(message: string): void {
  log("green", `✅ ${message}`);
}

function error(message: string): void {
  log("red", `❌ ${message}`);
}

function _warning(message: string): void {
  log("yellow", `⚠️  ${message}`);
}

function info(message: string): void {
  log("blue", `ℹ️  ${message}`);
}

function header(message: string): void {
  log("cyan", `🔧 ${message}`);
}

const EXTENSION_DIR = "src";
const EXTENSION_NAME = "dlm-extension";

const BUILD_DIR = "build";
const EXCLUDE_FILES = ["README.md", "*.sh", "*.ts"];

// Function to create zip package
async function createPackage(
  sourceDir: string,
  outputName: string,
  _description: string,
): Promise<boolean> {
  try {
    info(`📦 Packaging ${outputName}...`);

    // Create temporary directory
    const tempDir = await Deno.makeTempDir({ prefix: "dlm_build_" });

    try {
      // Copy source files to temp directory
      await copy(sourceDir, tempDir, {
        overwrite: true,
      });

      // Remove excluded files
      for (const pattern of EXCLUDE_FILES) {
        try {
          if (pattern.includes("*")) {
            // Handle glob patterns (simplified)
            const files = [];
            for await (const entry of Deno.readDir(tempDir)) {
              if (entry.isFile) {
                const extension = pattern.replace("*", "");
                if (entry.name.endsWith(extension)) {
                  files.push(entry.name);
                }
              }
            }
            for (const file of files) {
              await Deno.remove(join(tempDir, file));
            }
          } else {
            const filePath = join(tempDir, pattern);
            if (await exists(filePath)) {
              await Deno.remove(filePath);
            }
          }
        } catch {
          // Ignore errors for non-existent files
        }
      }

      // Create zip package using system zip command
      const outputPath = join(Deno.cwd(), BUILD_DIR, outputName);
      const zipCommand = new Deno.Command("zip", {
        args: ["-r", outputPath, "."],
        cwd: tempDir,
        stdout: "piped",
        stderr: "piped",
      });

      const zipResult = await zipCommand.output();

      if (zipResult.success) {
        success(`Created ${outputPath}`);
        return true;
      } else {
        const errorText = new TextDecoder().decode(zipResult.stderr);
        const outputText = new TextDecoder().decode(zipResult.stdout);
        error(`Failed to create ${outputName}:`);
        if (errorText) console.log(`  stderr: ${errorText}`);
        if (outputText) console.log(`  stdout: ${outputText}`);
        console.log(`  exit code: ${zipResult.code}`);
        return false;
      }
    } finally {
      // Cleanup temp directory
      await Deno.remove(tempDir, { recursive: true });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    error(`Error creating package ${outputName}: ${message}`);
    return false;
  }
}

// Function to validate manifest
async function validateManifest(
  manifestFile: string,
  browser: string,
): Promise<boolean> {
  try {
    if (!(await exists(manifestFile))) {
      error(`Manifest not found: ${manifestFile}`);
      return false;
    }

    // Basic JSON validation
    const content = await Deno.readTextFile(manifestFile);
    const manifest = JSON.parse(content);

    // Check required fields
    const requiredFields = ["name", "version", "manifest_version"];
    for (const field of requiredFields) {
      if (!manifest[field]) {
        error(`${browser} manifest missing required field: ${field}`);
        return false;
      }
    }

    success(`Validated ${browser} manifest`);
    return true;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    error(`Invalid ${browser} manifest: ${message}`);
    return false;
  }
}

// Function to get file list from zip
async function getZipContents(zipPath: string): Promise<string[]> {
  try {
    const listCommand = new Deno.Command("unzip", {
      args: ["-l", zipPath],
      stdout: "piped",
      stderr: "piped",
    });

    const result = await listCommand.output();
    if (result.success) {
      const output = new TextDecoder().decode(result.stdout);
      const lines = output.split("\n");
      const files: string[] = [];

      for (const line of lines) {
        // Extract filename from unzip -l output
        const match = line.match(
          /\s+\d+\s+\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}\s+(.+)$/,
        );
        if (match && match[1] && !match[1].endsWith("/")) {
          const filename = match[1].trim();
          if (filename.match(/\.(js|html|json|png)$/)) {
            files.push(filename);
          }
        }
      }
      return files;
    }
    return [];
  } catch {
    return [];
  }
}

// Main build function
async function buildExtensions(): Promise<boolean> {
  header("Building DLM Browser Extension...");

  // Create build directory
  await ensureDir(BUILD_DIR);

  if (!(await exists(EXTENSION_DIR))) {
    error(`Extension directory not found: ${EXTENSION_DIR}`);
    return false;
  }

  info(`🏗️  Building extension...`);

  // Validate manifest
  const manifestPath = join(EXTENSION_DIR, "manifest.json");
  const manifestValid = await validateManifest(manifestPath, "Extension");
  if (!manifestValid) {
    return false;
  }

  // Create zip package
  const zipName = `${EXTENSION_NAME}.zip`;
  const packageSuccess = await createPackage(
    EXTENSION_DIR,
    zipName,
    "Cross-browser extension package",
  );
  if (!packageSuccess) {
    return false;
  }

  // Create Firefox .xpi version
  const xpiName = `${EXTENSION_NAME}.xpi`;
  const zipPath = join(BUILD_DIR, zipName);
  const xpiPath = join(BUILD_DIR, xpiName);

  try {
    await copy(zipPath, xpiPath, { overwrite: true });
    success(`Created ${xpiPath}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    error(`Failed to create .xpi file: ${message}`);
  }

  // Get package contents for summary
  const files = await getZipContents(zipPath);
  const packageInfo = [{ name: zipName, files }];

  // Build summary
  console.log("");
  success("🎉 Build complete! Packages created in build/:");

  try {
    const buildEntries = [];
    for await (const entry of Deno.readDir(BUILD_DIR)) {
      if (entry.isFile) {
        const stat = await Deno.stat(join(BUILD_DIR, entry.name));
        const size = Math.round(stat.size / 1024);
        buildEntries.push(`${entry.name} (${size}KB)`);
      }
    }
    console.log("   " + buildEntries.join("\n   "));
  } catch {
    // Ignore directory listing errors
  }

  // Usage instructions
  console.log("");
  info("📋 Next steps:");
  console.log("   • Test packages in target browsers");
  console.log(
    "   • Chrome/Edge: Load dlm-extension.zip as unpacked extension",
  );
  console.log(
    "   • Firefox: Install dlm-extension.xpi as temporary add-on",
  );
  console.log(
    "   • For distribution: Submit .zip to Chrome Web Store, .xpi to Firefox Add-ons",
  );

  // Package contents summary
  if (packageInfo.length > 0) {
    console.log("");
    info("🔍 Package contents:");
    for (const pkg of packageInfo) {
      console.log(`   ${pkg.name}:`);
      for (const file of pkg.files.slice(0, 10)) { // Limit to first 10 files
        console.log(`     ${file}`);
      }
      if (pkg.files.length > 10) {
        console.log(`     ... and ${pkg.files.length - 10} more files`);
      }
    }
  }

  return true;
}

// Main execution
if (import.meta.main) {
  try {
    const success = await buildExtensions();
    Deno.exit(success ? 0 : 1);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    error(`Build failed: ${message}`);
    Deno.exit(1);
  }
}

// Export for module usage
export { buildExtensions };
