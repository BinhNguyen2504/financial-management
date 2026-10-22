import { help } from "@/i18n/messages/help";
import { translateConfig, translator } from "@/i18n/translate";
import { articles as source } from "./content";
const fallback = translator("en");
export const articles = translateConfig(
  source,
  (message) =>
    help[message as keyof typeof help] ??
    (message.startsWith("Sử dụng ")
      ? help["Sử dụng {0}"].replace("{0}", message.slice(8))
      : fallback(message)),
);
