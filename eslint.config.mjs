import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    settings: {
      next: {
        rootDir: "apps/web/",
      },
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "apps/web/.next/**",
    "out/**",
    "apps/web/out/**",
    "build/**",
    "apps/desktop/dist/**",
    "src-tauri/target/**",
    "src-tauri/gen/**",
    "src-tauri/binaries/**",
    "src-tauri/desktop-runtime/**",
    "release-artifacts/**",
    ".local/**",
    ".scratch/**",
    ".worktrees/**",
    "apps/web/next-env.d.ts",
  ]),
]);

export default eslintConfig;
