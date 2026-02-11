# Changelog

All notable changes to dlm will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this
project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.1.0] - 2026-02-10

Initial release.

### Added

- Web server with dark-themed dashboard UI
- Background download daemon with configurable interval and batch size
- YAML-based collection config (domains, directories, commands)
- CLI for adding URLs, checking counts, and triggering downloads
- Remote CLI client for managing downloads over HTTP
- HTTP API for all download operations
- Browser extension (Chrome and Firefox) with keyboard shortcuts and context
  menu
- SQLite database for download tracking
- Automatic page title fetching
- Error tracking with retry support
- Priority-based download ordering
- Per-collection download logs
