#!/usr/bin/env node
/**
 * update-changelog.mjs
 * Generate/append a CHANGELOG.md section from conventional commits since the last tag.
 *
 * Usage:
 *   node scripts/update-changelog.mjs               # uses package.json version
 *   node scripts/update-changelog.mjs 1.2.3         # explicit version
 *   node scripts/update-changelog.mjs 1.2.3 --dry   # preview only
 *   node scripts/update-changelog.mjs --tag         # also create a git tag (v{version})
 *
 * Notes:
 * - Groups commits by type (feat, fix, docs, chore, refactor, perf, test, build, ci, style)
 * - Detects BREAKING CHANGES via header "type(scope)!:" or body "BREAKING CHANGE:"
 * - Reads repo URL from package.json > repository.url (if present) for compare/commit links
 */

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const ROOT = process.cwd();
const CHANGELOG_PATH = path.join(ROOT, "CHANGELOG.md");

const ARGS = process.argv.slice(2);
const EXPLICIT_VERSION = ARGS.find(a => /^\d+\.\d+\.\d+$/.test(a)) || null;
const FLAG_DRY = ARGS.includes("--dry") || ARGS.includes("--dry-run");
const FLAG_TAG = ARGS.includes("--tag");
const NOW = new Date();
const DATE = NOW.toISOString().slice(0, 10); // YYYY-MM-DD

// helpers
const sh = (cmd, opts = {}) => execSync(cmd, { stdio: ["ignore", "pipe", "pipe"], encoding: "utf8", ...opts }).trim();
const exists = f => fs.existsSync(f);

function readPkg() {
  const pkgPath = path.join(ROOT, "package.json");
  if (!exists(pkgPath)) return {};
  try { return JSON.parse(fs.readFileSync(pkgPath, "utf8")); } catch { return {}; }
}

function getRepoUrl() {
  // Try package.json first
  const pkg = readPkg();
  let repo = pkg?.repository?.url || pkg?.repository;
  if (typeof repo === "string") {
    // normalize "git+https://github.com/user/repo.git" -> "https://github.com/user/repo"
    repo = repo.replace(/^git\+/, "").replace(/\.git$/, "");
    return repo;
  }
  // Fallback to git remote
  try {
    const remote = sh("git config --get remote.origin.url");
    if (!remote) return null;
    return remote.replace(/^git@([^:]+):/, "https://$1/").replace(/\.git$/, "");
  } catch {
    return null;
  }
}

function getLastTag() {
  try {
    return sh("git describe --tags --abbrev=0");
  } catch {
    // no tags yet → use the first commit as baseline
    return null;
  }
}

function getFirstCommitHash() {
  return sh("git rev-list --max-parents=0 HEAD | tail -n 1");
}

function getVersion() {
  if (EXPLICIT_VERSION) return EXPLICIT_VERSION;
  const pkg = readPkg();
  if (pkg?.version) return pkg.version;
  // final fallback
  return "0.0.0";
}

function getRange(lastTag) {
  if (lastTag) return `${lastTag}..HEAD`;
  // from first commit if no tag exists
  return `${getFirstCommitHash()}..HEAD`;
}

function fetchCommits(range) {
  // record separator \x1e; field separator \x1f → [hash, subject, body]
  const fmt = "%H%x1f%s%x1f%b%x1e";
  const raw = sh(`git log ${range} --pretty=format:${fmt}`);
  if (!raw) return [];
  return raw.split("\x1e").filter(Boolean).map(rec => {
    const [hash, subject, body] = rec.split("\x1f");
    return { hash, subject: subject?.trim() ?? "", body: (body || "").trim() };
  });
}

const TYPE_MAP = {
  feat:  { title: "🚀 Features", order: 1 },
  fix:   { title: "🛠 Fixes", order: 2 },
  perf:  { title: "⚡ Performance", order: 3 },
  refactor:{ title: "🧹 Refactors", order: 4 },
  build: { title: "🏗 Build", order: 5 },
  ci:    { title: "🤖 CI", order: 6 },
  docs:  { title: "📝 Docs", order: 7 },
  test:  { title: "✅ Tests", order: 8 },
  style: { title: "🎨 Style", order: 9 },
  chore: { title: "🧰 Chores", order: 10 },
  other: { title: "🔩 Other", order: 99 },
};

function parseHeader(subject) {
  // Conventional: type(scope)!: message
  const m = subject.match(/^(\w+)(?:\(([^)]+)\))?(!)?:\s*(.+)$/);
  if (!m) return { type: "other", scope: null, breaking: false, msg: subject };
  const [, type, scope, bang, msg] = m;
  return { type: TYPE_MAP[type] ? type : "other", scope: scope || null, breaking: !!bang, msg };
}

