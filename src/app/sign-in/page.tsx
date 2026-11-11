import { getLocale, getTranslations } from "next-intl/server";
import { SignInForm, type SignInCopy } from "@/features/auth/ui/sign-in-form";
import { LanguageSwitch } from "@/components/language-switch";
import { readSupabaseEnv, readTurnstileSiteKey } from "@/server/env";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ signedOut?: string; ended?: string }>;
}) {
  const t = await getTranslations("signIn");
  const tc = await getTranslations("common");
  const locale = await getLocale();
  const params = await searchParams;
  const copy: SignInCopy = {
    emailLabel: t("emailLabel"),
    emailHint: t("emailHint"),
    sendCode: t("sendCode"),
    sending: t("sending"),
    codeSentNeutral: t("codeSentNeutral"),
    codeLabel: t("codeLabel"),
    verify: t("verify"),
    verifying: t("verifying"),
    resend: t("resend"),
    resendIn: t.raw("resendIn") as string,
    useDifferentEmail: t("useDifferentEmail"),
    captchaLabel: t("captchaLabel"),
    "errors.invalidEmail": t("errors.invalidEmail"),
    "errors.badCode": t("errors.badCode"),
    "errors.rateLimited": t("errors.rateLimited"),
    "errors.captchaFailed": t("errors.captchaFailed"),
    "errors.unavailable": t("errors.unavailable"),
    "errors.offline": t("errors.offline"),
    offlineBanner: tc("offlineBanner"),
  };
  const status = params.signedOut ? t("signedOut") : params.ended ? t("sessionEnded") : null;
  return (
    <main
      id="main"
      className="mx-auto flex min-h-dvh max-w-[var(--form-max)] flex-col gap-8 px-4 py-8"
    >
      <div className="flex justify-end">
        <LanguageSwitch />
      </div>
      <h1 className="font-display text-xl font-semibold">{t("title")}</h1>
      {status ? (
        <p role="status" className="text-text-muted">
          {status}
        </p>
      ) : null}
      <SignInForm
        configured={readSupabaseEnv() !== null}
        turnstileSiteKey={readTurnstileSiteKey()}
        purgeCaches={Boolean(params.signedOut)}
        locale={locale}
        copy={copy}
      />
    </main>
  );
}
