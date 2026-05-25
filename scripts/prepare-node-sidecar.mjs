import { spawnSync } from "node:child_process";
import fs from "node:fs";
import https from "node:https";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const binariesDir = path.join(rootDir, "src-tauri", "binaries");
const desktopRuntimeDir = path.join(rootDir, "src-tauri", "desktop-runtime");
const nodeCacheDir = path.join(binariesDir, ".node-cache");

fs.mkdirSync(binariesDir, { recursive: true });
fs.mkdirSync(desktopRuntimeDir, { recursive: true });
fs.writeFileSync(path.join(desktopRuntimeDir, ".keep"), "");

const targetTriple = process.env.TAURI_ENV_TARGET_TRIPLE || hostTriple();
const extension = targetTriple.includes("windows") ? ".exe" : "";
const sidecarPath = path.join(binariesDir, `spec-ui-node-${targetTriple}${extension}`);
const nodeVersion = normalizeNodeVersion(
  process.env.SPEC_UI_NODE_VERSION || process.env.NODE_VERSION || process.version,
);
const nodePackage = nodePackageForTarget(targetTriple, nodeVersion);
const nodeBinary = await prepareOfficialNodeRuntime(nodePackage);

fs.copyFileSync(nodeBinary, sidecarPath);
if (!extension) {
  fs.chmodSync(sidecarPath, 0o755);
}

console.log(
  `Prepared Node ${nodeVersion} sidecar for ${targetTriple}: ${path.relative(rootDir, sidecarPath)}`,
);

async function prepareOfficialNodeRuntime(nodePackageInfo) {
  fs.mkdirSync(nodeCacheDir, { recursive: true });

  const archivePath = path.join(nodeCacheDir, nodePackageInfo.archiveName);
  const extractRoot = path.join(nodeCacheDir, nodePackageInfo.packageName);
  const binaryPath = path.join(extractRoot, ...nodePackageInfo.binaryParts);

  if (fs.existsSync(binaryPath)) {
    return binaryPath;
  }

  if (!fs.existsSync(archivePath)) {
    await downloadFile(nodePackageInfo.url, archivePath);
  }

  fs.rmSync(extractRoot, { recursive: true, force: true });
  extractArchive(archivePath, nodeCacheDir, nodePackageInfo.archiveName);

  if (!fs.existsSync(binaryPath)) {
    throw new Error(`Downloaded Node runtime did not contain expected binary: ${binaryPath}`);
  }

  return binaryPath;
}

function nodePackageForTarget(target, version) {
  const platformArch = nodePlatformArchForTarget(target);
  const packageName = `node-${version}-${platformArch}`;
  const archiveExtension = platformArch.startsWith("win-") ? "zip" : "tar.xz";
  const archiveName = `${packageName}.${archiveExtension}`;
  const binaryParts = platformArch.startsWith("win-")
    ? ["node.exe"]
    : ["bin", "node"];

  return {
    packageName,
    archiveName,
    binaryParts,
    url: `https://nodejs.org/dist/${version}/${archiveName}`,
  };
}

function nodePlatformArchForTarget(target) {
  if (target === "aarch64-apple-darwin") {
    return "darwin-arm64";
  }
  if (target === "x86_64-apple-darwin") {
    return "darwin-x64";
  }
  if (target === "x86_64-pc-windows-msvc") {
    return "win-x64";
  }
  if (target === "x86_64-unknown-linux-gnu") {
    return "linux-x64";
  }

  throw new Error(`Unsupported Node sidecar target: ${target}`);
}

function normalizeNodeVersion(rawVersion) {
  const version = rawVersion.startsWith("v") ? rawVersion : `v${rawVersion}`;
  if (!/^v\d+\.\d+\.\d+$/.test(version)) {
    return process.version;
  }
  return version;
}

async function downloadFile(url, destination, redirectCount = 0) {
  if (redirectCount > 5) {
    throw new Error(`Too many redirects while downloading ${url}`);
  }

  await new Promise((resolve, reject) => {
    const request = https.get(url, (response) => {
      if (
        response.statusCode &&
        response.statusCode >= 300 &&
        response.statusCode < 400 &&
        response.headers.location
      ) {
        response.resume();
        downloadFile(response.headers.location, destination, redirectCount + 1)
          .then(resolve)
          .catch(reject);
        return;
      }

      if (response.statusCode !== 200) {
        response.resume();
        reject(new Error(`Failed to download ${url}: HTTP ${response.statusCode}`));
        return;
      }

      const temporaryPath = `${destination}.tmp`;
      const file = fs.createWriteStream(temporaryPath);
      response.pipe(file);
      file.on("finish", () => {
        file.close(() => {
          fs.renameSync(temporaryPath, destination);
          resolve();
        });
      });
      file.on("error", (error) => {
        fs.rmSync(temporaryPath, { force: true });
        reject(error);
      });
    });

    request.on("error", reject);
  });
}

function extractArchive(archivePath, destinationDir, archiveName) {
  const result = archiveName.endsWith(".zip")
    ? extractZip(archivePath, destinationDir)
    : extractTar(archivePath, destinationDir);

  if (result.error) {
    throw new Error(`Failed to extract ${archiveName}: ${result.error.message}`);
  }

  if (result.signal) {
    throw new Error(`Failed to extract ${archiveName}: exited with signal ${result.signal}`);
  }

  if (result.status !== 0) {
    throw new Error(`Failed to extract ${archiveName} with exit code ${result.status}`);
  }
}

function extractZip(archivePath, destinationDir) {
  if (process.platform === "win32") {
    return spawnSync(
      "powershell",
      [
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-Command",
        "Expand-Archive -LiteralPath $env:SPEC_UI_NODE_ARCHIVE -DestinationPath $env:SPEC_UI_NODE_EXTRACT_DIR -Force",
      ],
      {
        env: {
          ...process.env,
          SPEC_UI_NODE_ARCHIVE: archivePath,
          SPEC_UI_NODE_EXTRACT_DIR: destinationDir,
        },
        stdio: "inherit",
      },
    );
  }

  return spawnSync("unzip", ["-q", archivePath, "-d", destinationDir], {
    stdio: "inherit",
  });
}

function extractTar(archivePath, destinationDir) {
  const result = spawnSync("tar", ["-xJf", archivePath, "-C", destinationDir], {
    stdio: "inherit",
  });
  if (result.status === 0) {
    return result;
  }

  return spawnSync("tar", ["-xf", archivePath, "-C", destinationDir], {
    stdio: "inherit",
  });
}

function hostTriple() {
  const { stdout, status } = spawnSync("rustc", ["-Vv"], {
    cwd: rootDir,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  });

  if (status !== 0) {
    throw new Error("Unable to run rustc -Vv to determine host target triple.");
  }

  const hostLine = stdout
    .split(/\r?\n/)
    .find((line) => line.startsWith("host: "));
  if (!hostLine) {
    throw new Error("Unable to determine Rust host target triple.");
  }

  return hostLine.slice("host: ".length).trim();
}
