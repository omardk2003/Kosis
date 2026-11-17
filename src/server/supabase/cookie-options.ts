import type { CookieOptionsWithName } from "@supabase/ssr";

type EnvSource = Record<string, string | undefined>;

/**
 * Session cookie flags for every Supabase client in the app (ADR-0001, ADR-0006).
 *
 * - httpOnly: the browser never reads the session. Safe because ALL Supabase Auth runs on the
 *   server (proxy, server components, server actions); there is no browser Supabase client.
 * - secure: always on Vercel (Preview + Production are HTTPS) and in any production build.
 *   Off only for `next dev` over plain http://localhost.
 * - sameSite=lax: sent on top-level navigation, not on cross-site subrequests.
 *
 * Supabase merges these over its defaults, so maxAge stays at its long default; the session
 * itself is bounded by Supabase's token lifetimes and refresh-token rotation.
 */
export function sessionCookieOptions(env: EnvSource = process.env): CookieOptionsWithName {
  return {
    path: "/",
    sameSite: "lax",
    httpOnly: true,
    secure: Boolean(env.VERCEL_ENV) || env.NODE_ENV === "production",
  };
}
