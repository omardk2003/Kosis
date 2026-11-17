/**
 * Content-Security-Policy builder (ADR-0001, SR-M3). A per-request nonce is set by the proxy;
 * Next.js applies it to its own scripts. Turnstile is the only third-party origin.
 */
export function buildCsp(nonce: string, isDev: boolean): string {
  const turnstile = "https://challenges.cloudflare.com";
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": [
      "'self'",
      `'nonce-${nonce}'`,
      "'strict-dynamic'",
      turnstile,
      ...(isDev ? ["'unsafe-eval'"] : []),
    ],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:"],
    "font-src": ["'self'"],
    "connect-src": ["'self'", turnstile, ...(isDev ? ["ws:"] : [])],
    "frame-src": [turnstile],
    "worker-src": ["'self'"],
    "manifest-src": ["'self'"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
  };
  const policy = Object.entries(directives)
    .map(([key, values]) => `${key} ${values.join(" ")}`)
    .join("; ");
  return isDev ? policy : `${policy}; upgrade-insecure-requests`;
}
