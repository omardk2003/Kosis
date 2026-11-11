"use client";

import { useActionState, useEffect, useId, useRef, useState, type FormEvent } from "react";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { signInStep, type SignInState } from "@/server/auth/actions";
import { OfflineBanner } from "@/components/offline-banner";
import { useOnline } from "@/components/use-online";
import { purgeAppCaches } from "./purge-caches";

const RESEND_SECONDS = 60;

type ErrorKey =
  | "errors.invalidEmail"
  | "errors.badCode"
  | "errors.rateLimited"
  | "errors.captchaFailed"
  | "errors.unavailable";

/** Pre-translated strings from the server (keeps next-intl's runtime out of the client bundle). */
export type SignInCopy = Record<
  | "emailLabel"
  | "emailHint"
  | "sendCode"
  | "sending"
  | "codeSentNeutral"
  | "codeLabel"
  | "verify"
  | "verifying"
  | "resend"
  | "resendIn"
  | "useDifferentEmail"
  | "captchaLabel"
  | ErrorKey
  | "errors.offline"
  | "offlineBanner",
  string
>;

type Props = {
  configured: boolean;
  turnstileSiteKey: string | null;
  purgeCaches: boolean;
  locale: string;
  copy: SignInCopy;
};

/**
 * Two-step email OTP sign-in (docs/screens/sign-in.md). Inputs are controlled so nothing typed
 * is lost after a server error; focus moves to the field that needs attention (WCAG 2.4.3).
 */
export function SignInForm({ configured, turnstileSiteKey, purgeCaches, locale, copy }: Props) {
  const t = (key: keyof SignInCopy, values?: Record<string, string | number>) =>
    Object.entries(values ?? {}).reduce(
      (text, [name, value]) => text.replace(`{${name}}`, String(value)),
      copy[key],
    );
  const online = useOnline();
  const ids = { email: useId(), code: useId(), hint: useId(), error: useId(), offline: useId() };
  const turnstileRef = useRef<TurnstileInstance>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const codeRef = useRef<HTMLInputElement>(null);

  const [state, action, busy] = useActionState(signInStep, { step: "email" } as SignInState);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");

  useEffect(() => {
    if (purgeCaches) void purgeAppCaches();
  }, [purgeCaches]);

  // After every server response: reset the single-use CAPTCHA token and move focus.
  useEffect(() => {
    turnstileRef.current?.reset();
    if (state.step === "code") {
      codeRef.current?.focus();
      if (state.error) codeRef.current?.select();
    } else if (state.error) {
      emailRef.current?.focus();
    }
  }, [state]);

  const secondsLeft = useCountdown(state.step === "code" ? state.sentAt : null);
  const errorKey = !configured ? "errors.unavailable" : errorMessageKey(state.error);
  const blocked = !online || !configured || busy;
  const describedBy = (...parts: (string | false | null | undefined)[]) =>
    parts.filter(Boolean).join(" ") || undefined;
  const preventIfBlocked = (event: FormEvent<HTMLFormElement>) => {
    if (blocked) event.preventDefault();
  };

  const captcha = turnstileSiteKey ? (
    <div aria-label={t("captchaLabel")} className="min-h-[65px]">
      <Turnstile
        ref={turnstileRef}
        siteKey={turnstileSiteKey}
        options={{ language: locale, theme: "auto", size: "flexible" }}
      />
    </div>
  ) : null;

  const errorLine = errorKey ? (
    <p id={ids.error} role="alert" className="text-sm font-medium">
      {t(errorKey)}
    </p>
  ) : null;
  const offlineLine = !online ? (
    <p id={ids.offline} className="text-sm text-text-muted">
      {t("errors.offline")}
    </p>
  ) : null;

  if (state.step === "email") {
    return (
      <form action={action} onSubmit={preventIfBlocked} className="flex flex-col gap-3" noValidate>
        <OfflineBanner text={copy.offlineBanner} />
        <input type="hidden" name="intent" value="send" />
        <label htmlFor={ids.email} className="font-medium">
          {t("emailLabel")}
        </label>
        <p id={ids.hint} className="text-sm text-text-muted">
          {t("emailHint")}
        </p>
        <input
          ref={emailRef}
          id={ids.email}
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="field-input"
          aria-describedby={describedBy(ids.hint, errorKey && ids.error)}
          aria-invalid={errorKey === "errors.invalidEmail" || undefined}
        />
        {errorLine}
        {captcha}
        {offlineLine}
        <button
          type="submit"
          className="btn btn-primary mt-2"
          aria-disabled={blocked}
          aria-describedby={describedBy(!online && ids.offline)}
        >
          {busy ? t("sending") : t("sendCode")}
        </button>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <OfflineBanner text={copy.offlineBanner} />
      <p role="status">{t("codeSentNeutral")}</p>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium break-all">{state.email}</span>
        <form action={action}>
          <input type="hidden" name="intent" value="restart" />
          <button type="submit" className="btn btn-text px-0" disabled={busy}>
            {t("useDifferentEmail")}
          </button>
        </form>
      </div>
      <form action={action} onSubmit={preventIfBlocked} className="flex flex-col gap-3" noValidate>
        <input type="hidden" name="intent" value="verify" />
        <label htmlFor={ids.code} className="font-medium">
          {t("codeLabel")}
        </label>
        <input
          ref={codeRef}
          id={ids.code}
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          required
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          className="field-input tracking-[0.4em]"
          aria-describedby={describedBy(errorKey && ids.error)}
          aria-invalid={errorKey === "errors.badCode" || undefined}
        />
        {errorLine}
        {offlineLine}
        <button
          type="submit"
          className="btn btn-primary mt-2"
          aria-disabled={blocked}
          aria-describedby={describedBy(!online && ids.offline)}
        >
          {busy ? t("verifying") : t("verify")}
        </button>
      </form>
      <form
        action={action}
        onSubmit={(event) => {
          if (blocked || secondsLeft > 0) event.preventDefault();
        }}
        className="flex flex-col gap-2"
      >
        <input type="hidden" name="intent" value="resend" />
        {secondsLeft > 0 ? null : captcha}
        <button
          type="submit"
          className="btn btn-text self-start px-0"
          aria-disabled={blocked || secondsLeft > 0}
        >
          {t("resend")}
        </button>
        {secondsLeft > 0 ? (
          <p className="text-sm text-text-muted" aria-live="off">
            {t("resendIn", { seconds: secondsLeft })}
          </p>
        ) : null}
      </form>
    </div>
  );
}

function errorMessageKey(reason: SignInState["error"]): ErrorKey | null {
  switch (reason) {
    case "invalid_email":
      return "errors.invalidEmail";
    case "bad_code":
      return "errors.badCode";
    case "rate_limited":
      return "errors.rateLimited";
    case "captcha_failed":
      return "errors.captchaFailed";
    case "unavailable":
    case "not_configured":
      return "errors.unavailable";
    default:
      return null;
  }
}

function useCountdown(sentAt: number | null): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (sentAt === null) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [sentAt]);
  if (sentAt === null) return 0;
  return Math.max(0, RESEND_SECONDS - Math.floor((now - sentAt) / 1000));
}
