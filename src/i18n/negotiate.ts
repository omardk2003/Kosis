import { defaultLocale, isLocale, type Locale } from "./config";

/**
 * Resolve the UI locale: explicit cookie choice first, then the browser's Accept-Language,
 * then the default. Pure function so it can be unit-tested (ADR-0009).
 */
export function negotiateLocale(
  cookieValue: string | undefined,
  acceptLanguage: string | null,
): Locale {
  if (isLocale(cookieValue)) return cookieValue;
  if (acceptLanguage) {
    const ranked = acceptLanguage
      .split(",")
      .map((part) => {
        const [tag = "", ...params] = part.trim().split(";");
        const qParam = params.find((p) => p.trim().startsWith("q="));
        const q = qParam ? Number.parseFloat(qParam.trim().slice(2)) : 1;
        return { base: tag.toLowerCase().split("-")[0] ?? "", q: Number.isFinite(q) ? q : 0 };
      })
      .filter((entry) => entry.q > 0)
      .sort((a, b) => b.q - a.q);
    for (const { base } of ranked) {
      if (isLocale(base)) return base;
    }
  }
  return defaultLocale;
}
