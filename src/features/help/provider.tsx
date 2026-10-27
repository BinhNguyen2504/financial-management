"use client";
import { HelpPanel } from "./panel";
import { useI18n } from "@/i18n/provider";

import { focusPointerControl } from "@/components/pointer-focus";

import { BookOpen, CircleHelp } from "lucide-react";
import { usePathname } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import "./help.css";
import { helpPageForPath } from "./registry";

import type { HelpPageId } from "./types";

import type { HelpRequest } from "./types";
type HelpController = {
  openHelp: (pageId: HelpPageId, sectionId?: string) => void;
};
const HelpContext = createContext<HelpController | null>(null);

export function HelpProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [request, setRequest] = useState<HelpRequest | null>(null);
  const openHelp = useCallback(
    (pageId: HelpPageId, sectionId?: string) => {
      setRequest({ pageId, sectionId, pathname });
    },
    [pathname],
  );
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Close the current Help request when navigation changes its page context.
    setRequest(null);
  }, [pathname]);
  return (
    <HelpContext.Provider value={{ openHelp }}>
      {children}
      {request?.pathname === pathname && (
        <HelpPanel request={request} onClose={() => setRequest(null)} />
      )}
    </HelpContext.Provider>
  );
}

export function useHelp() {
  const help = useContext(HelpContext);
  if (!help) throw new Error("Help controls must be inside HelpProvider");
  return help;
}

export function HelpButton({
  pageId,
  sectionId,
  label,
}: {
  pageId: HelpPageId;
  sectionId?: string;
  label: string;
}) {
  const { t: tr } = useI18n();

  const { openHelp } = useHelp();
  return (
    <button
      type="button"
      className="help-context"
      aria-label={tr("Giải thích: {0}", { 0: label })}
      aria-haspopup="dialog"
      onMouseDown={focusPointerControl}
      onClick={() => openHelp(pageId, sectionId)}
    >
      <CircleHelp size={17} aria-hidden="true" />
      <span>{label}</span>
    </button>
  );
}

export function PageHelpButton() {
  const { t: tr } = useI18n();

  const page = helpPageForPath(usePathname());
  const { openHelp } = useHelp();
  if (!page) return null;
  return (
    <button
      type="button"
      className="help-trigger"
      aria-haspopup="dialog"
      onMouseDown={focusPointerControl}
      onClick={() => openHelp(page.id)}
    >
      <BookOpen size={17} aria-hidden="true" />
      <span>{tr("Hướng dẫn")}</span>
    </button>
  );
}

export function HelpPageTitle({
  children,
  id,
}: {
  children: ReactNode;
  id?: string;
}) {
  return (
    <div className="help-page-title">
      <h1 id={id}>{children}</h1>
      <PageHelpButton />
    </div>
  );
}
