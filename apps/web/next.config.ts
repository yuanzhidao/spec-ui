import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const webAppDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(webAppDir, "../..");

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: ["127.0.0.1"],
  transpilePackages: ["@spec-ui/core", "@spec-ui/ui", "@spec-ui/views"],
  turbopack: {
    root: workspaceRoot,
  },
};

export default nextConfig;
