import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const appDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(appDir, "../..");

export default defineConfig({
  root: appDir,
  clearScreen: false,
  plugins: [react()],
  resolve: {
    alias: {
      "@spec-ui/core": path.resolve(workspaceRoot, "packages/core/src"),
      "@spec-ui/ui": path.resolve(workspaceRoot, "packages/ui/src"),
      "@spec-ui/views": path.resolve(workspaceRoot, "packages/views/src"),
    },
  },
  server: {
    host: "127.0.0.1",
    port: 1420,
    strictPort: true,
  },
  css: {
    postcss: path.resolve(workspaceRoot, "apps/web/postcss.config.mjs"),
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
