"use client";
import { AnimatedDetails } from "@/components/animated-details";
import { StatusBadge } from "@/components/status-badge";

import { SafetyScene } from "@/components/safety-scene";
import { LoadingStatus } from "@/components/loading";
import { focusPointerControl } from "@/components/pointer-focus";

import { ThemeIcon, ThemeText } from "@/components/theme-decoration";

import type { FundId } from "@/domain/funds/schema";

import { Modal as ExpenseModal } from "@/components/modal";
import { HelpButton, HelpPageTitle } from "@/features/help/provider";

import { ArrowRight, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { fundNames, guides } from "./content";
import { FundDetails, FundGuide, FundLocations } from "./details";
import { FundEditor } from "./editor";

import { FundLedger } from "./ledger";
import { ProgressScene } from "./progress-scene";
import { useFundsWorkspace } from "./use-funds-workspace";

export function FundsWorkspace() {
  const controller = useFundsWorkspace();
  const {
    tr,
    view,
    setDetail,
    setEditor,
    loading,
    error,
    reload,
    config,
    money,
    next,
    celebration,
    detail,
    editor,
    saved,
    authLost,
  } = controller;

  return (
    <div className="fund-workspace" onMouseDownCapture={focusPointerControl}>
      <header className="fund-heading illustrated-heading">
        <div className="heading-copy">
          <p className="eyebrow">
            <ThemeIcon size={16} /> <ThemeText name="fundsEyebrow" />
          </p>
          <HelpPageTitle>
            {tr("Vững vàng trước những ngày bất ngờ.")}
          </HelpPageTitle>
          <p>{tr("Từng khoản dự phòng nhỏ, một nền tảng an tâm hơn.")}</p>
        </div>
        <div className="heading-art">
          <SafetyScene />
        </div>
        {view?.book && (
          <div className="fund-actions heading-actions">
            <button
              className="expense-secondary"
              onClick={() => setDetail("locations")}
            >
              {tr("Nơi giữ tiền")}
            </button>
            <button
              className="expense-secondary"
              onClick={() => setEditor({ type: "configure" })}
            >
              {tr("Điều chỉnh mục tiêu")}
            </button>
          </div>
        )}
      </header>
      {loading && !view && (
        <LoadingStatus>
          <ThemeText name="fundsLoading" />
        </LoadingStatus>
      )}
      {error && (
        <div role="alert" className="expense-error">
          {tr(error)}
          <button
            className="expense-secondary"
            onClick={() => void reload().catch(() => {})}
          >
            {tr("Thử tải lại")}
          </button>
        </div>
      )}
      {view && !view.book && (
        <>
          <section className="fund-welcome panel">
            <div>
              <h2>{tr("Hiểu trước, bắt đầu từng chút.")}</h2>
              <div className="status-meta fund-welcome-status">
                <StatusBadge tone="info" size="compact" icon={ShieldCheck}>
                  {tr("Chuẩn bị theo nhịp của bạn")}
                </StatusBadge>
              </div>
              <p>
                {tr(
                  "Chọn chi phí sinh hoạt từ Chi tiêu, tự đặt quy mô cho ba quỹ rồi ghi lại tiền đã dành riêng. Mỗi quỹ có một vai trò, một hành trình lớn lên.",
                )}
              </p>
              <button
                className="expense-primary"
                onClick={() => setEditor({ type: "configure" })}
              >
                {tr("Bắt đầu xây quỹ")}{" "}
                <ArrowRight size={17} aria-hidden="true" />
              </button>
              <p className="fund-note">
                {tr(
                  "Tiền trong Fund được ghi độc lập; Financial Goals có không gian riêng.",
                )}
              </p>
            </div>
            <ProgressScene fund="emergency" percent="35" />
          </section>
          <div className="fund-card-grid">
            {(["emergency", "rainy_day", "sinking"] as FundId[]).map((id) => (
              <article className="fund-card" key={id}>
                <ProgressScene fund={id} percent="0" />
                <p className="eyebrow">
                  <ThemeText name={id} />
                </p>
                <h2>{fundNames[id]}</h2>
                <p>{guides[id].concept}</p>
                <AnimatedDetails>
                  <summary>{tr("Tìm hiểu cách xây quỹ")}</summary>
                  <FundGuide fund={id} />
                </AnimatedDetails>
              </article>
            ))}
          </div>
        </>
      )}
      {view?.book && config && (
        <>
          <section className="fund-health" aria-label={tr("Sức đệm tài chính")}>
            <div>
              <span>{tr("Tổng dự phòng")}</span>
              <strong>{money(view.state.total)}</strong>
            </div>
            <div>
              <span>{tr("Tổng mục tiêu")}</span>
              <strong>{money(view.state.target)}</strong>
            </div>
            <div>
              <span>{tr("Còn thiếu từng quỹ cộng lại")}</span>
              <strong>{money(view.state.missing)}</strong>
            </div>
            <div>
              <span>{tr("Emergency đủ trang trải")}</span>
              <strong>
                {view.state.emergencyMonths.replace(".", ",")} {tr("tháng")}
              </strong>
            </div>
          </section>
          <section className="fund-living panel">
            <div className="fund-living-overview">
              <div className="fund-section-heading">
                <h2>{tr("Nền tảng sinh hoạt")}</h2>
                <HelpButton
                  pageId="funds"
                  sectionId="living"
                  label={tr("Mức sinh hoạt và mục tiêu")}
                />
              </div>
              <p className="fund-living-amount">
                <strong>{money(config.living.total)}</strong>
                <span>{tr("/tháng")}</span>
              </p>
              <p>
                {tr("Mức đã xác nhận từ tháng")}{" "}
                {config.living.month.split("-").reverse().join("/")}
              </p>
              <p className="fund-note">
                {tr("Số tháng Emergency dùng mức sinh hoạt này.")}
              </p>
            </div>
            <AnimatedDetails className="fund-living-breakdown">
              <summary>{tr("Xem các hũ cấu thành")}</summary>
              <dl className="fund-amount-rows">
                {config.living.items.map((i) => (
                  <div key={i.jarId}>
                    <dt>{i.name}</dt>
                    <dd>{money(i.amount)}</dd>
                  </div>
                ))}
              </dl>
              <Link href="/budgets">{tr("Mở Chi tiêu →")}</Link>
            </AnimatedDetails>
          </section>
          {view.sourceChanged && (
            <section className="fund-source-change" role="status">
              <strong>{tr("Chi phí sinh hoạt có thay đổi.")}</strong>
              <p>
                {view.sourceUnavailable
                  ? tr(
                      "Một số hũ đã ngừng hoạt động hoặc mức sinh hoạt không còn phù hợp. Hãy chọn lại nguồn.",
                    )
                  : tr(
                      "Mức hiện tại từ Chi tiêu: {0}/tháng. Xem chênh lệch trước khi áp dụng.",
                      { 0: money(view.proposedLiving!.total) },
                    )}{" "}
                {tr("Mục tiêu đã xác nhận đang được giữ.")}
              </p>
              <button
                className="expense-secondary"
                onClick={() => setEditor({ type: "configure" })}
              >
                {tr("Xem lại mức sinh hoạt")}
              </button>
            </section>
          )}
          <section className="fund-next">
            <span className="fund-next-icon">
              <ThemeIcon size={24} />
            </span>
            <div>
              <p className="eyebrow">{tr("BƯỚC TIẾP THEO CỦA BẠN")}</p>
              {next ? (
                <>
                  <h2>
                    <ThemeText name="nextFund" /> {fundNames[next]}.
                  </h2>
                  <p>
                    {tr("Còn")}{" "}
                    {money(
                      view.state.funds.find((f) => f.id === next)!.missing,
                    )}{" "}
                    {tr(
                      "theo mục tiêu bạn chọn. Bắt đầu bằng một khoản vừa sức.",
                    )}
                  </p>
                </>
              ) : (
                <>
                  <h2>{tr("Ba quỹ đã đủ mức bạn đặt.")}</h2>
                  <p>
                    {tr(
                      "Duy trì dự phòng và xem lại khi nhu cầu sinh hoạt thay đổi.",
                    )}
                  </p>
                </>
              )}
            </div>
            {next && (
              <button
                className="expense-primary"
                onClick={() =>
                  setEditor({
                    type: "transaction",
                    fundId: next,
                    kind: "deposit",
                  })
                }
              >
                {tr("Thêm tiền")}
              </button>
            )}
          </section>
          <div className="fund-card-grid">
            {view.state.funds.map((f) => (
              <article className="fund-card" key={f.id} data-fund={f.id}>
                <ProgressScene
                  key={`${f.id}-${celebration}`}
                  fund={f.id}
                  percent={f.percent}
                  animate={celebration > 0}
                />
                <div className="fund-card-title">
                  <p className="eyebrow">
                    <ThemeText name={f.id} />
                  </p>
                  <span className="fund-percentage">
                    {f.percent.replace(".", ",")}%
                  </span>
                </div>
                <h2>{fundNames[f.id]}</h2>
                <p className="fund-balance">{money(f.balance)}</p>
                <p>
                  {tr("Mục tiêu")} {money(f.target)} ·{" "}
                  {config.multipliers[f.id]} {tr("tháng")}
                </p>
                <p className="fund-note">
                  {BigInt(f.excess) > 0n
                    ? tr("Vượt mục tiêu {0}", { 0: money(f.excess) })
                    : BigInt(f.missing) > 0n
                      ? tr("Còn {0} để đủ mức bạn chọn", {
                          0: money(f.missing),
                        })
                      : tr("Đã đủ mức dự phòng")}
                </p>
                <div className="fund-actions">
                  <button
                    className="expense-secondary"
                    aria-label={`Xem ${fundNames[f.id]}`}
                    onClick={() => setDetail(f.id)}
                  >
                    {tr("Chi tiết")}
                  </button>
                  <button
                    className="expense-primary"
                    onClick={() =>
                      setEditor({
                        type: "transaction",
                        fundId: f.id,
                        kind: "deposit",
                      })
                    }
                  >
                    {tr("Thêm tiền")}
                  </button>
                </div>
              </article>
            ))}
          </div>
          <div className="panel">
            <FundLedger view={view} onEdit={setEditor} />
          </div>
        </>
      )}
      {view?.book &&
        detail &&
        (detail === "locations" ? (
          <ExpenseModal
            title={tr("Nơi giữ tiền")}
            size="detail"
            onClose={() => setDetail(null)}
          >
            <FundLocations view={view} onEdit={setEditor} />
          </ExpenseModal>
        ) : (
          <FundDetails
            fund={detail}
            view={view}
            onClose={() => setDetail(null)}
            onEdit={setEditor}
          />
        ))}
      {view && editor && (
        <FundEditor
          mode={editor}
          view={view}
          refresh={reload}
          onSaved={saved}
          onClose={() => setEditor(null)}
          onAuthLost={authLost}
        />
      )}
    </div>
  );
}
