"use client";
import { useI18n } from "@/i18n/provider";
import {
  Coins,
  Droplets,
  Flame,
  Lamp,
  Layers3,
  Leaf,
  Mountain,
  Sparkles,
  Sprout,
  Waves,
} from "lucide-react";
import {
  visualThemeKeys,
  visualThemes,
  type ThemeCopyKey,
} from "./visual-theme";

/** All variants render identically on the server and client; CSS selects before paint. */
export function ThemeText({ name }: { name: ThemeCopyKey }) {
  const { t: tr } = useI18n();
  return (
    <>
      {visualThemeKeys.map((theme) => (
        <span key={theme} data-visual-only={theme}>
          {tr(visualThemes[theme].copy[name])}
        </span>
      ))}
    </>
  );
}

export function ThemeIcon({
  size = 21,
  kind = "leaf",
}: {
  size?: number;
  kind?: "leaf" | "sprout";
}) {
  const Forest = kind === "sprout" ? Sprout : Leaf;
  const Water = kind === "sprout" ? Droplets : Waves;
  const Gold = kind === "sprout" ? Sparkles : Coins;
  const Fire = kind === "sprout" ? Flame : Lamp;
  const Earth = kind === "sprout" ? Layers3 : Mountain;
  return (
    <>
      <Forest size={size} aria-hidden="true" data-visual-only="forest" />
      <Water size={size} aria-hidden="true" data-visual-only="water" />
      <Gold size={size} aria-hidden="true" data-visual-only="gold" />
      <Fire size={size} aria-hidden="true" data-visual-only="fire" />
      <Earth size={size} aria-hidden="true" data-visual-only="earth" />
    </>
  );
}
