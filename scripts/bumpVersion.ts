import { execSync } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";

type Bump = "patch" | "minor" | "major";

async function fileExists(p: string) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function updateManifestVersion(manifestPath: string, version: string) {
  const raw = await fs.readFile(manifestPath, "utf8");
  const manifest = JSON.parse(raw);

  manifest.version = version;

  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");
  console.log(`Updated ${manifestPath} -> ${version}`);
}

async function main() {
  const bump = process.argv[2] as Bump | undefined;
  if (!bump || !["patch", "minor", "major"].includes(bump)) {
    console.error("Usage: npx tsx scripts/bumpVersion.ts <patch|minor|major>");
    process.exit(1);
  }

  // Bump version
  execSync(`npm version ${bump} --no-git-tag-version`, { stdio: "inherit" });

  const pkg = JSON.parse(await fs.readFile("package.json", "utf8"));
  const version: string = pkg.version;

  // Sync manifest
  const manifestStatic = path.join("static", "manifest.json");
  if (!(await fileExists(manifestStatic))) {
    throw new Error(`Missing ${manifestStatic} (expected your source manifest here)`);
  }
  await updateManifestVersion(manifestStatic, version);

  console.log(`\nDone. Version is now ${version}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});