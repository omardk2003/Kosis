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

export function readTurnstileSiteKey(env: EnvSource = process.env): string | null {
  const key = env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim();
  return key ? key : null;
}
