import { describe, expect, it } from "vitest";
import {
  PRODUCTION_SUPABASE_REF,
  ProductionDatabaseGuardError,
  assertDatabaseAllowed,
  isProductionSupabaseUrl,
  readSupabaseEnv,
} from "@/server/env";

const prodUrl = `https://${PRODUCTION_SUPABASE_REF}.supabase.co`;
const key = "sb_publishable_test";

describe("production database guard", () => {
  it("rejects the production ref when VERCEL_ENV is not production", () => {
    for (const vercelEnv of [undefined, "preview", "development", ""]) {
      expect(() =>
        readSupabaseEnv({
          NEXT_PUBLIC_SUPABASE_URL: prodUrl,
          NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: key,
          VERCEL_ENV: vercelEnv,
        }),
      ).toThrow(ProductionDatabaseGuardError);
    }
  });

  it("accepts the production ref only when VERCEL_ENV=production", () => {
    expect(
      readSupabaseEnv({
        NEXT_PUBLIC_SUPABASE_URL: prodUrl,
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: key,
        VERCEL_ENV: "production",
      }),
    ).toEqual({ url: prodUrl, publishableKey: key });
  });

  it("returns null when unset or incomplete", () => {
    expect(readSupabaseEnv({})).toBeNull();
    expect(readSupabaseEnv({ NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321" })).toBeNull();
    expect(readSupabaseEnv({ NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: key })).toBeNull();
    expect(
      readSupabaseEnv({
        NEXT_PUBLIC_SUPABASE_URL: "  ",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: key,
      }),
    ).toBeNull();
  });

  it("accepts local and staging URLs", () => {
    for (const url of [
      "http://127.0.0.1:54321",
      "http://localhost:54321",
      "https://stagingref123.supabase.co",
    ]) {
      expect(
        readSupabaseEnv({
          NEXT_PUBLIC_SUPABASE_URL: url,
          NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: key,
        }),
      ).toEqual({
        url,
        publishableKey: key,
      });
    }
  });

  it("treats a malformed URL as non-production (no throw from the guard)", () => {
    expect(isProductionSupabaseUrl("not a url")).toBe(false);
    expect(() => assertDatabaseAllowed("not a url", {})).not.toThrow();
  });

  it("does not match the ref appearing outside the first hostname label", () => {
    expect(isProductionSupabaseUrl(`https://evil.${PRODUCTION_SUPABASE_REF}.example.com`)).toBe(
      false,
    );
    expect(isProductionSupabaseUrl(`https://example.com/${PRODUCTION_SUPABASE_REF}`)).toBe(false);
  });
});
