import { ThemeText } from "@/components/theme-decoration";
import { HelpPageTitle } from "@/features/help/provider";
import { pageAccess } from "@/server/page-auth";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check, CircleHelp } from "lucide-react";
import { modules, moduleStatusLabels } from "@/features/catalog";
import { Garden, type GardenVariant } from "@/components/garden";
import { ModuleIcon } from "@/components/module-icon";

export function generateStaticParams() {
  return modules
    .filter(
      (m) =>
        ![
          "overview",
          "budgets",
          "income",
          "savings",
          "investments",
          "funds",
          "settings",
        ].includes(m.slug),
    )
    .map((m) => ({ module: m.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ module: string }>;
}): Promise<Metadata> {
  const { module: slug } = await params;
  return {
    title: modules.find((m) => m.slug === slug)?.title ?? "Không tìm thấy",
  };
}

export default async function ModulePage({
  params,
}: {
  params: Promise<{ module: string }>;
}) {
  const { module: slug } = await params;
  const item = modules.find((m) => m.slug === slug);
  if (!item || item.slug === "overview") notFound();
  const denied = await pageAccess(`/${item.slug}`);
  if (denied) return denied;
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
        <ArrowLeft size={16} aria-hidden="true" /> Tổng quan
      </Link>
      <div className="module-heading">
        <Garden variant={scenes[slug] ?? "balance"} />
        <span className="pill">
          {moduleStatusLabels[item.status]} · <ThemeText name="developing" />
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
          <span className="pill">Phạm vi dự kiến</span>
          <h2>Nội dung cần xây dựng</h2>
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
          <h2>Cần làm rõ cùng bạn</h2>
          <ul>
            {item.questions.map((question) => (
              <li key={question}>{question}</li>
            ))}
          </ul>
          <p>
            Mảnh ghép này đang được xây dựng. Trong lúc chờ, bạn có thể chăm sóc
            các hũ và theo dõi tháng của mình trong Chi tiêu.
          </p>
        </section>
      </div>
    </>
  );
}
