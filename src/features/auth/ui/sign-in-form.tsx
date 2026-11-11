"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { signInStep, type SignInState } from "@/server/auth/actions";
import { OfflineBanner } from "@/components/offline-banner";
import { useOnline } from "@/components/use-online";
import { purgeAppCaches } from "./purge-caches";

const RESEND_SECONDS = 60;

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

export function SignInForm({ configured, turnstileSiteKey, purgeCaches, locale, copy }: Props) {
  const t = (key: keyof SignInCopy, values?: Record<string, string | number>) =>
    Object.entries(values ?? {}).reduce(
      (text, [name, value]) => text.replace(`{${name}}`, String(value)),
      copy[key],
    );
  const online = useOnline();
  const emailId = useId();
  const codeId = useId();
  const errorId = useId();
  const turnstileRef = useRef<TurnstileInstance>(null);

  const [state, action, busy] = useActionState(signInStep, { step: "email" } as SignInState);

  useEffect(() => {
    if (purgeCaches) void purgeAppCaches();
  }, [purgeCaches]);
  useEffect(() => {
    turnstileRef.current?.reset();
  }, [state]);

  const secondsLeft = useCountdown(state.step === "code" ? state.sentAt : null);
  const errorKey = errorMessageKey(state.error);
  const blocked = !online || !configured || busy;

  const captcha = turnstileSiteKey ? (
    <div aria-label={t("captchaLabel")}>
      <Turnstile
        ref={turnstileRef}
        siteKey={turnstileSiteKey}
        options={{ language: locale, theme: "auto", size: "flexible" }}
      />
    </div>
  ) : null;

  const errorBlock = (
    <>
      {!configured ? (
        <p id={errorId} role="alert" className="text-sm">
          {t("errors.unavailable")}
        </p>
      ) : errorKey ? (
        <p id={errorId} role="alert" className="text-sm">
          {t(errorKey)}
        </p>
      ) : null}
      {!online ? <p className="text-sm text-text-muted">{t("errors.offline")}</p> : null}
    </>
  );

  if (state.step === "email") {
    return (
      <form action={action} className="flex flex-col gap-4" noValidate>
        <input type="hidden" name="intent" value="send" />
        <OfflineBanner text={copy.offlineBanner} />
        <label htmlFor={emailId} className="font-medium">
          {t("emailLabel")}
        </label>
        <input
          id={emailId}
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          className="field-input"
          aria-describedby={errorKey ? errorId : undefined}
          aria-invalid={errorKey === "errors.invalidEmail" || undefined}
        />
        <p className="text-sm text-text-muted">{t("emailHint")}</p>
        {captcha}
        {errorBlock}
        <button type="submit" className="btn btn-primary" aria-disabled={blocked} disabled={busy}>
          {busy ? t("sending") : t("sendCode")}
        </button>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <OfflineBanner text={copy.offlineBanner} />
      <p role="status">{t("codeSentNeutral")}</p>
      <form action={action} className="flex flex-col gap-4" noValidate>
        <input type="hidden" name="intent" value="verify" />
        <label htmlFor={codeId} className="font-medium">
          {t("codeLabel")}
        </label>
        <input
          id={codeId}
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={6}
          required
          className="field-input tracking-[0.4em]"
          aria-describedby={errorKey ? errorId : undefined}
          aria-invalid={errorKey === "errors.badCode" || undefined}
        />
        {errorBlock}
        <button type="submit" className="btn btn-primary" aria-disabled={blocked} disabled={busy}>
          {busy ? t("verifying") : t("verify")}
        </button>
      </form>
      <form action={action} className="flex flex-col gap-2">
        <input type="hidden" name="intent" value="resend" />
        {secondsLeft > 0 ? null : captcha}
        <button
          type="submit"
          className="btn btn-secondary"
          disabled={busy || secondsLeft > 0}
          aria-disabled={blocked || secondsLeft > 0}
        >
          {secondsLeft > 0 ? t("resendIn", { seconds: secondsLeft }) : t("resend")}
        </button>
      </form>
      <form action={action}>
        <input type="hidden" name="intent" value="restart" />
        <button type="submit" className="btn btn-text" disabled={busy}>
          {t("useDifferentEmail")}
        </button>
      </form>
    </div>
  );
}

type ErrorKey =
  | "errors.invalidEmail"
  | "errors.badCode"
  | "errors.rateLimited"
  | "errors.captchaFailed"
  | "errors.unavailable";

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
