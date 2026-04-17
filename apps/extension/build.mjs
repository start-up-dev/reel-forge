// build.mjs — three-pass build for the Chrome MV3 extension.
// Pass 1: Vite builds popup + options HTML pages (React, Tailwind, code-split OK).
// Pass 2: esbuild bundles background service worker (single ESM file, inlined deps).
// Pass 3: esbuild bundles content script (single IIFE file, inlined deps).
// Finally copies manifest.json and icon placeholders into dist/.

import { build as viteBuild } from "vite";
import react from "@vitejs/plugin-react";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from "fs";
import { build as esbuild } from "esbuild";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Pass 1: HTML pages ────────────────────────────────────────────────────────

console.log("[1/3] Building popup + options pages…");
await viteBuild({
  root: __dirname,
  plugins: [react()],
  css: {
    postcss: resolve(__dirname, "postcss.config.cjs"),
  },
  build: {
    outDir: resolve(__dirname, "dist"),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, "popup/index.html"),
        options: resolve(__dirname, "options/index.html"),
      },
    },
  },
  configFile: false,
});

// ── Pass 2: Background service worker (ESM, fully inlined) ───────────────────

console.log("[2/3] Building background service worker…");
await esbuild({
  entryPoints: [resolve(__dirname, "src/background/index.ts")],
  bundle: true,
  format: "esm",
  outfile: resolve(__dirname, "dist/background/index.js"),
  platform: "browser",
  target: "chrome120",
  sourcemap: true,
  define: { "process.env.NODE_ENV": '"production"' },
  tsconfig: resolve(__dirname, "tsconfig.json"),
});

// ── Pass 3: Content script (IIFE, fully inlined) ──────────────────────────────

console.log("[3/3] Building content script…");
await esbuild({
  entryPoints: [resolve(__dirname, "src/content/index.ts")],
  bundle: true,
  format: "iife",
  globalName: "ReelForgeContent",
  outfile: resolve(__dirname, "dist/content/index.js"),
  platform: "browser",
  target: "chrome120",
  sourcemap: true,
  define: { "process.env.NODE_ENV": '"production"' },
  tsconfig: resolve(__dirname, "tsconfig.json"),
});

// ── Copy static assets ────────────────────────────────────────────────────────

copyFileSync(
  resolve(__dirname, "manifest.json"),
  resolve(__dirname, "dist/manifest.json"),
);

// Create icon placeholders (1×1 pixel PNGs) if real icons don't exist.
const iconsDir = resolve(__dirname, "dist/icons");
if (!existsSync(iconsDir)) mkdirSync(iconsDir, { recursive: true });

const PIXEL_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);
for (const size of [16, 48, 128]) {
  const dest = resolve(__dirname, `dist/icons/icon${size}.png`);
  if (!existsSync(dest)) writeFileSync(dest, PIXEL_PNG);
}

// Source icons override placeholders if they exist.
const srcIconsDir = resolve(__dirname, "public/icons");
if (existsSync(srcIconsDir)) {
  for (const size of [16, 48, 128]) {
    const src = resolve(srcIconsDir, `icon${size}.png`);
    if (existsSync(src)) {
      copyFileSync(src, resolve(__dirname, `dist/icons/icon${size}.png`));
    }
  }
}

console.log("✓ Extension built → dist/");
