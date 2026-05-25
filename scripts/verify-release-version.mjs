import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tag = tagFromArgsOrEnv();
const version = tag.replace(/^v/, "");

if (!/^v\d+\.\d+\.\d+$/.test(tag)) {
  fail(`Release tags must use vX.Y.Z format. Received: ${tag}`);
}

const packageVersion = JSON.parse(
  fs.readFileSync(path.join(rootDir, "package.json"), "utf8"),
).version;
const tauriVersion = JSON.parse(
  fs.readFileSync(path.join(rootDir, "src-tauri", "tauri.conf.json"), "utf8"),
).version;
const cargoToml = fs.readFileSync(path.join(rootDir, "src-tauri", "Cargo.toml"), "utf8");
const cargoVersion = cargoToml.match(/^version = "([^"]+)"/m)?.[1];

assertVersion("package.json", packageVersion, version);
assertVersion("src-tauri/tauri.conf.json", tauriVersion, version);
assertVersion("src-tauri/Cargo.toml", cargoVersion, version);

if (process.env.GITHUB_OUTPUT) {
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `version=${version}\n`);
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `tag=${tag}\n`);
}

console.log(`Release metadata verified for ${tag}.`);

function tagFromArgsOrEnv() {
  const tagArgIndex = process.argv.indexOf("--tag");
  const argTag = tagArgIndex === -1 ? undefined : process.argv[tagArgIndex + 1];
  const envTag = process.env.GITHUB_REF_NAME;
  const tagValue = argTag || envTag;

  if (!tagValue) {
    fail("Missing release tag. Pass --tag vX.Y.Z or set GITHUB_REF_NAME.");
  }

  return tagValue;
}

function assertVersion(source, actual, expected) {
  if (actual !== expected) {
    fail(`${source} version ${actual ?? "<missing>"} does not match release ${expected}.`);
  }
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
