import { getLocale, getTranslations } from "next-intl/server";
import { setLocale } from "@/server/locale/actions";
import { locales } from "@/i18n/config";

/** Two-option language switch (EN/DA). Works without JavaScript via a server action. */
export async function LanguageSwitch() {
  const current = await getLocale();
  const t = await getTranslations("common");
  const label = { en: t("languageEnglish"), da: t("languageDanish") } as const;
  return (
    <form action={setLocale} aria-label={t("languageLabel")} className="flex gap-1">
      {locales.map((locale) => (
        <button
          key={locale}
          type="submit"
          name="locale"
          value={locale}
          lang={locale}
          aria-pressed={current === locale}
          className={`btn ${current === locale ? "btn-secondary" : "btn-text"} px-3 text-sm`}
        >
          {label[locale]}
        </button>
      ))}
    </form>
  );
}
