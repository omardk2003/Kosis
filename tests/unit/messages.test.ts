import { describe, expect, it } from "vitest";
import en from "@content/messages/en.json";
import da from "@content/messages/da.json";

function flatten(obj: unknown, prefix = ""): Record<string, string> {
  const out: Record<string, string> = {};
  if (obj && typeof obj === "object") {
    for (const [k, v] of Object.entries(obj)) {
      const key = prefix ? `${prefix}.${k}` : k;
      if (typeof v === "string") out[key] = v;
      else Object.assign(out, flatten(v, key));
    }
  }
  return out;
}

/** Top-level ICU argument names, e.g. {seconds}. Good enough for simple args used in Phase 0. */
function placeholders(s: string): string[] {
  return [...s.matchAll(/\{\s*([A-Za-z_][\w]*)/g)].map((m) => m[1]!).sort();
}

const flatEn = flatten(en);
const flatDa = flatten(da);

describe("message catalogs", () => {
  it("en and da have identical key sets", () => {
    expect(Object.keys(flatDa).sort()).toEqual(Object.keys(flatEn).sort());
  });
  it("have no empty strings", () => {
    for (const [name, flat] of [
      ["en", flatEn],
      ["da", flatDa],
    ] as const) {
      for (const [k, v] of Object.entries(flat)) {
        expect(v.trim(), `${name}:${k}`).not.toBe("");
      }
    }
  });
  it("ICU placeholders match between languages", () => {
    for (const [k, v] of Object.entries(flatEn)) {
      expect(placeholders(flatDa[k] ?? ""), k).toEqual(placeholders(v));
    }
  });
  it("braces are balanced", () => {
    for (const [k, v] of [...Object.entries(flatEn), ...Object.entries(flatDa)]) {
      const open = (v.match(/\{/g) ?? []).length;
      const close = (v.match(/\}/g) ?? []).length;
      expect(open, k).toBe(close);
    }
  });
});
