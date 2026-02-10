- Use TypeScript whenever possible
- Prefer using Deno's standard library rather than third-party libraries
- Use Deno as the TypeScript runtime
- The browser extension in browser_ext/ is a universal extension with polyfills
- Always run `deno task ok` after making changes. It must exit with status 0 and
  produce no warnings or errors. Do not ignore or suppress warnings — fix them.
