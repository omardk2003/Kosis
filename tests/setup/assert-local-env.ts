/**
 * Guard for Playwright globalSetup: tests must only ever talk to the local Supabase stack
 * (docs/testing-strategy.md section 3, ADR-0007).
 */
const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost"]);

export function assertLocalEnv(env: Record<string, string | undefined> = process.env): void {
  const raw = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!raw) return;
  let host: string;
  try {
    host = new URL(raw).hostname;
  } catch {
    throw new Error("Refusing to run tests: NEXT_PUBLIC_SUPABASE_URL is not a valid URL.");
  }
  if (!LOCAL_HOSTS.has(host)) {
    throw new Error(
      `Refusing to run tests: NEXT_PUBLIC_SUPABASE_URL host "${host}" is not 127.0.0.1 or localhost.`,
    );
  }
}

export default function globalSetup(): void {
  assertLocalEnv();
}
