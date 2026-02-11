#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

version=$(deno eval "import c from './deno.json' with {type:'json'}; console.log(c.version)")

if [[ "$version" == *-dev ]]; then
  echo "Error: version is $version — remove the -dev suffix in deno.json first."
  exit 1
fi

tag="v$version"

echo "Releasing dlm $tag"
echo ""

# Preflight
echo "Running checks..."
deno task ok
echo ""

# Build binaries
echo "Compiling binaries..."
deno task release
echo ""

# Tag and push
echo "Tagging $tag..."
git tag "$tag"
git push origin main --tags

# Create GitHub release
echo "Creating GitHub release..."
gh release create "$tag" dist/* \
  --title "$tag" \
  --notes "See [CHANGELOG.md](https://github.com/brettchalupa/dlm/blob/main/CHANGELOG.md) for details."

echo ""
echo "Done! Release: https://github.com/brettchalupa/dlm/releases/tag/$tag"
echo ""
echo "Post-release steps:"
echo "  1. Bump version in deno.json to next -dev"
echo "  2. Add [Unreleased] section to CHANGELOG.md"
echo "  3. Commit: git commit -am 'Bump to next dev version'"
