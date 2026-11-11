"use client";

import { useTranslations } from "next-intl";
import { useFormStatus } from "react-dom";
import { useOnline } from "@/components/use-online";

export function SignOutButton() {
  const t = useTranslations("today");
  const tc = useTranslations("common");
  const { pending } = useFormStatus();
  const online = useOnline();
  return (
    <div className="flex flex-col gap-2">
      <button
        type="submit"
        className="btn btn-secondary self-start"
        aria-disabled={!online || pending}
        onClick={(event) => {
          if (!online || pending) event.preventDefault();
        }}
      >
        {pending ? tc("loading") : t("signOut")}
      </button>
      {!online ? <p className="text-sm text-text-muted">{t("offlineSignOut")}</p> : null}
    </div>
  );
}
