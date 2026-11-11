// Bundle check: gzip size of the JS a modern browser loads for "/" and "/sign-in" (architecture §8).
// Budget: 150 KB gzip hard limit. `noModule` polyfills are excluded (modern browsers skip them).
// Reference: an empty Next.js 16.4.6 + React 19.3.1 App Router app is ~132 KB by this measure, so app-owned
// client JS should stay within ~20 KB of that baseline (ADR-0001).
// Run after `next build`. Starts `next start` on a spare port, reads <script src> from the HTML.
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import { join } from "node:path";

const LIMIT_KB = Number(process.env.BUNDLE_LIMIT_KB ?? 150);
const PORT = Number(process.env.BUNDLE_PORT ?? 3111);
const root = process.cwd();
const base = `http://127.0.0.1:${PORT}`;

const server = spawn("npx", ["next", "start", "-p", String(PORT)], {
  cwd: root,
  stdio: "ignore",
  env: { ...process.env },
});
const stop = () => server.kill("SIGTERM");
process.on("exit", stop);

async function waitUp() {
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(base + "/offline")).ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("next start did not come up");
}

async function routeSize(path) {
  const html = await (await fetch(base + path)).text();
  const srcs = [
    ...new Set(
      [...html.matchAll(/<script([^>]*)\ssrc="([^"]*\/_next\/static\/[^"]+\.js[^"]*)"([^>]*)>/g)]
        // Skip `noModule` legacy polyfills: modern browsers never download them.
        .filter((m) => !/\bnomodule\b/i.test(`${m[1]} ${m[3]}`))
        .map((m) => m[2]),
    ),
  ];
  let total = 0;
  const files = [];
  for (const src of srcs) {
    const rel = decodeURIComponent(src.split("?")[0]).replace(/^.*?\/_next\//, "");
    const buf = await readFile(join(root, ".next", rel));
    const gz = gzipSync(buf, { level: 9 }).length;
    total += gz;
    files.push({ rel, gz });
  }
  return { path, total, files };
}

let failed = false;
try {
  await waitUp();
  for (const path of ["/", "/sign-in"]) {
    const r = await routeSize(path);
    const kb = r.total / 1024;
    console.log(
      `${path}: ${r.files.length} chunks, ${kb.toFixed(1)} KB gzip (limit ${LIMIT_KB} KB)`,
    );
    for (const f of r.files.sort((a, b) => b.gz - a.gz).slice(0, 5))
      console.log(`  ${(f.gz / 1024).toFixed(1)} KB ${f.rel}`);
    if (r.files.length === 0) {
      console.error(`  no script chunks found for ${path}`);
      failed = true;
    }
    if (kb > LIMIT_KB) failed = true;
  }
} catch (e) {
  console.error(e);
  failed = true;
} finally {
  stop();
}
process.exit(failed ? 1 : 0);
