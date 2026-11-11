import { getTranslations } from "next-intl/server";
import { SignInForm } from "@/features/auth/ui/sign-in-form";
import { LanguageSwitch } from "@/components/language-switch";
import { readSupabaseEnv, readTurnstileSiteKey } from "@/server/env";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ signedOut?: string; ended?: string }>;
}) {
  const t = await getTranslations("signIn");
  const params = await searchParams;
  const status = params.signedOut ? t("signedOut") : params.ended ? t("sessionEnded") : null;
  return (
    <main id="main" className="mx-auto flex min-h-dvh max-w-[480px] flex-col gap-8 px-4 py-8">
      <div className="flex justify-end">
        <LanguageSwitch />
      </div>
      <h1 className="font-display text-2xl font-semibold">{t("title")}</h1>
      {status ? (
        <p role="status" className="text-text-muted">
          {status}
        </p>
      ) : null}
      <SignInForm
        configured={readSupabaseEnv() !== null}
        turnstileSiteKey={readTurnstileSiteKey()}
        purgeCaches={Boolean(params.signedOut)}
      />
    </main>
  );
}
