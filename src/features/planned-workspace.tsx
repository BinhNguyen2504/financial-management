"use client";
import { useI18n } from "@/i18n/provider";

import { Garden, type GardenVariant } from "@/components/garden";
import { ModuleIcon } from "@/components/module-icon";
import { ThemeText } from "@/components/theme-decoration";
import {
  moduleStatusLabels as moduleStatusLabelsSource,
  type Module,
} from "@/features/catalog";
import { HelpPageTitle } from "@/features/help/provider";
import { ArrowLeft, Check, CircleHelp } from "lucide-react";
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
      <div className="module-heading">
        <Garden variant={scenes[slug] ?? "balance"} />
        <span className="pill">
          {localize(moduleStatusLabelsSource)[item.status]} ·{" "}
          <ThemeText name="developing" />
        </span>
        <span className="module-icon">
          <ModuleIcon name={item.icon} size={27} />
        </span>
        <p className="eyebrow">{item.label}</p>
        <HelpPageTitle>{item.title}</HelpPageTitle>
        <p className="lead">{item.description}</p>
      </div>
      <div className="spec-grid">
        <section className="panel">
          <span className="pill">{tr("Phạm vi dự kiến")}</span>
          <h2>{tr("Nội dung cần xây dựng")}</h2>
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
          <CircleHelp size={23} aria-hidden="true" />
          <h2>{tr("Cần làm rõ cùng bạn")}</h2>
          <ul>
            {item.questions.map((question) => (
              <li key={question}>{question}</li>
            ))}
          </ul>
          <p>
            {tr(
              "Mảnh ghép này đang được xây dựng. Trong lúc chờ, bạn có thể chăm sóc các hũ và theo dõi tháng của mình trong Chi tiêu.",
            )}
          </p>
        </section>
      </div>
    </>
  );
}
