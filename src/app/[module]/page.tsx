import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check, CircleHelp } from "lucide-react";
import { modules } from "@/features/catalog";
import { Garden } from "@/components/garden";
import { ModuleIcon } from "@/components/module-icon";

export function generateStaticParams() {
  return modules
    .filter((m) => !["overview", "budgets", "income"].includes(m.slug))
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
  return (
    <>
      <Link className="back-link" href="/overview">
        <ArrowLeft size={16} aria-hidden="true" /> Tổng quan
      </Link>
      <div className="module-heading">
        <Garden variant="sprout" />
        <span className="pill">Đang vun đắp · Chưa sẵn sàng sử dụng</span>
        <span className="module-icon">
          <ModuleIcon name={item.icon} size={27} />
        </span>
        <p className="eyebrow">{item.label}</p>
        <h1>{item.title}</h1>
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
      {slug === "settings" && (
        <section className="panel install-guide">
          <h2>Cài lên màn hình chính</h2>
          <p>
            Sau khi ứng dụng được triển khai qua HTTPS: trên iPhone/iPad, mở
            bằng Safari → Chia sẻ → Thêm vào Màn hình chính. Trên trình duyệt hỗ
            trợ, chọn cài đặt ứng dụng trong menu trình duyệt.
          </p>
          <p>
            Nền PWA hiện có manifest, biểu tượng và trang báo mất mạng. Ghi giao
            dịch ngoại tuyến sẽ được xây ở giai đoạn đồng bộ.
          </p>
        </section>
      )}
    </>
  );
}
