import { defineConfig } from "tsup";

export default defineConfig([
  // Library (ESM + CJS with types) — keeps acorn as external dependency
  {
    entry: ["src/index.ts"],
    format: ["esm", "cjs"],
    dts: true,
    clean: true,
    splitting: false,
    sourcemap: false,
  },
  // CLI (CJS only, with shebang) — bundles all dependencies for standalone execution
  {
    entry: ["src/cli.ts"],
    format: ["cjs"],
    dts: false,
    clean: false,
    splitting: false,
    sourcemap: false,
    noExternal: [/.*/], // Bundle everything including acorn for standalone CLI
    banner: {
      js: "#!/usr/bin/env node",
    },
  },
]);
