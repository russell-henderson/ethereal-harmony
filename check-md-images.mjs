// check-md-images.mjs
import { globby } from "globby";
import { readFile } from "fs/promises";
import { resolve, dirname } from "path";

const imageRegex = /!\[[^\]]*\]\(([^)]+)\)/g; // captures ![alt](path)

let errors = 0;

const mds = await globby(["*.md", "docs/**/*.md"]);

for (const file of mds) {
  const content = await readFile(file, "utf8");

  for (const match of content.matchAll(imageRegex)) {
    let relPath = match[1].split("#")[0]; // strip anchor
    if (/^https?:\/\//.test(relPath) || /^data:/.test(relPath)) continue; // skip URLs

    const absPath = resolve(dirname(file), relPath);

    try {
      await readFile(absPath);
    } catch {
      console.log(`❌ Missing: ${relPath} in ${file}`);
      errors++;
    }
  }
}

if (!errors) {
  console.log("✅ All embedded images resolved.");
  process.exit(0);
} else {
  process.exit(1);
}
