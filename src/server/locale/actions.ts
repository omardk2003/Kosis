"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { isLocale, localeCookieName } from "@/i18n/config";

/** Stores the user's language choice (ADR-0009). Later phases also persist it on the profile. */
export async function setLocale(formData: FormData): Promise<void> {
  const value = formData.get("locale");
  if (!isLocale(value)) return;
  const cookieStore = await cookies();
  cookieStore.set(localeCookieName, value, {
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 365,
  });
  revalidatePath("/", "layout");
}
