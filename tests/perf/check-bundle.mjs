// Bundle check: gzip size of the JS loaded by "/" and "/sign-in".
// Measured 2026-11-11: an EMPTY Next.js 16.4.6 + React 19.3.1 App Router app ships 170.3 KB gzip, so the
// original 150 KB budget (110 KB internal target) is unreachable with the approved stack. Interim ceiling
// 185 KB = framework baseline + ~15 KB app budget, pending owner decision D7 (architecture §8).
// Run after `next build`. Starts `next start` on a spare port, reads <script src> from the HTML.
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import { join } from "node:path";

const LIMIT_KB = Number(process.env.BUNDLE_LIMIT_KB ?? 185);
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
      [...html.matchAll(/<script[^>]*\ssrc="([^"]*\/_next\/static\/[^"]+\.js[^"]*)"/g)].map(
        (m) => m[1],
      ),
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
