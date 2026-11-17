import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { LanguageSwitch } from "@/components/language-switch";

export default async function HomePage() {
  const t = await getTranslations();
  return (
    <main
      id="main"
      className="mx-auto flex min-h-dvh max-w-[640px] flex-col justify-between px-4 py-8"
    >
      <div className="flex justify-end">
        <LanguageSwitch />
      </div>
      <div>
        <h1 className="font-display text-[2.75rem] leading-[1.15] font-semibold tracking-tight">
          {t("common.appName")}
        </h1>
        <p className="mt-4 max-w-[30ch] text-lg text-text-muted">{t("home.tagline")}</p>
      </div>
      <Link href="/today" className="btn btn-primary">
        {t("home.getStarted")}
      </Link>
    </main>
  );
}
