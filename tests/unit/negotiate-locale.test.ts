import { describe, expect, it } from "vitest";
import { negotiateLocale } from "@/i18n/negotiate";

describe("negotiateLocale", () => {
  it("cookie wins over Accept-Language", () => {
    expect(negotiateLocale("en", "da-DK,da;q=0.9")).toBe("en");
    expect(negotiateLocale("da", "en-US")).toBe("da");
  });
  it("ignores an invalid cookie", () => {
    expect(negotiateLocale("fr", "da")).toBe("da");
    expect(negotiateLocale("", null)).toBe("en");
  });
  it("maps da-DK to da", () => {
    expect(negotiateLocale(undefined, "da-DK")).toBe("da");
  });
  it("respects q-values regardless of order", () => {
    expect(negotiateLocale(undefined, "en;q=0.5,da;q=0.9")).toBe("da");
    expect(negotiateLocale(undefined, "da;q=0.2,en;q=0.8")).toBe("en");
  });
  it("skips q=0 and unknown languages", () => {
    expect(negotiateLocale(undefined, "da;q=0,en")).toBe("en");
    expect(negotiateLocale(undefined, "fr-FR,de;q=0.8,da;q=0.5")).toBe("da");
  });
  it("falls back to en for unknown or missing header", () => {
    expect(negotiateLocale(undefined, "fr-FR,de")).toBe("en");
    expect(negotiateLocale(undefined, null)).toBe("en");
    expect(negotiateLocale(undefined, "*")).toBe("en");
    expect(negotiateLocale(undefined, "da;q=abc")).toBe("en");
  });
});
