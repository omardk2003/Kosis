import { getTranslations } from "next-intl/server";

/** Fallback page served by the service worker when a navigation fails offline (ADR-0008). */
export default async function OfflinePage() {
  const t = await getTranslations("offline");
  return (
    <main
      id="main"
      className="mx-auto flex min-h-dvh max-w-[480px] flex-col justify-center gap-4 px-4"
    >
      <h1 className="font-display text-2xl font-semibold">{t("title")}</h1>
      <p className="text-text-muted">{t("body")}</p>
    </main>
  );
}
