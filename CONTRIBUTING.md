# Contributing to dlm

Thanks for your interest in contributing to dlm!

## Getting Started

1. [Install Deno](https://deno.com/) 2.x or later
2. Clone the repo and copy the example config:
   ```
   git clone https://github.com/brettchalupa/dlm.git
   cd dlm
   cp dlm.example.yml dlm.yml
   ```
3. Run the dev server: `deno task dev`

## Making Changes

1. Fork the repo and create a branch for your change
2. Make your changes
3. Run checks before submitting: `deno task ok`
4. Open a pull request with a clear description of what you changed and why

## Checks

`deno task ok` runs type checking, formatting, linting, and browser extension
tests. Please make sure it passes before opening a PR.

You can also run individual checks:

- `deno check .` -- type checking
- `deno fmt` -- format code (or `deno fmt --check` to verify)
- `deno lint` -- linting

## Reporting Bugs

Open an issue on GitHub with:

- What you expected to happen
- What actually happened
- Steps to reproduce
- Your environment (OS, Deno version, download tool versions)

## Code Style

- Follow the existing patterns in the codebase
- Use `deno fmt` for formatting
- Keep changes focused -- one issue or feature per PR

## License

By contributing, you agree that your contributions will be released under the
[Unlicense](LICENSE) (public domain).
