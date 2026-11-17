import { NextResponse, type NextRequest } from "next/server";
import { buildCsp } from "./server/csp";
import { refreshSession } from "./server/supabase/proxy-session";

const PROTECTED_PREFIXES = ["/today"];

/**
 * Next.js 16 proxy (formerly middleware): CSP nonce + Supabase session refresh + auth redirects.
 * Authorization never relies on this alone: protected pages re-check with getClaims (ADR-0006).
 */
export async function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = buildCsp(nonce, process.env.NODE_ENV === "development");

  const makeResponse = () => {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-nonce", nonce);
    requestHeaders.set("content-security-policy", csp);
    const res = NextResponse.next({ request: { headers: requestHeaders } });
    res.headers.set("content-security-policy", csp);
    return res;
  };

  const { response, signedIn } = await refreshSession(request, makeResponse);
  const path = request.nextUrl.pathname;
  const isProtected = PROTECTED_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));

  if (isProtected && !signedIn) return redirectKeepingCookies(request, response, "/sign-in");
  if (path === "/sign-in" && signedIn) return redirectKeepingCookies(request, response, "/today");
  return response;
}

function redirectKeepingCookies(request: NextRequest, from: NextResponse, to: string) {
  const redirect = NextResponse.redirect(new URL(to, request.url));
  for (const cookie of from.cookies.getAll()) redirect.cookies.set(cookie);
  return redirect;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
