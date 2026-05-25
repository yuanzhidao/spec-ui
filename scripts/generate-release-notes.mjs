import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = parseArgs(process.argv.slice(2));
const tag = requiredArg(args, "tag");
const outputPath = path.resolve(rootDir, args.output || "release-notes.md");

if (!/^v\d+\.\d+\.\d+$/.test(tag)) {
  throw new Error(`Release tags must use vX.Y.Z format. Received: ${tag}`);
}

const previousTag = findPreviousTag(tag);
const range = previousTag ? `${previousTag}..${tag}` : tag;
const commits = readCommits(range);
const notes = renderReleaseNotes({ tag, previousTag, range, commits });

fs.writeFileSync(outputPath, notes);
console.log(`Generated release notes for ${tag} from ${commits.length} commits.`);

function findPreviousTag(currentTag) {
  const releaseTagPattern = /^v\d+\.\d+\.\d+$/;
  const tags = git([
    "tag",
    "--merged",
    currentTag,
    "--sort=-version:refname",
    "--list",
    "v[0-9]*",
  ])
    .split(/\r?\n/)
    .map((candidate) => candidate.trim())
    .filter((candidate) => releaseTagPattern.test(candidate));

  return tags.find((candidate) => candidate !== currentTag) ?? null;
}

function readCommits(rangeSpec) {
  const raw = git([
    "log",
    "--no-merges",
    "--format=%H%x1f%h%x1f%B%x1e",
    rangeSpec,
  ]);

  return raw
    .split("\x1e")
    .map((record) => record.trim())
    .filter(Boolean)
    .map(parseCommitRecord);
}

function parseCommitRecord(record) {
  const [hash, shortHash, ...messageParts] = record.split("\x1f");
  const message = messageParts.join("\x1f").trim();
  const [subject = "", ...bodyLines] = message.split(/\r?\n/);
  const body = bodyLines.join("\n");
  const conventional = subject.match(/^([a-z]+)(?:\(([^)]+)\))?(!)?:\s+(.+)$/i);
  const type = conventional?.[1]?.toLowerCase() ?? "other";
  const scope = conventional?.[2] ?? "";
  const hasBreakingBang = Boolean(conventional?.[3]);
  const summary = conventional?.[4] ?? subject;
  const isBreaking = hasBreakingBang || /^BREAKING CHANGE:/m.test(body);

  return {
    hash,
    shortHash,
    type,
    scope,
    summary,
    isBreaking,
  };
}

function renderReleaseNotes({ tag: releaseTag, previousTag: priorTag, range: rangeSpec, commits }) {
  const sections = groupCommits(commits);
  const lines = [
    `## ${releaseTag}`,
    "",
    priorTag
      ? `Generated from commit messages in \`${rangeSpec}\`.`
      : "Generated from commit messages for the initial release.",
    "",
  ];

  if (commits.length === 0) {
    lines.push("No commits found for this release.", "");
    return lines.join("\n");
  }

  for (const section of sections) {
    if (section.commits.length === 0) continue;
    lines.push(`### ${section.title}`, "");
    for (const commit of section.commits) {
      lines.push(`- ${formatCommit(commit)}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

function groupCommits(commits) {
  const sectionOrder = [
    ["breaking", "Breaking Changes"],
    ["feat", "Features"],
    ["fix", "Fixes"],
    ["perf", "Performance"],
    ["refactor", "Refactors"],
    ["docs", "Documentation"],
    ["test", "Tests"],
    ["build", "Build"],
    ["ci", "CI"],
    ["deps", "Dependencies"],
    ["chore", "Maintenance"],
    ["other", "Other Changes"],
  ];
  const groups = new Map(sectionOrder.map(([key, title]) => [key, { title, commits: [] }]));

  for (const commit of commits) {
    if (commit.isBreaking) {
      groups.get("breaking").commits.push(commit);
      continue;
    }

    const key = groups.has(commit.type) ? commit.type : "other";
    groups.get(key).commits.push(commit);
  }

  return [...groups.values()];
}

function formatCommit(commit) {
  const scope = commit.scope ? `**${commit.scope}:** ` : "";
  return `${scope}${commit.summary} (${commit.shortHash})`;
}

function git(gitArgs) {
  return execFileSync("git", gitArgs, {
    cwd: rootDir,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
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
