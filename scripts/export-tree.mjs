#!/usr/bin/env node
/**
 * Ethereal Harmony — project tree exporter
 * ---------------------------------------
 * Usage examples:
 *   node scripts/export-tree.mjs
 *   node scripts/export-tree.mjs --out project-structure.txt
 *   node scripts/export-tree.mjs --root src --maxDepth 6
 *   node scripts/export-tree.mjs --include "src,public" --exclude "node_modules,dist,.git,.vite"
 *
 * Writes a text file containing a folder tree of your project with sensible ignores.
 * No external deps; runs on Node 18+.
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";

const args = parseArgs(process.argv.slice(2));

const CWD = process.cwd();
const ROOT = path.resolve(CWD, args.root ?? ".");
const OUT = path.resolve(CWD, args.out ?? "project-structure.txt");
const MAX_DEPTH = Number.isFinite(Number(args.maxDepth)) ? Number(args.maxDepth) : 12;

const DEFAULT_EXCLUDES = [
  "node_modules",
  ".git",
  "dist",
  "build",
  ".cache",
  ".vite",
  ".turbo",
  ".parcel-cache",
  ".DS_Store",
  ".eslintcache",
  ".next",
  ".vercel",
  ".idea",
  ".vscode",
  ".pnpm-store",
];

const excludes = new Set(
  (args.exclude ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .concat(DEFAULT_EXCLUDES)
);

const includes = new Set(
  (args.include ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
);

run().catch((err) => {
  console.error("export-tree: fatal error\n", err);
  process.exit(1);
});

async function run() {
  const lines = [];
  const rootLabel = path.basename(ROOT) || ROOT;

  lines.push(`${rootLabel}/`);

  await walk(ROOT, 0, lines, /*prefix*/ "");

  const text = lines.join("\n") + "\n";
  await fs.writeFile(OUT, text, "utf8");

  console.log(`✓ Wrote tree to ${path.relative(CWD, OUT)}`);
}

/**
 * Recursively walks the directory building a tree.
 */
async function walk(dir, depth, lines, prefix) {
  if (depth >= MAX_DEPTH) {
    lines.push(`${prefix}└── … (maxDepth reached)`);
    return;
  }

  let entries = await fs.readdir(dir, { withFileTypes: true });

  // Optional include filter at the top-level only:
  if (depth === 0 && includes.size > 0) {
    entries = entries.filter((e) => includes.has(e.name));
  }

  // Filter out excluded names
  entries = entries.filter((e) => !excludes.has(e.name));

  // Sort: directories first, then files; alphabetical within groups
  entries.sort((a, b) => {
    if (a.isDirectory() !== b.isDirectory()) return a.isDirectory() ? -1 : 1;
    return a.name.localeCompare(b.name, undefined, { numeric: true });
  });

  const lastIdx = entries.length - 1;

  for (let i = 0; i < entries.length; i++) {
    const ent = entries[i];
    const isLast = i === lastIdx;
    const branch = isLast ? "└── " : "├── ";
    const nextPrefix = prefix + (isLast ? "    " : "│   ");
    const p = path.join(dir, ent.name);

    if (ent.isDirectory()) {
      lines.push(`${prefix}${branch}${ent.name}/`);
      await walk(p, depth + 1, lines, nextPrefix);
    } else if (ent.isFile()) {
      lines.push(`${prefix}${branch}${ent.name}`);
    } else if (ent.isSymbolicLink()) {
      const target = await fs.readlink(p).catch(() => "");
      lines.push(`${prefix}${branch}${ent.name} -> ${target}`);
    }
  }
}

/**
 * Tiny argv parser for --k=v and --k v styles.
 */
function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const tok = argv[i];
    if (!tok.startsWith("--")) continue;
    const eq = tok.indexOf("=");
    if (eq !== -1) {
      const k = tok.slice(2, eq);
      const v = tok.slice(eq + 1);
      out[k] = v;
    } else {
      const k = tok.slice(2);
      const v = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : true;
      out[k] = v;
    }
  }
  return out;
}
