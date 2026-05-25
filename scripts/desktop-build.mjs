import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tauriDir = path.join(rootDir, "src-tauri");
const desktopRuntimeDir = path.join(tauriDir, "desktop-runtime");
const binariesDir = path.join(tauriDir, "binaries");

run("pnpm", ["build"], {
  env: {
    ...process.env,
    NEXT_TELEMETRY_DISABLED: "1",
  },
});

resetDir(desktopRuntimeDir);
fs.mkdirSync(path.join(desktopRuntimeDir, "runtime"), { recursive: true });
fs.mkdirSync(path.join(desktopRuntimeDir, "node_modules"), { recursive: true });
fs.mkdirSync(binariesDir, { recursive: true });

copyDir(path.join(rootDir, ".next", "standalone"), path.join(desktopRuntimeDir, "web"), {
  dereference: false,
  skipBrokenSymlinks: true,
});
copyDir(
  path.join(rootDir, ".next", "static"),
  path.join(desktopRuntimeDir, "web", ".next", "static"),
);
copyDir(path.join(rootDir, "public"), path.join(desktopRuntimeDir, "web", "public"));

run("pnpm", [
  "exec",
  "esbuild",
  "runtime/server.ts",
  "--bundle",
  "--platform=node",
  "--format=esm",
  "--target=node22",
  "--external:@parcel/watcher",
  `--outfile=${path.join(desktopRuntimeDir, "runtime", "server.mjs")}`,
]);

copyPackage("@parcel/watcher");
run("pnpm", ["desktop:prepare-sidecar"]);

function copyPackage(packageName, seen = new Set()) {
  if (seen.has(packageName)) {
    return;
  }
  seen.add(packageName);

  let packageJsonPath;
  try {
    packageJsonPath = requireResolve(`${packageName}/package.json`);
  } catch {
    return;
  }

  const packageDir = path.dirname(packageJsonPath);
  const targetDir = path.join(desktopRuntimeDir, "node_modules", ...packageName.split("/"));
  copyDir(packageDir, targetDir);

  const manifest = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
  const dependencyNames = [
    ...Object.keys(manifest.dependencies ?? {}),
    ...Object.keys(manifest.optionalDependencies ?? {}),
  ];

  for (const dependencyName of dependencyNames) {
    copyPackage(dependencyName, seen);
  }
}

function requireResolve(specifier) {
  return fileURLToPath(import.meta.resolve(specifier));
}

function resetDir(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
}

function copyDir(source, destination, options = {}) {
  if (!fs.existsSync(source)) {
    throw new Error(`Expected path does not exist: ${source}`);
  }

  const { dereference = true, skipBrokenSymlinks = false } = options;

  fs.cpSync(source, destination, {
    dereference,
    recursive: true,
    force: true,
    filter: (entry) => {
      if (entry.includes(`${path.sep}.cache${path.sep}`)) {
        return false;
      }

      if (!skipBrokenSymlinks) {
        return true;
      }

      const stat = fs.lstatSync(entry);
      return !stat.isSymbolicLink() || fs.existsSync(entry);
    },
  });
}

function run(command, args, options = {}) {
  const { env, ...spawnOptions } = options;
  const executable = resolveExecutable(command);
  const result = spawnSync(executable, args, {
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

function resolveExecutable(command) {
  if (process.platform === "win32" && command === "pnpm") {
    return "pnpm.cmd";
  }

  return command;
}
