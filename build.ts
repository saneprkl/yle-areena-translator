import * as esbuild from "esbuild";
import { promises as fs } from "node:fs";
import path from "node:path";

const dist = "dist";
const staticDir = "static";
const isWatch = process.argv.includes("--watch");

async function copyStatic() {
  await fs.mkdir(dist, { recursive: true });

  async function copyDir(src: string, dest: string) {
    await fs.mkdir(dest, { recursive: true });
    const entries = await fs.readdir(src, { withFileTypes: true });
    await Promise.all(
      entries.map(async (e) => {
        const from = path.join(src, e.name);
        const to = path.join(dest, e.name);
        if (e.isDirectory()) return copyDir(from, to);
        if (e.isFile()) return fs.copyFile(from, to);
      })
    );
  }

  await copyDir(staticDir, dist);
}

async function buildOnce() {
  await copyStatic();

  // 1) Background service worker as ESM (MV3 "type":"module")
  await esbuild.build({
    entryPoints: { background: "src/background/index.ts" },
    outdir: dist,
    bundle: true,
    format: "esm",
    target: ["chrome114"],
    sourcemap: true
  });

  // 2) Content script + options page as single-file bundles
  await esbuild.build({
    entryPoints: {
      content: "src/content/index.ts",
      options: "src/ui/options/index.ts"
    },
    outdir: dist,
    bundle: true,
    format: "iife",
    target: ["chrome114"],
    sourcemap: true
  });
}

async function watch() {
  await copyStatic();

  const bg = await esbuild.context({
    entryPoints: { background: "src/background/index.ts" },
    outdir: dist,
    bundle: true,
    format: "esm",
    target: ["chrome114"],
    sourcemap: true
  });

  const rest = await esbuild.context({
    entryPoints: {
      content: "src/content/index.ts",
      options: "src/ui/options/index.ts"
    },
    outdir: dist,
    bundle: true,
    format: "iife",
    target: ["chrome114"],
    sourcemap: true
  });

  await bg.watch();
  await rest.watch();
  console.log("Watching… build output in /dist");
}

(async () => {
  try {
    if (isWatch) await watch();
    else {
      await buildOnce();
      console.log("Built to /dist");
    }
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
