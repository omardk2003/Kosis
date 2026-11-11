import { createServerClient } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";
import { readSupabaseEnv } from "../env";

/**
 * Refreshes the Supabase session inside the proxy and reports whether the caller is signed in.
 * `makeResponse` rebuilds the pass-through response after cookies change (Supabase SSR pattern).
 */
export async function refreshSession(
  request: NextRequest,
  makeResponse: () => NextResponse,
): Promise<{ response: NextResponse; signedIn: boolean; configured: boolean }> {
  let response = makeResponse();
  const env = readSupabaseEnv();
  if (!env) return { response, signedIn: false, configured: false };

  const supabase = createServerClient(env.url, env.publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = makeResponse();
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
        for (const [key, value] of Object.entries(headers ?? {})) {
          response.headers.set(key, String(value));
        }
      },
    },
  });

  // Do not add code between client creation and getClaims (Supabase SSR guidance).
  const { data } = await supabase.auth.getClaims();
  return { response, signedIn: Boolean(data?.claims?.sub), configured: true };
}
