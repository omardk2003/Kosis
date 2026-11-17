/**
 * Environment access and the production guard (ADR-0007, SR-H4).
 * No secrets live here: the Supabase URL and publishable key are public by design.
 */

/** Reference of the production Supabase project ("Kosis Project"). Not a secret. */
export const PRODUCTION_SUPABASE_REF = "byzvifolcjdugbogvkpz";

export type SupabaseEnv = { url: string; publishableKey: string };

type EnvSource = Record<string, string | undefined>;

export class ProductionDatabaseGuardError extends Error {
  constructor() {
    super(
      "Refusing to use the production Supabase project outside the Vercel production environment.",
    );
    this.name = "ProductionDatabaseGuardError";
  }
}

export function isProductionSupabaseUrl(url: string): boolean {
  try {
    return new URL(url).hostname.split(".")[0] === PRODUCTION_SUPABASE_REF;
  } catch {
    return false;
  }
}

/** Throws when a non-production build or test points at the production database. */
export function assertDatabaseAllowed(url: string, env: EnvSource): void {
  if (isProductionSupabaseUrl(url) && env.VERCEL_ENV !== "production") {
    throw new ProductionDatabaseGuardError();
  }
}

/** Returns null when Supabase isn't configured (e.g. a preview without staging), so the UI can say so. */
export function readSupabaseEnv(env: EnvSource = process.env): SupabaseEnv | null {
  const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !publishableKey) return null;
  assertDatabaseAllowed(url, env);
  return { url, publishableKey };
}

/**
 * Cloudflare's official Turnstile test site keys all look like `1x…AA`, `2x…AB`, `3x…FF`:
 * a digit 1–3, "x", twenty zeros, two letters. They always pass/fail and give no protection.
 */
const TURNSTILE_TEST_SITE_KEY = /^[1-3]x0{20}[A-Za-z]{2}$/;

export function isTurnstileTestSiteKey(key: string): boolean {
  return TURNSTILE_TEST_SITE_KEY.test(key);
}

export class TurnstileProductionGuardError extends Error {
  constructor(reason: "missing" | "test-key") {
    super(
      reason === "missing"
        ? "Refusing sign-in: no Turnstile site key is configured in the production environment."
        : "Refusing sign-in: a Cloudflare Turnstile TEST site key is configured in the production environment.",
    );
    this.name = "TurnstileProductionGuardError";
  }
}

/**
 * Turnstile site key for the sign-in flow (ADR-0006, D5).
 * In Vercel Production it must be present and must not be a Cloudflare test key; otherwise sign-in
 * fails closed. Preview (VERCEL_ENV=preview) and local development (VERCEL_ENV unset) may use test
 * keys or none at all.
 */
export function readTurnstileSiteKey(env: EnvSource = process.env): string | null {
  const key = env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() || null;
  if (env.VERCEL_ENV === "production") {
    if (!key) throw new TurnstileProductionGuardError("missing");
    if (isTurnstileTestSiteKey(key)) throw new TurnstileProductionGuardError("test-key");
  }
  return key;
}
