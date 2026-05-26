import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

run("pnpm", ["build:desktop-renderer"]);

function run(command, args, options = {}) {
  const { env, ...spawnOptions } = options;
  const resolved = resolveCommand(command, args);
  const result = spawnSync(resolved.executable, resolved.args, {
    cwd: rootDir,
    env: {
      ...process.env,
      ...env,
    },
    stdio: "inherit",
    ...spawnOptions,
  });

  if (result.error) {
    throw new Error(
      `${command} ${args.join(" ")} failed to start: ${result.error.message}`,
    );
  }

  if (result.signal) {
    throw new Error(`${command} ${args.join(" ")} exited with signal ${result.signal}`);
  }

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed with exit code ${result.status}`);
  }
}

function resolveCommand(command, args) {
  if (command === "pnpm" && isNodeExecutableScript(process.env.npm_execpath)) {
    return {
      executable: process.execPath,
      args: [process.env.npm_execpath, ...args],
    };
  }

  if (process.platform === "win32" && command === "pnpm") {
    return {
      executable: "cmd.exe",
      args: ["/d", "/s", "/c", command, ...args],
    };
  }

  return {
    executable: command,
    args,
  };
}

function isNodeExecutableScript(filePath) {
  if (!filePath) {
    return false;
  }

  return [".js", ".cjs", ".mjs"].includes(path.extname(filePath).toLowerCase());
}
