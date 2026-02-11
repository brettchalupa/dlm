# Releasing dlm

This documents the release process for the core dlm application. The browser
extension and desktop apps are released separately.

## Version Scheme

dlm uses [Semantic Versioning](https://semver.org/). The version lives in
`deno.json` and is read at runtime by `main.ts`.

Between releases, the version has a `-dev` suffix (e.g. `0.2.0-dev`).

## Cutting a Release

### 1. Prepare the release

Update `deno.json` version (remove `-dev` suffix):

```json
"version": "0.1.0"
```

Update `CHANGELOG.md` -- replace `TBD` with today's date:

```markdown
## [0.1.0] - 2026-02-10
```

### 2. Run checks

```
deno task ok
```

Everything must pass.

### 3. Commit and tag

```
git add deno.json CHANGELOG.md
git commit -m "Release v0.1.0"
git tag v0.1.0
git push origin main --tags
```

### 4. Compile binaries

```
deno task release
```

This compiles dlm for all supported platforms into `dist/`:

- `dlm-0.1.0-linux-x86_64`
- `dlm-0.1.0-linux-aarch64`
- `dlm-0.1.0-darwin-x86_64`
- `dlm-0.1.0-darwin-aarch64`
- `dlm-0.1.0-windows-x86_64.exe`

### 5. Create GitHub release

```
gh release create v0.1.0 dist/* \
  --title "v0.1.0" \
  --notes-file - <<'EOF'
See [CHANGELOG.md](https://github.com/brettchalupa/dlm/blob/main/CHANGELOG.md#010---2026-02-10) for details.
EOF
```

Or create the release through the GitHub web UI, uploading the binaries from
`dist/`.

### 6. Post-release version bump

Bump to the next dev version:

```json
"version": "0.2.0-dev"
```

Add an `[Unreleased]` section to `CHANGELOG.md`:

```markdown
## [Unreleased]

## [0.1.0] - 2026-02-10
```

Commit:

```
git add deno.json CHANGELOG.md
git commit -m "Bump to 0.2.0-dev"
git push origin main
```

## Browser Extension Releases

The browser extension is versioned independently in `browser_ext/manifest.json`.
Use tags like `browser-ext-v1.0.0` and create a separate GitHub release with the
built extension zip.

## Desktop App Releases

Desktop apps are experimental and versioned independently. When ready, use tags
like `desktop-gtk-v0.1.0`.
