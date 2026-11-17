import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const msg = (l: "en" | "da") =>
  JSON.parse(readFileSync(join(__dirname, `../content/messages/${l}.json`), "utf8")) as Record<
    string,
    Record<string, string>
  >;
const en = msg("en");
const da = msg("da");

test.describe("smoke", () => {
  test("home renders app name and tagline", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1, name: en.common!.appName })).toBeVisible();
    await expect(page.getByText(en.home!.tagline!)).toBeVisible();
  });

  test("language switch EN to DA changes text and html lang", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await page.getByRole("button", { name: da.common!.languageDanish! }).click();
    await expect(page.locator("html")).toHaveAttribute("lang", "da");
    await expect(page.getByText(da.home!.tagline!)).toBeVisible();
    await expect(page.getByText(en.home!.tagline!)).toHaveCount(0);
  });

  test("/today unauthenticated redirects to /sign-in", async ({ page }) => {
    await page.goto("/today");
    await expect(page).toHaveURL(/\/sign-in$/);
  });

  test("sign-in has labelled email input and a primary button >= 44px", async ({ page }) => {
    await page.goto("/sign-in");
    await expect(page.getByLabel(en.signIn!.emailLabel!, { exact: true })).toBeVisible();
    const btn = page.getByRole("button", { name: en.signIn!.sendCode! });
    await expect(btn).toBeVisible();
    const box = await btn.boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(44);
    expect(box!.width).toBeGreaterThanOrEqual(44);
  });

  test("manifest is valid", async ({ request }) => {
    const res = await request.get("/manifest.webmanifest");
    expect(res.ok()).toBe(true);
    const m = await res.json();
    expect(m.name).toBeTruthy();
    expect(m.start_url).toBeTruthy();
    expect(m.display).toBe("standalone");
    const sizes = (m.icons as { sizes: string }[]).map((i) => i.sizes);
    expect(sizes).toContain("192x192");
    expect(sizes).toContain("512x512");
    for (const icon of m.icons as { src: string }[]) {
      expect((await request.get(icon.src)).ok(), icon.src).toBe(true);
    }
  });

  test("CSP header has a nonce and frame-ancestors 'none', fresh per request", async ({
    request,
  }) => {
    const a = (await request.get("/sign-in")).headers()["content-security-policy"];
    const b = (await request.get("/sign-in")).headers()["content-security-policy"];
    expect(a).toBeTruthy();
    expect(a).toMatch(/script-src[^;]*'nonce-[A-Za-z0-9+/=]+'/);
    expect(a).toContain("frame-ancestors 'none'");
    expect(a).not.toContain("'unsafe-eval'");
    expect(a).not.toBe(b);
  });

  for (const path of ["/", "/sign-in", "/offline"]) {
    test(`axe: no serious/critical violations on ${path}`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator("main")).toBeVisible();
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze();
      const bad = results.violations.filter(
        (v) => v.impact === "serious" || v.impact === "critical",
      );
      expect(
        bad.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`),
      ).toEqual([]);
    });
  }

  for (const path of ["/", "/sign-in", "/offline"]) {
    test(`no horizontal scroll at 360px on ${path}`, async ({ page }) => {
      await page.setViewportSize({ width: 360, height: 640 });
      await page.goto(path);
      const { sw, cw } = await page.evaluate(() => ({
        sw: document.documentElement.scrollWidth,
        cw: document.documentElement.clientWidth,
      }));
      expect(sw).toBeLessThanOrEqual(cw);
    });
  }
});
