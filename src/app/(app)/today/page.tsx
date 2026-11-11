import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getVerifiedUserId } from "@/server/supabase/server";
import { signOut } from "@/server/auth/actions";
import { LanguageSwitch } from "@/components/language-switch";
import { OfflineBanner } from "@/components/offline-banner";
import { SignOutButton } from "@/features/auth/ui/sign-out-button";
import { FocusHeading } from "@/components/focus-heading";

/** Phase 0 placeholder for the Today dashboard (docs/screens/today-placeholder.md). */
export default async function TodayPage() {
  // Defence in depth: the proxy redirects too, but authorization never relies on it alone.
  const userId = await getVerifiedUserId();
  if (!userId) redirect("/sign-in");
  const t = await getTranslations("today");
  const tc = await getTranslations("common");
  return (
    <main
      id="main"
      className="mx-auto flex min-h-dvh max-w-[var(--content-max)] flex-col gap-6 px-4 py-8"
    >
      <FocusHeading targetId="today-heading" />
      <OfflineBanner text={tc("offlineBanner")} />
      <div className="flex items-center justify-between">
        <h1 id="today-heading" tabIndex={-1} className="font-display text-xl font-semibold">
          {t("title")}
        </h1>
        <LanguageSwitch />
      </div>
      <p className="text-text-muted">{t("signedIn")}</p>
      <p>{t("placeholder")}</p>
      <form action={signOut}>
        <SignOutButton
          label={t("signOut")}
          pendingLabel={t("signingOut")}
          offlineReason={t("offlineSignOut")}
        />
      </form>
    </main>
  );
}
