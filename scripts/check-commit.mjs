import { spawnSync } from "node:child_process";
import path from "node:path";

const checks = [
  {
    label: "Rust format",
    command: "cargo",
    args: ["fmt", "--manifest-path", "src-tauri/Cargo.toml", "--check"],
  },
  {
    label: "TypeScript",
    command: "pnpm",
    args: ["typecheck"],
  },
  {
    label: "ESLint",
    command: "pnpm",
    args: ["lint"],
  },
  {
    label: "Vitest",
    command: "pnpm",
    args: ["test"],
  },
  {
    label: "OpenSpec",
    command: "pnpm",
    args: ["spec:validate"],
  },
  {
    label: "Desktop tests",
    command: "pnpm",
    args: ["desktop:test"],
  },
];

const env = sanitizedEnvironment();

for (const check of checks) {
  console.log(`\n> ${check.label}`);
  run(check.command, check.args, env);
}

function run(command, args, env) {
  const resolved = resolveCommand(command, args);
  const result = spawnSync(resolved.executable, resolved.args, {
    cwd: process.cwd(),
    env,
    stdio: "inherit",
  });

  if (result.error) {
    throw new Error(`${command} ${args.join(" ")} failed to start: ${result.error.message}`);
  }

  if (result.signal) {
    throw new Error(`${command} ${args.join(" ")} exited with signal ${result.signal}`);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function sanitizedEnvironment() {
  const env = { ...process.env };

  for (const key of Object.keys(env)) {
    if (key.startsWith("GIT_")) {
      delete env[key];
    }
  }

  return env;
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
