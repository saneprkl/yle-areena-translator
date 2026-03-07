import * as esbuild from "esbuild";
import { promises as fs } from "node:fs";
import path from "node:path";
import { createLogger } from "./src/global/logger";

const log = createLogger("build");

const dist = "dist";
const staticDir = "static";
const isWatch = process.argv.includes("--watch");

const copyStatic = async (): Promise<void> => {
  await fs.mkdir(dist, { recursive: true });

  const copyDir = async (src: string, dest: string): Promise<void> => {
    await fs.mkdir(dest, { recursive: true });
    const entries = await fs.readdir(src, { withFileTypes: true });
    await Promise.all(
      entries.map(async (e) => {
        const from = path.join(src, e.name);
        const to = path.join(dest, e.name);
        if (e.isDirectory()) return copyDir(from, to);
        if (e.isFile()) return fs.copyFile(from, to);
      }),
    );
  };

  await copyDir(staticDir, dist);
};

const buildOnce = async (): Promise<void> => {
  await copyStatic();

  await esbuild.build({
    entryPoints: { background: "src/background/index.ts" },
    outdir: dist,
    bundle: true,
    format: "esm",
    target: ["chrome114"],
    sourcemap: true,
  });

  await esbuild.build({
    entryPoints: {
      content: "src/content/index.ts",
      options: "src/ui/options/index.ts",
    },
    outdir: dist,
    bundle: true,
    format: "iife",
    target: ["chrome114"],
    sourcemap: true,
  });
};

const watch = async (): Promise<void> => {
  await copyStatic();

  const bg = await esbuild.context({
    entryPoints: { background: "src/background/index.ts" },
    outdir: dist,
    bundle: true,
    format: "esm",
    target: ["chrome114"],
    sourcemap: true,
  });

  const rest = await esbuild.context({
    entryPoints: {
      content: "src/content/index.ts",
      options: "src/ui/options/index.ts",
    },
    outdir: dist,
    bundle: true,
    format: "iife",
    target: ["chrome114"],
    sourcemap: true,
  });

  await bg.watch();
  await rest.watch();
  log.info("Watching… build output in /dist");
};

const main = async (): Promise<void> => {
  if (isWatch) await watch();
  else {
    await buildOnce();
    log.info("Built to /dist");
  }
};

void main().catch((e: unknown) => {
  log.error("Build failed", e);
  process.exit(1);
});
