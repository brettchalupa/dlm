// Test script for DLM browser extensions
// This script validates the extension files and basic functionality using Deno

import { exists } from "https://deno.land/std@0.208.0/fs/exists.ts";
import { join } from "https://deno.land/std@0.208.0/path/join.ts";

// Test configuration
const EXTENSION_DIR = "src";

const REQUIRED_FILES = [
  "manifest.json",
  "background.js",
  "options.html",
  "options.js",
  "icon.png",
];

// Colors for console output
const colors = {
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  reset: "\x1b[0m",
} as const;

// Utility functions
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

// Test functions
async function testFileExists(filePath: string): Promise<boolean> {
  return await exists(filePath);
}

async function testJsonValid(filePath: string): Promise<boolean> {
  try {
    const content = await Deno.readTextFile(filePath);
    JSON.parse(content);
    return true;
  } catch {
    return false;
  }
}

interface ManifestTest {
  check: boolean;
  name: string;
}

async function testManifestValid(
  filePath: string,
  expectedVersion: number,
): Promise<ManifestTest[]> {
  try {
    const content = await Deno.readTextFile(filePath);
    const manifest = JSON.parse(content);

    const tests: ManifestTest[] = [
      {
        check: manifest.manifest_version === expectedVersion,
        name: `manifest_version is ${expectedVersion}`,
      },
      {
        check: manifest.name && manifest.name.length > 0,
        name: "has name",
      },
      {
        check: manifest.version && manifest.version.length > 0,
        name: "has version",
      },
      {
        check: Array.isArray(manifest.permissions),
        name: "has permissions array",
      },
      {
        check: manifest.permissions?.includes("storage"),
        name: "has storage permission",
      },
    ];

    return tests;
  } catch {
    return [{ check: false, name: "valid JSON" }];
  }
}

async function testJavaScriptSyntax(filePath: string): Promise<boolean> {
  try {
    const content = await Deno.readTextFile(filePath);

    // Basic syntax checks
    const openBraces = (content.match(/\{/g) || []).length;
    const closeBraces = (content.match(/\}/g) || []).length;
    const openParens = (content.match(/\(/g) || []).length;
    const closeParens = (content.match(/\)/g) || []).length;

    const hasValidBrackets = openBraces === closeBraces;
    const hasValidParens = openParens === closeParens;
    const hasNoSyntaxErrors = !content.includes("Syntax Error") &&
      !content.includes("SyntaxError");

    return hasValidBrackets && hasValidParens && hasNoSyntaxErrors;
  } catch {
    return false;
  }
}

async function testHTMLValid(filePath: string): Promise<boolean> {
  try {
    const content = await Deno.readTextFile(filePath);

    // Basic HTML validation
    const hasDoctype = content.includes("<!DOCTYPE") ||
      content.includes("<!doctype");
    const hasHtmlTags = content.includes("<html") &&
      content.includes("</html>");
    const hasHeadTags = content.includes("<head") &&
      content.includes("</head>");
    const hasBodyTags = content.includes("<body") &&
      content.includes("</body>");

    return hasDoctype && hasHtmlTags && hasHeadTags && hasBodyTags;
  } catch {
    return false;
  }
}

// Main test function
async function testExtension(): Promise<boolean> {
  info(`Testing extension (${EXTENSION_DIR})`);

  if (!(await exists(EXTENSION_DIR))) {
    error(`Directory ${EXTENSION_DIR} does not exist`);
    return false;
  }

  let allTestsPassed = true;

  // Test required files exist
  for (const file of REQUIRED_FILES) {
    const filePath = join(EXTENSION_DIR, file);
    if (await testFileExists(filePath)) {
      success(`${file} exists`);
    } else {
      error(`${file} is missing`);
      allTestsPassed = false;
    }
  }

  // Test manifest.json
  const manifestPath = join(EXTENSION_DIR, "manifest.json");
  if (await testFileExists(manifestPath)) {
    if (await testJsonValid(manifestPath)) {
      success("manifest.json is valid JSON");

      // Extension uses Manifest v2 for cross-browser compatibility
      const manifestTests = await testManifestValid(manifestPath, 2);

      for (const test of manifestTests) {
        if (test.check) {
          success(`manifest.json ${test.name}`);
        } else {
          error(`manifest.json ${test.name} - FAILED`);
          allTestsPassed = false;
        }
      }
    } else {
      error("manifest.json is invalid JSON");
      allTestsPassed = false;
    }
  }

  // Test JavaScript files
  const jsFiles = ["background.js", "options.js", "polyfill.js"];
  for (const file of jsFiles) {
    const filePath = join(EXTENSION_DIR, file);
    if (await testFileExists(filePath)) {
      if (await testJavaScriptSyntax(filePath)) {
        success(`${file} has valid syntax`);
      } else {
        error(`${file} has syntax errors`);
        allTestsPassed = false;
      }
    }
  }

  // Test HTML files
  const htmlFiles = ["options.html"];
  for (const file of htmlFiles) {
    const filePath = join(EXTENSION_DIR, file);
    if (await testFileExists(filePath)) {
      if (await testHTMLValid(filePath)) {
        success(`${file} is valid HTML`);
      } else {
        error(`${file} has HTML errors`);
        allTestsPassed = false;
      }
    }
  }

  // Test polyfill exists (required for universal extension)
  const polyfillPath = join(EXTENSION_DIR, "polyfill.js");
  if (await testFileExists(polyfillPath)) {
    success("polyfill.js exists for cross-browser compatibility");
  } else {
    error("polyfill.js is missing - required for cross-browser compatibility");
    allTestsPassed = false;
  }

  console.log(""); // Empty line for readability
  return allTestsPassed;
}

// Test API configuration functionality
async function testAPIConfiguration(): Promise<boolean> {
  info("Testing API configuration functionality");

  let allTestsPassed = true;

  const optionsPath = join(EXTENSION_DIR, "options.js");
  if (await testFileExists(optionsPath)) {
    const content = await Deno.readTextFile(optionsPath);

    // Check for required functions
    const requiredFunctions = ["loadSettings", "saveSettings", "isValidUrl"];
    for (const func of requiredFunctions) {
      if (
        content.includes(`function ${func}`) ||
        content.includes(`${func} =`)
      ) {
        success(`${func} function found`);
      } else {
        error(`${func} function missing`);
        allTestsPassed = false;
      }
    }

    // Check for storage API usage
    if (
      content.includes("storage.sync.get") ||
      content.includes("storage.sync.set")
    ) {
      success("Uses storage API correctly");
    } else {
      error("Storage API usage not found");
      allTestsPassed = false;
    }
  } else {
    error("options.js not found");
    allTestsPassed = false;
  }

  console.log("");
  return allTestsPassed;
}

// Run all tests
async function runAllTests(): Promise<boolean> {
  console.log("🧪 Running DLM Extension Tests\n");

  let overallSuccess = true;

  // Test the extension
  const extensionResult = await testExtension();
  overallSuccess = overallSuccess && extensionResult;

  // Test API functionality
  const apiResult = await testAPIConfiguration();
  overallSuccess = overallSuccess && apiResult;

  // Final summary
  console.log("=".repeat(50));
  if (overallSuccess) {
    success("All tests passed! Extension is ready for use.");
  } else {
    error("Some tests failed. Please fix the issues above.");
  }
  console.log("=".repeat(50));

  return overallSuccess;
}

// Main execution
if (import.meta.main) {
  const success = await runAllTests();
  Deno.exit(success ? 0 : 1);
}

// Export functions for module usage
export { runAllTests, testAPIConfiguration, testExtension };
