import { describe, expect, it } from "vitest";
import { mapSendError, mapVerifyError, normalizeCode, normalizeEmail } from "@/server/auth/otp";

describe("normalizeEmail", () => {
  it("trims and lowercases", () => {
    expect(normalizeEmail("  Name@Example.COM ")).toBe("name@example.com");
  });
  it("rejects invalid input", () => {
    for (const bad of [
      "",
      "a",
      "no-at.com",
      "a@b",
      "a b@c.de",
      "@x.com",
      42,
      null,
      undefined,
      "a@".padEnd(260, "x") + ".com",
    ]) {
      expect(normalizeEmail(bad)).toBeNull();
    }
  });
});

describe("normalizeCode", () => {
  it("strips whitespace", () => {
    expect(normalizeCode("123 456")).toBe("123456");
    expect(normalizeCode(" 123456\n")).toBe("123456");
  });
  it("requires exactly 6 digits", () => {
    for (const bad of ["12345", "1234567", "12345a", "", "12-3456", 123456, null]) {
      expect(normalizeCode(bad)).toBeNull();
    }
  });
});

describe("mapSendError (non-enumeration)", () => {
  it("returns null on success", () => {
    expect(mapSendError(null)).toBeNull();
    expect(mapSendError(undefined)).toBeNull();
  });
  it("maps user-specific errors to null so the response looks like success", () => {
    for (const code of [
      "signup_disabled",
      "user_not_found",
      "email_address_invalid",
      "user_banned",
      "email_exists",
    ]) {
      expect(mapSendError({ status: 400, code })).toBeNull();
      expect(mapSendError({ status: 422, code })).toBeNull();
    }
  });
  it("maps rate limits, captcha and outages", () => {
    expect(mapSendError({ status: 429 })).toBe("rate_limited");
    expect(mapSendError({ code: "over_email_send_rate_limit" })).toBe("rate_limited");
    expect(mapSendError({ code: "over_request_rate_limit" })).toBe("rate_limited");
    expect(mapSendError({ code: "captcha_failed" })).toBe("captcha_failed");
    expect(mapSendError({ status: 500 })).toBe("unavailable");
    expect(mapSendError({ status: 503 })).toBe("unavailable");
    expect(mapSendError({ status: 0 })).toBe("unavailable");
    expect(mapSendError({ code: "unexpected_failure" })).toBe("unavailable");
  });
});

describe("mapVerifyError", () => {
  it("returns null on success", () => {
    expect(mapVerifyError(null)).toBeNull();
  });
  it("maps wrong and expired codes to bad_code", () => {
    expect(mapVerifyError({ status: 403, code: "otp_expired" })).toBe("bad_code");
    expect(mapVerifyError({ status: 400, code: "validation_failed" })).toBe("bad_code");
    expect(mapVerifyError({})).toBe("bad_code");
  });
  it("maps rate limit and server errors", () => {
    expect(mapVerifyError({ status: 429 })).toBe("rate_limited");
    expect(mapVerifyError({ code: "over_request_rate_limit" })).toBe("rate_limited");
    expect(mapVerifyError({ status: 502 })).toBe("unavailable");
  });
});
