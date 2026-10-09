import { execSync } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { createLogger } from "../src/global/logger";

type Bump = "patch" | "minor" | "major";

type PackageJson = {
  version: string;
};

type ManifestJson = {
  version: string;
  [key: string]: unknown;
};

const log = createLogger("scripts/bumpVersion");

const fileExists = async (p: string): Promise<boolean> => {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
};

const updateManifestVersion = async (
  manifestPath: string,
  version: string,
): Promise<void> => {
  const raw = await fs.readFile(manifestPath, "utf8");
  const manifest = JSON.parse(raw) as ManifestJson;

  manifest.version = version;

  await fs.writeFile(
    manifestPath,
    JSON.stringify(manifest, null, 2) + "\n",
    "utf8",
  );
  log.info(`Updated ${manifestPath} -> ${version}`);
};

const main = async (): Promise<void> => {
  const bump = process.argv[2] as Bump | undefined;
  if (!bump || !["patch", "minor", "major"].includes(bump)) {
    log.error("Usage: npx tsx scripts/bumpVersion.ts <patch|minor|major>");
    process.exit(1);
  }

  // Bump version
  execSync(`npm version ${bump} --no-git-tag-version`, { stdio: "inherit" });

  const pkg = JSON.parse(
    await fs.readFile("package.json", "utf8"),
  ) as PackageJson;
  const version: string = pkg.version;

  // Sync manifest
  const manifestStatic = path.join("static", "manifest.json");
  if (!(await fileExists(manifestStatic))) {
    throw new Error(
      `Missing ${manifestStatic} (expected your source manifest here)`,
    );
  }
  await updateManifestVersion(manifestStatic, version);

  log.info(`\nDone. Version is now ${version}`);
};

void main().catch((e: unknown) => {
  log.error("bumpVersion failed", e);
  process.exit(1);
});
