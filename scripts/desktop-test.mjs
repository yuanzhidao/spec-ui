import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tauriDir = path.join(rootDir, "src-tauri");
const tauriConfig = {
  bundle: {
    externalBin: [],
    resources: [],
  },
};

const result = spawnSync("cargo", ["test"], {
  cwd: tauriDir,
  env: {
    ...process.env,
    TAURI_CONFIG: JSON.stringify(tauriConfig),
  },
  stdio: "inherit",
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

if (result.signal) {
  console.error(`cargo test exited with signal ${result.signal}`);
  process.exit(1);
}

process.exit(result.status ?? 1);
