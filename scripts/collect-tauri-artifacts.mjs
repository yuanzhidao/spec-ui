import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = parseArgs(process.argv.slice(2));
const version = requiredArg(args, "version");
const target = requiredArg(args, "target");
const platform = requiredArg(args, "platform");
const arch = requiredArg(args, "arch");
const bundleDir = path.join(rootDir, "src-tauri", "target", target, "release", "bundle");
const outputDir = path.join(rootDir, "release-artifacts");

fs.rmSync(outputDir, { recursive: true, force: true });
fs.mkdirSync(outputDir, { recursive: true });

for (const artifact of expectedArtifactsFor(platform)) {
  const source = findBundleArtifact(path.join(bundleDir, artifact.bundleDir), artifact.extension);

  fs.copyFileSync(
    source,
    path.join(outputDir, artifactName(version, platform, arch, artifact.extension)),
  );
}

function artifactName(releaseVersion, releasePlatform, releaseArch, extension) {
  if (releasePlatform === "windows" && extension === ".exe") {
    return `spec-ui-${releaseVersion}-${releasePlatform}-${releaseArch}-setup${extension}`;
  }

  return `spec-ui-${releaseVersion}-${releasePlatform}-${releaseArch}${extension}`;
}

function expectedArtifactsFor(releasePlatform) {
  if (releasePlatform === "macos") {
    return [{ bundleDir: "dmg", extension: ".dmg" }];
  }
  if (releasePlatform === "windows") {
    return [{ bundleDir: "nsis", extension: ".exe" }];
  }
  if (releasePlatform === "linux") {
    return [
      { bundleDir: "appimage", extension: ".AppImage" },
      { bundleDir: "deb", extension: ".deb" },
    ];
  }

  throw new Error(`Unknown release platform: ${releasePlatform}`);
}

function findBundleArtifact(dir, extension) {
  const found = findFiles(dir, extension);
  if (found.length === 0) {
    throw new Error(`Missing expected ${extension} artifact under ${dir}`);
  }
  if (found.length > 1) {
    throw new Error(`Expected one ${extension} artifact under ${dir}, found ${found.length}.`);
  }
  return found[0];
}

function findFiles(dir, extension) {
  if (!fs.existsSync(dir)) {
    return [];
  }

  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...findFiles(fullPath, extension));
    } else if (entry.name.toLowerCase().endsWith(extension.toLowerCase())) {
      files.push(fullPath);
    }
  }
  return files;
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 2) {
    parsed[argv[index]?.replace(/^--/, "")] = argv[index + 1];
  }
  return parsed;
}

function requiredArg(parsed, name) {
  if (!parsed[name]) {
    throw new Error(`Missing --${name}`);
  }
  return parsed[name];
}
