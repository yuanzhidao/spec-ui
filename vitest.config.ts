import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    exclude: [
      ...configDefaults.exclude,
      ".next/**",
      "out/**",
      "build/**",
      "src-tauri/target/**",
      "src-tauri/gen/**",
      "src-tauri/binaries/**",
      "src-tauri/desktop-runtime/**",
      "release-artifacts/**",
      ".local/**",
      ".scratch/**",
      ".worktrees/**",
    ],
  },
});
