"use client";

import { useI18n } from "@/i18n/provider";
import type { Quote } from "./catalog";
import "@/components/daily-note.css";

/** Shared presentation; previews pass fixed copy without the session provider. */
export function QuoteCard({
  quote,
  showLabel = true,
}: {
  quote: Quote | null;
  showLabel?: boolean;
}) {
  const { locale, t } = useI18n();
  return (
    <figure
      className="daily-note"
      data-quote-id={quote?.id}
      data-quote-pending={!quote || undefined}
    >
      {showLabel && (
        <figcaption className="daily-note-label">
          {t("Một chút bình yên")}
        </figcaption>
      )}
      <svg
        className="daily-note-mark"
        width="40"
        height="36"
        viewBox="0 0 40 36"
        fill="currentColor"
        aria-hidden="true"
        focusable="false"
      >
        <path d="M2 21C2 10 7 4 17 2v5C11 9 9 12 9 17h8v17H2V21Zm21 0C23 10 28 4 38 2v5c-6 2-8 5-8 10h8v17H23V21Z" />
      </svg>
      <blockquote className="daily-note-message">
        {quote ? (
          quote[locale]
        ) : (
          <span className="daily-note-placeholder" aria-hidden="true" />
        )}
      </blockquote>
    </figure>
  );
}
