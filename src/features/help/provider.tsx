"use client";
import { useI18n } from "@/i18n/provider";

import { focusPointerControl } from "@/components/pointer-focus";
import { ThemeIcon } from "@/components/theme-decoration";
import { ExpenseModal } from "@/features/expenses/modal";
import { BookOpen, Check, CircleHelp, Lightbulb } from "lucide-react";
import { usePathname } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import "./help.css";
import { helpPageForPath, helpPages as helpPagesSource } from "./registry";
import { HelpText } from "./text";
import type { HelpArticle, HelpPageId } from "./types";

type HelpRequest = { pageId: HelpPageId; sectionId?: string; pathname: string };
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

function HelpPanel({
  request,
  onClose,
}: {
  request: HelpRequest;
  onClose: () => void;
}) {
  const { t: tr, locale, config: localize } = useI18n();

  const [article, setArticle] = useState<HelpArticle | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const page = localize(helpPagesSource).find(
    (page) => page.id === request.pageId,
  )!;
  useEffect(() => {
    let active = true;
    setArticle(null);
    setError(false);
    (locale === "en" ? import("./content-en") : import("./content"))
      .then(({ articles }) => {
        if (active) setArticle(articles[request.pageId]);
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, [request.pageId, attempt, locale]);

  function jump(id: string) {
    const target = root.current?.querySelector<HTMLElement>(
      `[data-help-id="${id}"]`,
    );
    if (!target) return;
    target.focus({ preventScroll: true });
    target.scrollIntoView({ block: "start", behavior: "instant" });
  }
  useEffect(() => {
    if (article && request.sectionId) jump(request.sectionId);
  }, [article, request.sectionId]);

  return (
    <ExpenseModal
      title={tr("Hướng dẫn · {0}", { 0: page.title })}
      description={page.status}
      size="help"
      onClose={onClose}
    >
      <div className="help-content" ref={root}>
        {!article && !error && <p role="status">{tr("Đang tải hướng dẫn…")}</p>}
        {error && (
          <div role="alert">
            <p>
              {tr(
                "Chưa tải được hướng dẫn. Bạn có thể thử lại hoặc đóng để tiếp tục công việc.",
              )}
            </p>
            <button
              type="button"
              className="expense-secondary"
              onClick={() => setAttempt((value) => value + 1)}
            >
              {tr("Thử lại hướng dẫn")}
            </button>
          </div>
        )}
        {article && (
          <>
            <nav aria-label={tr("Mục lục hướng dẫn")} className="help-toc">
              <p className="help-eyebrow">{tr("NỘI DUNG HƯỚNG DẪN")}</p>
              <ol>
                {article.sections.map((section, index) => (
                  <li key={section.id}>
                    <button type="button" onClick={() => jump(section.id)}>
                      <span className="help-toc-number" aria-hidden="true">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span>{section.title}</span>
                    </button>
                  </li>
                ))}
              </ol>
            </nav>
            {article.sections.map((section, index) => (
              <section
                className={`help-section help-section-${section.id}`}
                key={section.id}
              >
                <h3 tabIndex={-1} data-help-id={section.id}>
                  <span className="help-section-number" aria-hidden="true">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span>{section.title}</span>
                </h3>
                {section.paragraphs && (
                  <div className="help-section-copy">
                    {section.id === "mindset" && (
                      <p className="help-callout-label">
                        <ThemeIcon size={18} /> {tr("Nguyên tắc cốt lõi")}
                      </p>
                    )}
                    {section.id === "pitfalls" && (
                      <p className="help-callout-label">
                        <Lightbulb size={18} aria-hidden="true" />{" "}
                        {tr("Cần nhớ")}
                      </p>
                    )}
                    {section.paragraphs.map((text) => (
                      <p key={text}>
                        <HelpText text={text} />
                      </p>
                    ))}
                  </div>
                )}
                {section.items?.map((item, itemIndex) => (
                  <div className="help-item" key={item.id}>
                    <h4 tabIndex={-1} data-help-id={item.id}>
                      <span className="help-item-number" aria-hidden="true">
                        {index + 1}.{itemIndex + 1}
                      </span>
                      <span>{item.title}</span>
                    </h4>
                    {item.paragraphs.map((text) => (
                      <p key={text}>
                        <HelpText text={text} />
                      </p>
                    ))}
                    {item.steps && (
                      <ol>
                        {item.steps.map((step) => (
                          <li key={step}>
                            <HelpText text={step} />
                          </li>
                        ))}
                      </ol>
                    )}
                    {item.result && (
                      <p className="help-result">
                        <Check size={17} aria-hidden="true" />
                        <span>
                          <HelpText text={item.result} />
                        </span>
                      </p>
                    )}
                  </div>
                ))}
              </section>
            ))}
          </>
        )}
      </div>
    </ExpenseModal>
  );
}
