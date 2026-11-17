import { describe, expect, it } from "vitest";
import { sessionCookieOptions } from "@/server/supabase/cookie-options";

describe("sessionCookieOptions", () => {
  it("is always httpOnly with SameSite=Lax on path /", () => {
    for (const env of [{}, { NODE_ENV: "production" }, { VERCEL_ENV: "preview" }]) {
      expect(sessionCookieOptions(env)).toMatchObject({
        httpOnly: true,
        sameSite: "lax",
        path: "/",
      });
    }
  });
  it("is Secure on Vercel Preview and Production and in production builds", () => {
    expect(sessionCookieOptions({ VERCEL_ENV: "preview" }).secure).toBe(true);
    expect(sessionCookieOptions({ VERCEL_ENV: "production" }).secure).toBe(true);
    expect(sessionCookieOptions({ NODE_ENV: "production" }).secure).toBe(true);
  });
  it("is not Secure only for `next dev` on plain http://localhost", () => {
    expect(sessionCookieOptions({ NODE_ENV: "development" }).secure).toBe(false);
  });
});
