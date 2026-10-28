"use client";
import { StatusBadge } from "@/components/status-badge";
import { MonthYearSelect } from "@/components/month-year-select";
import { ScrollTabs } from "@/components/scroll-tabs";

import { DailyNote } from "@/components/daily-note";
import { Garden } from "@/components/garden";
import { LoadingSpinner, LoadingStatus } from "@/components/loading";
import { focusPointerControl } from "@/components/pointer-focus";

import { hasMonthlyIncome, ruleAt } from "@/domain/income/engine";
import { type ReportFilter } from "@/domain/income/reports";
import type { IncomeRow } from "@/domain/income/types";
import { formatMonth as monthName } from "@/i18n/format";
import { HelpButton, HelpPageTitle } from "@/features/help/provider";
import {
  Archive,
  Trash2 as DeleteActionIcon,
  Trash2 as DeleteCommandGlyph,
  Download,
  Pencil as EditActionIcon,
  Pencil,
  Plus,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

import { IncomeDetails } from "./details";
import { IncomeEditor } from "./editor";

import { MissingIncome } from "./missing-income";
import { IncomeReports } from "./report-panel";
import { useIncomeWorkspace } from "./use-income-workspace";

export function IncomeWorkspace(
  props: Parameters<typeof useIncomeWorkspace>[0],
) {
  const controller = useIncomeWorkspace(props);
  const {
    tr,
    locale,
    money,
    open,
    configured,
    error,
    loading,
    reload,
    needsLogin,
    view,
    notice,
    year,
    setYear,
    month,
    setMonth,
    future,
    tab,
    setTab,
    selectedMonth,
    displayMoney,
    total,
    missing,
    fixedRows,
    oneOffRows,
    today,
    categories,
    report,
    from,
    to,
    setFrom,
    setTo,
    kind,
    setKind,
    setCategoryId,
    categoryId,
    download,
    setDetails,
    editor,
    editorKey,
    setEditor,
    saved,
    details,
  } = controller;
  function oneOffList(list: IncomeRow[]) {
    return list.length ? (
      <div className="income-list">
        {list.map((r) => (
          <article className="income-item is-oneoff" key={r.key}>
            <div>
              <div className="status-heading">
                <h3>
                  <Sparkles size={17} aria-hidden="true" /> {r.name}
                </h3>
                <StatusBadge tone="info" size="compact">
                  {tr("Thu phát sinh")}
                </StatusBadge>
              </div>
              <p className="expense-muted">{monthName(r.month, locale)}</p>
              {r.description && (
                <p className="expense-muted">{r.description}</p>
              )}
            </div>
            <div className="income-receipt">
              <p className="income-amount">{money(r.amount!)}</p>
            </div>
            <div className="expense-actions">
              <button
                className="expense-secondary icon-action action-edit"
                onClick={() => open({ type: "oneoff", row: r })}
                aria-label={tr("Sửa {0}", { 0: r.name })}
                title={tr("Sửa")}
              >
                <EditActionIcon size={18} aria-hidden="true" />
              </button>
              <button
                className="expense-secondary icon-action action-delete"
                onClick={() => open({ type: "deleteOneOff", row: r })}
                aria-label={tr("Xóa {0}", { 0: r.name })}
                title={tr("Xóa")}
              >
                <DeleteActionIcon size={18} aria-hidden="true" />
              </button>
            </div>
          </article>
        ))}
      </div>
    ) : (
      <p className="expense-empty">
        {tr("Chưa có khoản thu phát sinh trong kỳ này.")}
      </p>
    );
  }
  return (
    <div
      className="income-workspace expenses-workspace"
      onMouseDownCapture={focusPointerControl}
    >
      <div className="expense-page-heading illustrated-heading">
        <div className="heading-copy">
          <p className="eyebrow">{tr("THỰC NHẬN THEO THÁNG")}</p>
          <HelpPageTitle>{tr("Thu nhập")}</HelpPageTitle>
          <p className="lead">
            {tr(
              "Ghi nguồn thu đều đặn và khoản phát sinh, theo dõi từng tháng trong năm.",
            )}
          </p>
        </div>
        <div className="heading-art">
          <Garden variant="harvest" />
        </div>
      </div>
      <DailyNote />
      {!configured ? (
        <section className="panel">
          <h2>{tr("Thu nhập chưa sẵn sàng")}</h2>
          <p>{tr("Tính năng này chưa sẵn sàng. Bạn có thể thử lại sau.")}</p>
        </section>
      ) : (
        <>
          {error && (
            <div className="expense-error expense-feedback" role="alert">
              <p>{tr(error)}</p>
              <button
                className="expense-secondary"
                disabled={loading}
                aria-busy={loading}
                onClick={() => void reload().catch(() => {})}
              >
                {loading && <LoadingSpinner />} {tr("Thử tải lại")}
              </button>
            </div>
          )}
          {needsLogin && (
            <section className="panel">
              <h2>{tr("Đăng nhập để quản lý thu nhập")}</h2>
              <Link className="expense-primary" href="/login?next=/income">
                {tr("Đăng nhập")}
              </Link>
            </section>
          )}
          {loading && !view && (
            <LoadingStatus>{tr("Đang tải thu nhập…")}</LoadingStatus>
          )}
          <p className="expense-status" role="status">
            {tr(notice)}
          </p>
          {view && (
            <>
              <div className="expense-toolbar">
                <MonthYearSelect
                  value={`${year}-${String(month).padStart(2, "0")}`}
                  onChange={(period) => {
                    setYear(Number(period.slice(0, 4)));
                    setMonth(Number(period.slice(5, 7)));
                  }}
                />
                <button
                  className="expense-primary"
                  onClick={() => open({ type: "oneoff" })}
                  disabled={future}
                >
                  <Plus size={17} aria-hidden="true" />
                  {tr("Thêm thu phát sinh")}
                </button>
              </div>
              <ScrollTabs
                as="nav"
                className="expense-segment"
                aria-label={tr("Khu vực thu nhập")}
              >
                {[
                  ["month", tr("Nhập thu nhập")],
                  ["reports", tr("Báo cáo")],
                  ["categories", tr("Danh mục cố định")],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    aria-pressed={tab === key}
                    onClick={() => setTab(key)}
                  >
                    {label}
                  </button>
                ))}
              </ScrollTabs>
              {tab === "month" && (
                <>
                  <section
                    className="income-summary"
                    aria-label={tr("Tóm tắt thu nhập tháng")}
                  >
                    <article>
                      <h2>
                        {tr("Tổng đã ghi nhận ·")}{" "}
                        {monthName(selectedMonth, locale)}
                      </h2>
                      <strong>{displayMoney(total)}</strong>
                      <p>
                        {future
                          ? tr(
                              "Tháng tương lai: chỉ xem danh mục, chưa ghi thực nhận.",
                            )
                          : missing
                            ? tr("{0} danh mục chưa nhập trong {1}.", {
                                0: missing,
                                1: monthName(selectedMonth, locale),
                              })
                            : tr("Đã ghi nhận đủ các danh mục đến hạn.")}
                      </p>
                    </article>
                    <article>
                      <h3>{tr("Cố định / Phát sinh")}</h3>
                      <p>
                        {displayMoney(
                          fixedRows.some((r) => r.amount !== null)
                            ? fixedRows
                                .reduce((n, r) => n + BigInt(r.amount ?? 0), 0n)
                                .toString()
                            : null,
                        )}{" "}
                        /{" "}
                        {displayMoney(
                          oneOffRows.length
                            ? oneOffRows
                                .reduce((n, r) => n + BigInt(r.amount!), 0n)
                                .toString()
                            : null,
                        )}
                      </p>
                      <p className="expense-muted">
                        {tr(
                          "Số thu không tự tăng số dư tài khoản hoặc cấp tiền vào hũ.",
                        )}
                      </p>
                    </article>
                  </section>
                  {!future && (
                    <MissingIncome
                      rows={fixedRows}
                      today={today}
                      onEnter={(row) => open({ type: "monthly", row })}
                    />
                  )}
                  <p className="expense-muted">
                    {tr(
                      "Chưa nhập nghĩa là chưa ghi nhận thu nhập. Nhập 0 ₫ để xác nhận tháng này không có thu nhập từ danh mục này.",
                    )}
                  </p>
                  <div className="expense-section-heading">
                    <h2>
                      {tr("Danh mục cố định ·")}{" "}
                      {monthName(selectedMonth, locale)}
                    </h2>
                    <HelpButton
                      pageId="income"
                      sectionId="fixed"
                      label={tr("Danh mục cố định là gì?")}
                    />
                    <button
                      className="expense-secondary"
                      onClick={() => open({ type: "create" })}
                    >
                      {tr("Thêm danh mục")}
                    </button>
                  </div>
                  {!fixedRows.length && (
                    <p className="expense-empty">
                      {tr(
                        "Chưa có danh mục hoạt động trong tháng này. Thêm danh mục để nhập thu nhập định kỳ.",
                      )}
                    </p>
                  )}
                  <div className="income-list">
                    {fixedRows.map((r) => (
                      <article
                        key={r.key}
                        className={`income-item${!r.active ? " is-inactive" : r.amount === null && !future ? " is-missing" : ""}`}
                      >
                        <div>
                          <div className="status-heading">
                            <h3>{r.name}</h3>
                            {!r.active && (
                              <StatusBadge size="compact">
                                {tr("Đã ngừng")}
                              </StatusBadge>
                            )}
                          </div>
                          {r.description && (
                            <p className="expense-muted">{r.description}</p>
                          )}
                        </div>
                        <div className="income-receipt">
                          <p className="income-amount">
                            {r.amount === null ? (
                              <StatusBadge
                                tone={future ? "info" : "warning"}
                                size="compact"
                              >
                                {future
                                  ? tr("Chưa đến kỳ nhập")
                                  : tr("Chưa nhập")}
                              </StatusBadge>
                            ) : (
                              money(r.amount)
                            )}
                          </p>
                          {r.note && r.note !== r.description && (
                            <p className="expense-muted">{r.note}</p>
                          )}
                        </div>
                        <div className="expense-actions">
                          <button
                            className="expense-secondary"
                            disabled={future}
                            aria-label={tr("Nhập {0}", { 0: r.name })}
                            onClick={() => open({ type: "monthly", row: r })}
                          >
                            {r.amount === null ? (
                              <Plus size={17} aria-hidden="true" />
                            ) : (
                              <Pencil size={17} aria-hidden="true" />
                            )}
                            {r.amount === null
                              ? tr("Nhập tiền")
                              : tr("Sửa số thu")}
                          </button>
                          {r.amount !== null && (
                            <button
                              className="expense-secondary"
                              aria-label={tr("Xóa số thu {0}", { 0: r.name })}
                              onClick={() => open({ type: "clear", row: r })}
                            >
                              <DeleteCommandGlyph
                                size={17}
                                aria-hidden="true"
                              />
                              {tr("Xóa số thu")}
                            </button>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                  <div className="expense-section-heading">
                    <h2>
                      {tr("Thu phát sinh ·")} {monthName(selectedMonth, locale)}
                    </h2>
                    <HelpButton
                      pageId="income"
                      sectionId="oneoff"
                      label={tr("Thu phát sinh là gì?")}
                    />
                  </div>
                  {oneOffList(oneOffRows)}
                </>
              )}
              {tab === "categories" && (
                <>
                  <div className="expense-section-heading">
                    <h2>{tr("Danh mục cố định")}</h2>
                    <button
                      className="expense-primary"
                      onClick={() => open({ type: "create" })}
                    >
                      {tr("Thêm danh mục")}
                    </button>
                  </div>
                  <p className="expense-muted income-configuration-note">
                    {tr("Cấu hình tại")} {monthName(selectedMonth, locale)}
                    {tr(
                      ". Danh mục tự tiếp tục qua năm mới; tiền mỗi tháng nhập riêng.",
                    )}
                  </p>
                  {!categories.length && (
                    <p className="expense-empty">
                      {tr("Chưa có danh mục cố định.")}
                    </p>
                  )}
                  <div className="income-list">
                    {categories.map((c) => {
                      const rule = ruleAt(c, selectedMonth) ?? c.rules[0];
                      const hasReceipts = hasMonthlyIncome(view.book!, c.id);
                      return (
                        <article
                          className={`income-item${selectedMonth >= c.start && !rule.active ? " is-inactive" : ""}`}
                          key={c.id}
                        >
                          <div>
                            <div className="status-heading">
                              <h3>{rule.name}</h3>
                              <StatusBadge
                                size="compact"
                                tone={
                                  selectedMonth < c.start
                                    ? "info"
                                    : rule.active
                                      ? "success"
                                      : "neutral"
                                }
                              >
                                {selectedMonth < c.start
                                  ? tr("Chưa bắt đầu")
                                  : rule.active
                                    ? tr("Đang hoạt động")
                                    : tr("Đã ngừng")}
                              </StatusBadge>
                            </div>
                            <p className="expense-muted">
                              {tr("Từ")} {monthName(c.start, locale)}
                            </p>
                            {rule.description && <p>{rule.description}</p>}
                          </div>
                          <div className="expense-actions">
                            <button
                              className="expense-secondary icon-action action-edit"
                              onClick={() =>
                                open({ type: "configure", category: c })
                              }
                              aria-label={tr("Sửa danh mục {0}", {
                                0: rule.name,
                              })}
                              title={tr("Sửa")}
                            >
                              <EditActionIcon size={18} aria-hidden="true" />
                            </button>
                            {(!hasReceipts ||
                              (selectedMonth >= c.start && rule.active)) && (
                              <button
                                className={
                                  hasReceipts
                                    ? "expense-secondary expense-warning"
                                    : "expense-secondary expense-danger"
                                }
                                onClick={() =>
                                  open({
                                    type: hasReceipts
                                      ? "stop"
                                      : "deleteCategory",
                                    category: c,
                                  })
                                }
                                aria-label={tr("{0} danh mục {1}", {
                                  0: hasReceipts ? tr("Ngừng") : tr("Xóa"),
                                  1: rule.name,
                                })}
                              >
                                {hasReceipts && (
                                  <Archive size={17} aria-hidden="true" />
                                )}
                                {hasReceipts
                                  ? tr("Ngừng từ tháng…")
                                  : tr("Xóa")}
                              </button>
                            )}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </>
              )}
              {tab === "reports" && report && (
                <>
                  <div className="income-filters">
                    <label className="income-select">
                      {tr("Kỳ")}
                      <select
                        value={
                          from === 1 && to === 12
                            ? "year"
                            : to - from === 2 && from % 3 === 1
                              ? String(Math.ceil(from / 3))
                              : "custom"
                        }
                        onChange={(e) => {
                          const v = e.target.value;
                          if (v === "custom") return;
                          if (v === "year") {
                            setFrom(1);
                            setTo(12);
                          } else {
                            setFrom((Number(v) - 1) * 3 + 1);
                            setTo(Number(v) * 3);
                          }
                        }}
                      >
                        <option value="year">{tr("Cả năm")}</option>
                        {[1, 2, 3, 4].map((q) => (
                          <option key={q} value={q}>
                            {tr("Quý")} {q}
                          </option>
                        ))}
                        <option value="custom">
                          {tr("Khoảng tháng tùy chọn")}
                        </option>
                      </select>
                    </label>
                    <label className="income-select">
                      {tr("Từ tháng")}
                      <select
                        value={from}
                        onChange={(e) => {
                          const m = Number(e.target.value);
                          setFrom(m);
                          if (m > to) setTo(m);
                        }}
                      >
                        {Array.from({ length: 12 }, (_, i) => (
                          <option key={i} value={i + 1}>
                            {i + 1}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="income-select">
                      {tr("Đến tháng")}
                      <select
                        value={to}
                        onChange={(e) => {
                          const m = Number(e.target.value);
                          setTo(m);
                          if (m < from) setFrom(m);
                        }}
                      >
                        {Array.from({ length: 12 }, (_, i) => (
                          <option key={i} value={i + 1}>
                            {i + 1}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="income-select">
                      {tr("Loại thu")}
                      <select
                        value={kind}
                        onChange={(e) => {
                          setKind(e.target.value as ReportFilter["kind"]);
                          if (e.target.value === "oneoff") setCategoryId("");
                        }}
                      >
                        <option value="all">{tr("Tất cả")}</option>
                        <option value="fixed">{tr("Cố định")}</option>
                        <option value="oneoff">{tr("Phát sinh")}</option>
                      </select>
                    </label>
                    <label className="income-select">
                      {tr("Danh mục")}
                      <select
                        value={categoryId}
                        disabled={kind === "oneoff"}
                        onChange={(e) => setCategoryId(e.target.value)}
                      >
                        <option value="">{tr("Tất cả danh mục")}</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {(ruleAt(c, `${year}-12`) ?? c.rules[0]).name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      className="expense-secondary"
                      onClick={() => void download()}
                    >
                      <Download size={17} aria-hidden="true" />
                      {tr("Xuất bảng dữ liệu")}
                    </button>
                  </div>
                  <section className="income-summary">
                    <article>
                      <h2>{tr("Tổng đã ghi nhận trong kỳ")}</h2>
                      <strong>{displayMoney(report.total)}</strong>
                      {report.missing > 0 && (
                        <div className="status-meta income-summary-status">
                          <StatusBadge tone="warning" size="compact">
                            {tr("{0} khoản cần bổ sung", { 0: report.missing })}
                          </StatusBadge>
                        </div>
                      )}
                    </article>
                    <article>
                      <h3>
                        {tr("Năm")} {year} {tr("· tháng")} {from}–{to}
                      </h3>
                      <p>
                        {report.categories.length} {tr("danh mục ·")}{" "}
                        {report.oneOffs.length} {tr("khoản phát sinh")}
                      </p>
                    </article>
                  </section>
                  <MissingIncome
                    rows={report.rows}
                    today={today}
                    onEnter={(row) => open({ type: "monthly", row })}
                  />
                  <IncomeReports
                    today={today}
                    onEnter={(row) => open({ type: "monthly", row })}
                    report={report}
                    onDetails={(m) => setDetails({ month: m })}
                  />
                </>
              )}
            </>
          )}
        </>
      )}
      {editor && view && (
        <IncomeEditor
          key={editorKey}
          mode={editor}
          month={selectedMonth}
          today={today}
          version={view.book?.version ?? 0}
          onClose={() => setEditor(null)}
          onSaved={saved}
          onReload={reload}
        />
      )}
      {details && report && (
        <IncomeDetails
          key={details.month ?? "period"}
          rows={report.oneOffs}
          month={details.month}
          onClose={() => setDetails(null)}
          onEdit={open}
        />
      )}
    </div>
  );
}
