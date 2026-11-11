"use client";

import { useTranslations } from "next-intl";
import { useOnline } from "./use-online";

export function OfflineBanner() {
  const online = useOnline();
  const t = useTranslations("common");
  if (online) return null;
  return (
    <p
      role="status"
      className="rounded-[var(--radius-card)] border border-border-strong bg-surface px-4 py-3"
    >
      {t("offlineBanner")}
    </p>
  );
}
