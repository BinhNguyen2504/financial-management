"use client";
import { StatusBadge } from "@/components/status-badge";
import { useI18n } from "@/i18n/provider";

import { Garden, type GardenVariant } from "@/components/garden";
import { ModuleIcon } from "@/components/module-icon";
import {
  moduleStatusLabels as moduleStatusLabelsSource,
  type Module,
} from "@/features/catalog";
import { PageGuide } from "@/features/help/page-guide";
import { HelpPageTitle } from "@/features/help/provider";
import { ArrowLeft, Check } from "lucide-react";
import Link from "next/link";
export function PlannedWorkspace({ item: sourceItem }: { item: Module }) {
  const { t: tr, config: localize } = useI18n("catalog");

  const item = localize(sourceItem);
  const slug = item.slug;
  const scenes: Record<string, GardenVariant> = {
    goals: "path",
    accounts: "shelter",
    funds: "shelter",
    investments: "grove",
    reports: "balance",
    settings: "garden",
    transactions: "jar",
  };
  return (
    <>
      <Link className="back-link" href="/overview">
        <ArrowLeft size={16} aria-hidden="true" /> {tr("Tổng quan")}
      </Link>
      <div className="module-heading illustrated-heading">
        <div className="heading-copy">
          <span className="module-icon">
            <ModuleIcon name={item.icon} size={27} />
          </span>
          <p className="eyebrow">{item.label}</p>
          <div className="status-heading planned-title">
            <HelpPageTitle>{item.title}</HelpPageTitle>
            <StatusBadge tone="info" size="compact">
              {localize(moduleStatusLabelsSource)[item.status]}
            </StatusBadge>
          </div>
          <p className="lead">{item.description}</p>
        </div>
        <div className="heading-art">
          <Garden variant={scenes[slug] ?? "balance"} />
        </div>
      </div>
      <PageGuide pageId={item.slug} />
      <div className="spec-grid">
        <section className="panel">
          <div className="status-heading">
            <h2>{tr("Nội dung cần xây dựng")}</h2>
            <StatusBadge tone="info" size="compact">
              {tr("Phạm vi dự kiến")}
            </StatusBadge>
          </div>
          <ul className="scope-list">
            {item.scope.map((text) => (
              <li key={text}>
                <Check size={18} aria-hidden="true" />
                <span>{text}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="panel question-panel">
          <h2>{tr("Bạn có thể bắt đầu từ đây")}</h2>
          <p>
            {tr(
              "Mảnh ghép này đang được xây dựng. Trong lúc chờ, bạn có thể chăm sóc các hũ và theo dõi tháng của mình trong Chi tiêu.",
            )}
          </p>
          <Link className="text-link" href="/income">
            {tr("Thu nhập")}
          </Link>
          {" · "}
          <Link className="text-link" href="/budgets">
            {tr("Chi tiêu")}
          </Link>
        </section>
      </div>
    </>
  );
}
