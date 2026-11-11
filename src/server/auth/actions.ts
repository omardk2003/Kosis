"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../supabase/server";
import {
  mapSendError,
  mapVerifyError,
  normalizeCode,
  normalizeEmail,
  type SendOtpReason,
  type VerifyOtpReason,
} from "./otp";

export type SignInState =
  | { step: "email"; error?: SendOtpReason }
  | { step: "code"; email: string; sentAt: number; error?: VerifyOtpReason | SendOtpReason };

/** Step 1: send a one-time code. Same response whether or not the email is registered. */
export async function sendOtp(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const email = normalizeEmail(formData.get("email"));
  if (!email) return { step: "email", error: "invalid_email" };

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { step: "email", error: "not_configured" };

  const captchaToken = formData.get("cf-turnstile-response");
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      captchaToken: typeof captchaToken === "string" && captchaToken ? captchaToken : undefined,
    },
  });
  const reason = mapSendError(error);
  if (reason) return { step: "email", error: reason };
  return { step: "code", email, sentAt: Date.now() };
}

/** Step 2: verify the code; on success go to Today. */
export async function verifyOtp(prev: SignInState, formData: FormData): Promise<SignInState> {
  if (prev.step !== "code") return prev;
  const code = normalizeCode(formData.get("code"));
  if (!code) return { ...prev, error: "bad_code" };

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ...prev, error: "not_configured" };

  const { error } = await supabase.auth.verifyOtp({
    email: prev.email,
    token: code,
    type: "email",
  });
  const reason = mapVerifyError(error);
  if (reason) return { ...prev, error: reason };
  redirect("/today");
}

/** Resend from the code step (still subject to the 60 s server-side frequency limit). */
export async function resendOtp(prev: SignInState, formData: FormData): Promise<SignInState> {
  if (prev.step !== "code") return prev;
  const fd = new FormData();
  fd.set("email", prev.email);
  const token = formData.get("cf-turnstile-response");
  if (typeof token === "string") fd.set("cf-turnstile-response", token);
  const next = await sendOtp({ step: "email" }, fd);
  return next.step === "code" ? next : { ...prev, error: next.error };
}

export async function signOut(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  if (supabase) await supabase.auth.signOut();
  // The sign-in page purges service-worker caches when it sees ?signedOut=1 (ADR-0008).
  redirect("/sign-in?signedOut=1");
}

/** Single entry point for the two-step form; `intent` selects the step (one useActionState). */
export async function signInStep(prev: SignInState, formData: FormData): Promise<SignInState> {
  switch (formData.get("intent")) {
    case "verify":
      return verifyOtp(prev, formData);
    case "resend":
      return resendOtp(prev, formData);
    case "restart":
      return { step: "email" };
    default:
      return sendOtp(prev, formData);
  }
}
