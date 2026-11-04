"use client";
import { useI18n } from "@/i18n/provider";
import { pageGuidance } from "./guidance";
import type { HelpPageId } from "./types";

export function GuideSummary({ pageId }: { pageId: HelpPageId }) {
  const { t } = useI18n();
  const guide = pageGuidance[pageId];
  return (
    <dl className="page-guide-copy">
      <div>
        <dt>{t("Bắt đầu thế nào")}</dt>
        <dd>{t(guide.start)}</dd>
      </div>
      <div>
        <dt>{t("Đọc kết quả ra sao")}</dt>
        <dd>{t(guide.reading)}</dd>
      </div>
    </dl>
  );
}
export function PageGuide({ pageId }: { pageId: HelpPageId }) {
  const { t } = useI18n();
  return (
    <details className="page-guide">
      <summary>{t("Cách bắt đầu và đọc số liệu")}</summary>
      <GuideSummary pageId={pageId} />
    </details>
  );
}