function detectBreaking(body) {
  return /BREAKING CHANGE:/i.test(body || "");
}

function buildSection({ version, date, commits, repoUrl, lastTag }) {
  const groups = {};
  let hasBreaking = false;

  for (const c of commits) {
    const meta = parseHeader(c.subject);
    const breaking = meta.breaking || detectBreaking(c.body);
    if (breaking) hasBreaking = true;

    const key = breaking ? "breaking" : meta.type;
    if (!groups[key]) groups[key] = [];
    groups[key].push({ ...c, meta });
  }

  const lines = [];
  const headerTitle = `## [v${version}] - ${date}`;
  const compareLink = (repoUrl && lastTag)
    ? ` ([compare](${repoUrl}/compare/${lastTag}...v${version}))`
    : "";

  lines.push(`${headerTitle}${compareLink}\n`);

  if (hasBreaking) {
    lines.push(`### ❗ BREAKING CHANGES\n`);
    for (const c of groups.breaking || []) {
      lines.push(formatItem(c, repoUrl));
    }
    lines.push("");
  }

  // ordered groups by TYPE_MAP order
  const ordered = Object.keys(TYPE_MAP).sort((a, b) => TYPE_MAP[a].order - TYPE_MAP[b].order);
  for (const key of ordered) {
    const list = groups[key];
    if (!list || list.length === 0) continue;
    lines.push(`### ${TYPE_MAP[key].title}\n`);
    for (const c of list) lines.push(formatItem(c, repoUrl));
    lines.push("");
  }

  // include any "other" remaining (non‑conventional)
  const others = Object.keys(groups).filter(k => !TYPE_MAP[k] && k !== "breaking");
  for (const key of others) {
    lines.push(`### ${TYPE_MAP.other.title}\n`);
    for (const c of groups[key]) lines.push(formatItem(c, repoUrl));
    lines.push("");
  }

  return lines.join("\n").trim() + "\n";
}

function short(hash) { return hash.slice(0, 7); }

function formatItem(commit, repoUrl) {
  const scope = commit.meta.scope ? `**${commit.meta.scope}**: ` : "";
  const subject = commit.meta.msg.replace(/\s+/g, " ").trim();
  const link = repoUrl ? ` ([${short(commit.hash)}](${repoUrl}/commit/${commit.hash}))` : ` (${short(commit.hash)})`;
  return `- ${scope}${subject}${link}`;
}

function ensureChangelogHeader(text) {
  const hdr = "# Changelog\n\nAll notable changes to this project will be documented in this file.\n";
  return text.startsWith("# Changelog") ? text : `${hdr}\n${text}`;
}

function prependSection(section) {
  let current = "";
  if (exists(CHANGELOG_PATH)) current = fs.readFileSync(CHANGELOG_PATH, "utf8");
  const next = ensureChangelogHeader(`${section}\n${current.trim()}\n`);
  if (FLAG_DRY) {
    console.log("----- DRY RUN (CHANGELOG would become) -----\n");
    console.log(next);
    return;
  }
  fs.writeFileSync(CHANGELOG_PATH, next, "utf8");
  console.log(`✔ Wrote ${CHANGELOG_PATH}`);
}

function main() {
  // safety: ensure we’re in a git repo
  try { sh("git rev-parse --is-inside-work-tree"); } 
  catch { console.error("This script must be run inside a git repository."); process.exit(1); }

  const version = getVersion();
  const lastTag = getLastTag(); // null if none
  const range = getRange(lastTag);
  const commits = fetchCommits(range);

  if (commits.length === 0) {
    console.log(`No commits found in range ${range}. Nothing to add.`);
    process.exit(0);
  }

  const repoUrl = getRepoUrl();
  const section = buildSection({ version, date: DATE, commits, repoUrl, lastTag });
  prependSection(section);

  if (FLAG_DRY) return;

  // Commit CHANGELOG and optionally tag
  try {
    sh("git add CHANGELOG.md");
    sh(`git commit -m "chore(changelog): update for v${version}"`);
    console.log("✔ Committed CHANGELOG.md");
  } catch (e) {
    console.warn("⚠ Could not create commit (maybe no changes).", e?.message || e);
  }

  if (FLAG_TAG) {
    try {
      sh(`git tag v${version}`);
      console.log(`✔ Created tag v${version}`);
      // Optional: push tags here if desired
      // sh("git push --follow-tags");
    } catch (e) {
      console.warn("⚠ Could not create tag.", e?.message || e);
    }
  }
}

main();
