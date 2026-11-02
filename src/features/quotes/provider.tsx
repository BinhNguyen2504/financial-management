"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import type { Quote } from "./catalog";
import { createQuoteSession } from "./sequence";

const QuoteContext = createContext<Quote | null>(null);

export function QuoteProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [session] = useState(() => createQuoteSession());
  const snapshot = useSyncExternalStore(
    session.subscribe,
    session.getSnapshot,
    session.getServerSnapshot,
  );
  useEffect(() => {
    session.visit(pathname);
    const restored = (event: PageTransitionEvent) => {
      if (event.persisted) session.visit(pathname, true);
    };
    window.addEventListener("pageshow", restored);
    return () => window.removeEventListener("pageshow", restored);
  }, [pathname, session]);
  return (
    <QuoteContext.Provider
      value={snapshot?.pathname === pathname ? snapshot.quote : null}
    >
      {children}
    </QuoteContext.Provider>
  );
}

export function useQuote() {
  return useContext(QuoteContext);
}
