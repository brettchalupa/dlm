#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

version=$(deno eval "const m = JSON.parse(await Deno.readTextFile('browser_ext/src/manifest.json')); console.log(m.version)")

if [[ "$version" == *-dev ]]; then
  echo "Error: version is $version — remove the -dev suffix in browser_ext/src/manifest.json first."
  exit 1
fi

tag="browser-ext-v$version"

echo "Releasing browser extension $tag"
echo ""

# Preflight
echo "Running checks..."
deno task ok
echo ""

# Build extension
echo "Building extension..."
deno task build_ext
echo ""

# Tag and push
echo "Tagging $tag..."
git tag "$tag"
git push origin main --tags

# Create GitHub release
echo "Creating GitHub release..."
gh release create "$tag" \
  browser_ext/build/dlm-extension.zip \
  browser_ext/build/dlm-extension.xpi \
  --title "Browser Extension $version" \
  --notes "Browser extension for Chrome, Firefox, and Edge. Install the .zip in Chrome/Edge or the .xpi in Firefox."

echo ""
echo "Done! Release: https://github.com/brettchalupa/dlm/releases/tag/$tag"
echo ""
echo "AMO: https://addons.mozilla.org/en-US/firefox/addon/dlm-download-manager/"
echo "Upload the new version there too if needed."
