import Link from "next/link";
import { getTranslations } from "next-intl/server";

export default async function NotFound() {
  const t = await getTranslations("notFound");
  return (
    <main
      id="main"
      className="mx-auto flex min-h-dvh max-w-[480px] flex-col justify-center gap-4 px-4"
    >
      <h1 className="font-display text-2xl font-semibold">{t("title")}</h1>
      <Link href="/" className="btn btn-secondary self-start">
        {t("back")}
      </Link>
    </main>
  );
}
