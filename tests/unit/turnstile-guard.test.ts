import { describe, expect, it } from "vitest";
import {
  isTurnstileTestSiteKey,
  readTurnstileSiteKey,
  TurnstileProductionGuardError,
} from "@/server/env";

// Cloudflare's documented Turnstile test site keys.
const TEST_KEYS = [
  "1x00000000000000000000AA",
  "2x00000000000000000000AB",
  "1x00000000000000000000BB",
  "2x00000000000000000000BB",
  "3x00000000000000000000FF",
];
const REAL_LOOKING_KEY = "0x4AAAAAAAAbCdEfGhIjKlMn";

describe("isTurnstileTestSiteKey", () => {
  it.each(TEST_KEYS)("recognises %s as a test key", (key) => {
    expect(isTurnstileTestSiteKey(key)).toBe(true);
  });
  it("does not flag a real-looking key", () => {
    expect(isTurnstileTestSiteKey(REAL_LOOKING_KEY)).toBe(false);
  });
});

describe("readTurnstileSiteKey in Vercel Production", () => {
  const prod = (key?: string) => ({
    VERCEL_ENV: "production",
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: key,
  });

  it.each(TEST_KEYS)("rejects test key %s", (key) => {
    expect(() => readTurnstileSiteKey(prod(key))).toThrow(TurnstileProductionGuardError);
  });
  it("rejects a missing key (CAPTCHA would be off)", () => {
    expect(() => readTurnstileSiteKey(prod(undefined))).toThrow(TurnstileProductionGuardError);
    expect(() => readTurnstileSiteKey(prod("   "))).toThrow(TurnstileProductionGuardError);
  });
  it("accepts a real key", () => {
    expect(readTurnstileSiteKey(prod(REAL_LOOKING_KEY))).toBe(REAL_LOOKING_KEY);
  });
});

describe("readTurnstileSiteKey outside production is unaffected", () => {
  it.each(TEST_KEYS)("Vercel Preview (staging) may use test key %s", (key) => {
    expect(
      readTurnstileSiteKey({ VERCEL_ENV: "preview", NEXT_PUBLIC_TURNSTILE_SITE_KEY: key }),
    ).toBe(key);
  });
  it("local development may use a test key or none", () => {
    expect(readTurnstileSiteKey({ NEXT_PUBLIC_TURNSTILE_SITE_KEY: TEST_KEYS[0] })).toBe(
      TEST_KEYS[0],
    );
    expect(readTurnstileSiteKey({})).toBeNull();
    expect(readTurnstileSiteKey({ VERCEL_ENV: "development" })).toBeNull();
  });
});
