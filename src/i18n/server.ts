import { cookies } from "next/headers";
import "server-only";
import { LOCALE_KEY, localeOf } from "./locale";
import { translator } from "./translate";

export async function serverLocaleState() {
  const value = (await cookies()).get(LOCALE_KEY)?.value;
  return {
    locale: localeOf(value),
    hasCookie: value === "vi" || value === "en",
  };
}
export async function serverLocale() {
  return (await serverLocaleState()).locale;
}
export async function localizedMetadata(title: string) {
  return { title: translator(await serverLocale())(title) };
}
