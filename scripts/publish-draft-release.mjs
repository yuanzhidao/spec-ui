import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = parseArgs(process.argv.slice(2));
const tag = requiredArg(args, "tag");
const version = tag.replace(/^v/, "");
const artifactDir = path.resolve(rootDir, args.artifacts || "release-artifacts");
const notesPath = path.resolve(rootDir, requiredArg(args, "notes"));
const repository = process.env.GITHUB_REPOSITORY;
const token = process.env.GITHUB_TOKEN;

if (repository !== "yuanzhidao/spec-ui") {
  console.log(`Skipping draft release publish for non-canonical repository: ${repository}`);
  process.exit(0);
}
if (!token) {
  throw new Error("GITHUB_TOKEN is required to publish a draft release.");
}

const expectedArtifacts = [
  `spec-ui-${version}-macos-arm64.dmg`,
  `spec-ui-${version}-macos-x64.dmg`,
  `spec-ui-${version}-windows-x64-setup.exe`,
  `spec-ui-${version}-linux-x64.AppImage`,
  `spec-ui-${version}-linux-x64.deb`,
];

const artifactPaths = expectedArtifacts.map((name) => {
  const artifactPath = path.join(artifactDir, name);
  if (!fs.existsSync(artifactPath)) {
    throw new Error(`Missing expected release artifact: ${artifactPath}`);
  }
  return artifactPath;
});

const body = fs.readFileSync(notesPath, "utf8");
const [owner, repo] = repository.split("/");
let createdRelease = false;
let release = await getReleaseByTag(owner, repo, tag);
const uploadedAssetIds = [];

try {
  if (!release) {
    release = await createRelease(owner, repo, tag, body);
    createdRelease = true;
  } else {
    if (!release.draft) {
      throw new Error(`Release ${tag} already exists and is not a draft.`);
    }
    release = await updateRelease(owner, repo, release.id, tag, body);
  }

  for (const asset of release.assets ?? []) {
    if (expectedArtifacts.includes(asset.name)) {
      await deleteAsset(owner, repo, asset.id);
    }
  }

  for (const artifactPath of artifactPaths) {
    const asset = await uploadAsset(owner, repo, release.id, artifactPath);
    uploadedAssetIds.push(asset.id);
  }
} catch (error) {
  if (createdRelease && release?.id) {
    await deleteRelease(owner, repo, release.id).catch(() => undefined);
  } else {
    await Promise.all(
      uploadedAssetIds.map((assetId) =>
        deleteAsset(owner, repo, assetId).catch(() => undefined),
      ),
    );
  }
  throw error;
}

console.log(`Draft release ${tag} is ready with ${artifactPaths.length} artifacts.`);

async function getReleaseByTag(ownerName, repoName, releaseTag) {
  const response = await githubFetch(
    `https://api.github.com/repos/${ownerName}/${repoName}/releases/tags/${releaseTag}`,
    { method: "GET" },
    { allowNotFound: true },
  );
  if (response.status === 404) {
    return null;
  }
  return readJson(response);
}

async function createRelease(ownerName, repoName, releaseTag, releaseBody) {
  const response = await githubFetch(
    `https://api.github.com/repos/${ownerName}/${repoName}/releases`,
    {
      method: "POST",
      body: JSON.stringify({
        tag_name: releaseTag,
        name: `spec-ui ${releaseTag}`,
        body: releaseBody,
        draft: true,
        prerelease: false,
      }),
    },
  );
  return readJson(response);
}

async function updateRelease(ownerName, repoName, releaseId, releaseTag, releaseBody) {
  const response = await githubFetch(
    `https://api.github.com/repos/${ownerName}/${repoName}/releases/${releaseId}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        name: `spec-ui ${releaseTag}`,
        body: releaseBody,
        draft: true,
        prerelease: false,
      }),
    },
  );
  return readJson(response);
}

async function uploadAsset(ownerName, repoName, releaseId, artifactPath) {
  const name = path.basename(artifactPath);
  const response = await githubFetch(
    `https://uploads.github.com/repos/${ownerName}/${repoName}/releases/${releaseId}/assets?name=${encodeURIComponent(name)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
      },
      body: fs.readFileSync(artifactPath),
    },
  );
  return readJson(response);
}

async function deleteAsset(ownerName, repoName, assetId) {
  await githubFetch(
    `https://api.github.com/repos/${ownerName}/${repoName}/releases/assets/${assetId}`,
    { method: "DELETE" },
  );
}

async function deleteRelease(ownerName, repoName, releaseId) {
  await githubFetch(
    `https://api.github.com/repos/${ownerName}/${repoName}/releases/${releaseId}`,
    { method: "DELETE" },
  );
}

async function githubFetch(url, init, options = {}) {
  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...init.headers,
    },
  });

  if (response.status === 404 && options.allowNotFound) {
    return response;
  }

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`GitHub API request failed with ${response.status}: ${body}`);
  }

  return response;
}

async function readJson(response) {
  const body = await response.text();
  return body ? JSON.parse(body) : {};
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
