"use client";

import { usePathname } from "next/navigation";
import { QuoteCard } from "@/features/quotes/card";
import { useQuote } from "@/features/quotes/provider";

export function DailyNote({ showLabel = true }: { showLabel?: boolean }) {
  return <QuoteCard quote={useQuote()} showLabel={showLabel} />;
}

export function PageQuote() {
  // Overview owns placement because its optional peace widget uses the same quote.
  return usePathname() === "/overview" ? null : <DailyNote />;
}
