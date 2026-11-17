import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const root = join(__dirname, "..");

// docs/product-spec.md section 9 (EN) plus Danish equivalents.
const BANNED = [
  "fail",
  "failed",
  "broke",
  "broken",
  "lost",
  "lazy",
  "should have",
  "streak",
  "don't lose",
  "catch up",
  "just 1 more",
  "fejlede",
  "mislykkedes",
  "tabt",
  "doven",
];

function esc(s: string) {
  return s
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    .replace(/'/g, "['\u2019]")
    .replace(/ /g, "\\s+");
}
const patterns = BANNED.map((w) => ({
  w,
  re: new RegExp(`(?<![\\p{L}\\p{N}])${esc(w)}(?![\\p{L}\\p{N}])`, "iu"),
}));

function strings(obj: unknown, prefix = ""): [string, string][] {
  if (typeof obj === "string") return [[prefix, obj]];
  if (obj && typeof obj === "object") {
    return Object.entries(obj).flatMap(([k, v]) => strings(v, prefix ? `${prefix}.${k}` : k));
  }
  return [];
}

type Item = { where: string; text: string };
const items: Item[] = [];
const messageItems: Item[] = [];
for (const f of readdirSync(join(root, "content/messages")).filter((f) => f.endsWith(".json"))) {
  const json = JSON.parse(readFileSync(join(root, "content/messages", f), "utf8"));
  for (const [k, v] of strings(json)) {
    items.push({ where: `messages/${f}:${k}`, text: v });
    messageItems.push({ where: `messages/${f}:${k}`, text: v });
  }
}
for (const f of readdirSync(join(root, "content/copy")).filter((f) => f.endsWith(".md"))) {
  readFileSync(join(root, "content/copy", f), "utf8")
    .split("\n")
    .forEach((line, i) => {
      items.push({ where: `copy/${f}:${i + 1}`, text: line });
    });
}

describe("copy lint (product-spec section 9)", () => {
  it("scans something", () => {
    expect(items.length).toBeGreaterThan(20);
  });
  it("contains no banned words", () => {
    const hits = items.flatMap(({ where, text }) =>
      patterns.filter((p) => p.re.test(text)).map((p) => `${where}: "${p.w}" in "${text}"`),
    );
    expect(hits).toEqual([]);
  });
  it("has no exclamation marks in message values", () => {
    const hits = messageItems
      .filter((i) => i.text.includes("!"))
      .map((i) => `${i.where}: ${i.text}`);
    expect(hits).toEqual([]);
  });
});
