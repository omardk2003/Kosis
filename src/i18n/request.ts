import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";
import { localeCookieName } from "./config";
import { negotiateLocale } from "./negotiate";

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const locale = negotiateLocale(
    cookieStore.get(localeCookieName)?.value,
    headerStore.get("accept-language"),
  );
  const messages =
    locale === "da"
      ? (await import("../../content/messages/da.json")).default
      : (await import("../../content/messages/en.json")).default;
  return { locale, messages };
});
