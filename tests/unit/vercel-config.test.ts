import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// Vercel rule: a branch deploys if ANY matching rule is true; unmatched branches default to true.
const config = JSON.parse(readFileSync(join(__dirname, "../../vercel.json"), "utf8")) as {
  regions: string[];
  git: { deploymentEnabled: Record<string, boolean> };
};

describe("vercel.json deployment control (ADR-0007)", () => {
  const rules = config.git.deploymentEnabled;
  it("disables every branch by default with a catch-all that also matches slashes", () => {
    expect(rules["**"]).toBe(false);
  });
  it("enables only the Phase 0 preview branch", () => {
    const enabled = Object.entries(rules)
      .filter(([, on]) => on)
      .map(([pattern]) => pattern);
    expect(enabled).toEqual(["claude/project-setup"]);
  });
  it("never enables main (production)", () => {
    expect(rules["main"]).not.toBe(true);
    expect(Object.keys(rules).some((p) => p !== "**" && /main/.test(p) && rules[p])).toBe(false);
  });
  it("pins the Dublin region next to Supabase EU", () => {
    expect(config.regions).toEqual(["dub1"]);
  });
});
