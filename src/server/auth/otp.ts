/** Pure helpers for the OTP flow. Kept free of Next/Supabase imports for unit testing. */

export type SendOtpReason =
  "invalid_email" | "rate_limited" | "captcha_failed" | "unavailable" | "not_configured";
export type VerifyOtpReason = "bad_code" | "rate_limited" | "unavailable" | "not_configured";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const email = raw.trim().toLowerCase();
  if (email.length < 3 || email.length > 254 || !EMAIL_PATTERN.test(email)) return null;
  return email;
}

export function normalizeCode(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const code = raw.replace(/\s+/g, "");
  return /^\d{6}$/.test(code) ? code : null;
}

type AuthErrorLike = { status?: number; code?: string } | null | undefined;

/**
 * Maps Supabase Auth errors for the send step. Anything that could reveal whether an email
 * is registered is reported as success (non-enumeration, AC-O1, SR-H2).
 */
export function mapSendError(error: AuthErrorLike): SendOtpReason | null {
  if (!error) return null;
  if (
    error.status === 429 ||
    error.code === "over_email_send_rate_limit" ||
    error.code === "over_request_rate_limit"
  ) {
    return "rate_limited";
  }
  if (error.code === "captcha_failed") return "captcha_failed";
  if (error.status !== undefined && error.status >= 500) return "unavailable";
  if (error.code === "unexpected_failure" || error.status === 0) return "unavailable";
  return null; // e.g. signup disabled / user-specific errors: respond exactly like success
}

/**
 * Maps errors for the verify step. Supabase reports expired and wrong codes with the same
 * code (`otp_expired`), so both become "bad_code" and the UI offers "Send a new code" next to it.
 */
export function mapVerifyError(error: AuthErrorLike): VerifyOtpReason | null {
  if (!error) return null;
  if (error.status === 429 || error.code === "over_request_rate_limit") return "rate_limited";
  if (error.status !== undefined && error.status >= 500) return "unavailable";
  return "bad_code";
}
