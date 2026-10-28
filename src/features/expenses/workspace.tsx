"use client";
import { MonthYearSelect } from "@/components/month-year-select";
import { ScrollTabs } from "@/components/scroll-tabs";
import { useI18n } from "@/i18n/provider";
import { ColumnPicker, ColumnTable } from "@/components/column-table";
import { DailyNote } from "@/components/daily-note";
import { Garden } from "@/components/garden";
import { LoadingSpinner, LoadingStatus } from "@/components/loading";
import { focusPointerControl } from "@/components/pointer-focus";

import { ThemeIcon, ThemeText } from "@/components/theme-decoration";

import { jarEmoji } from "@/domain/expenses/emoji";

import type { ExpenseRow } from "@/domain/expenses/types";
import { HelpPageTitle } from "@/features/help/provider";
import {
  Archive,
  ArrowUpRight,
  Pencil,
  Plus,
  Settings2,
  Wallet,
} from "lucide-react";
import Link from "next/link";

import { ExpenseDetails, ExpenseLabels } from "./details";
import { ExpenseEditor } from "./editor";

import { monthName, ratio } from "./format";
import { JarClassification } from "./label-visual";
import { ExpenseReports } from "./report-panel";
import { useExpenseWorkspace } from "./use-expense-workspace";
function JarProgress({ row }: { row: ExpenseRow }) {
  const { t: tr, numberLocale } = useI18n("expenses");

  if (row.kind === "accumulation")
    return (
      <p className="jar-growth">
        <ThemeIcon size={16} kind="sprout" />{" "}
        {row.status === "planned" ? (
          tr("Dành sẵn cho tương lai")
        ) : (
          <ThemeText name="accumulation" />
        )}
      </p>
    );
  if (row.status === "planned")
    return <p className="jar-growth">{tr("Kế hoạch cho tháng tới")}</p>;
  if (BigInt(row.target) === 0n)
    return <p className="jar-growth">{tr("Chưa đặt mức tháng")}</p>;
  const used = ratio(row.spent, row.target);
  return (
    <div className={`jar-progress ${used > 100 ? "is-over" : ""}`}>
      <span>
        {tr("Đã dùng")}{" "}
        {used.toLocaleString(numberLocale, { maximumFractionDigits: 1 })}
        {tr("% mức tháng")}
      </span>
      <div aria-hidden="true">
        <span style={{ width: `${Math.min(100, used)}%` }} />
      </div>
    </div>
  );
}
export function ExpenseWorkspace(
  props: Parameters<typeof useExpenseWorkspace>[0],
) {
  const controller = useExpenseWorkspace(props);
  const {
    tr,
    view,
    setLabelsOpen,
    readonly,
    openEditor,
    configured,
    loading,
    notice,
    error,
    needsLogin,
    reload,
    outsideYears,
    selectedYear,
    locale,
    currentYear,
    setYear,
    setMonth,
    setMethod,
    setGroup,
    setTab,
    month,
    tab,
    archivedTotals,
    money,
    archivedMonths,
    kind,
    setKind,
    method,
    methods,
    group,
    groups,
    inactive,
    setInactive,
    selectedMonth,
    total,
    future,
    funding,
    rows,
    setDetail,
    hidden,
    editor,
    editorKey,
    setEditor,
    saved,
    detail,
    yearRows,
    labelsOpen,
  } = controller;

  return (
    <div
      className="expenses-workspace"
      onMouseDownCapture={focusPointerControl}
    >
      <div className="expense-page-heading illustrated-heading">
        <div className="heading-copy">
          <p className="eyebrow">{tr("MỖI KHOẢN TIỀN, MỘT MỤC ĐÍCH")}</p>
          <HelpPageTitle>{tr("Chi tiêu")}</HelpPageTitle>
          <p className="lead">
            {tr("Chuẩn bị cho tháng này. Dành sẵn cho những đợt chi sắp tới.")}
          </p>
        </div>
        <div className="heading-art">
          <Garden variant="jar" />
        </div>
        {view?.book && (
          <div className="expense-actions heading-actions">
            <button
              className="expense-secondary"
              onClick={() => setLabelsOpen(true)}
            >
              <Settings2 size={17} /> {tr("Phân loại")}
            </button>
            {!readonly && (
              <button
                className="expense-primary"
                onClick={() => openEditor({ mode: "create" })}
              >
                <Plus size={18} /> {tr("Thêm hũ")}
              </button>
            )}
          </div>
        )}
      </div>
      <DailyNote />
      {!configured ? (
        <section className="panel expense-setup">
          <Garden variant="jar" />
          <h2>{tr("Sẵn sàng cho những khoản chi của bạn")}</h2>
          <p>{tr("Tính năng này chưa sẵn sàng. Bạn có thể thử lại sau.")}</p>
          <p className="expense-muted">
            {tr("Dữ liệu chi tiêu không được lưu tạm trong trình duyệt.")}
          </p>
          <Link className="expense-secondary" href="/login">
            {tr("Đến trang đăng nhập")}
          </Link>
        </section>
      ) : (
        <>
          {loading && !view ? (
            <LoadingStatus>{tr("Đang tải dữ liệu chi tiêu…")}</LoadingStatus>
          ) : (
            <p role="status" className="expense-status">
              {tr(notice)}
            </p>
          )}
          {error && (
            <div className="expense-notice expense-feedback" role="alert">
              <p>{tr(error)}</p>
              {needsLogin ? (
                <Link className="expense-primary" href="/login">
                  {tr("Đăng nhập")}
                </Link>
              ) : (
                <button
                  className="expense-secondary"
                  disabled={loading}
                  aria-busy={loading}
                  onClick={() => void reload().catch(() => {})}
                >
                  {loading && <LoadingSpinner />} {tr("Thử tải lại")}
                </button>
              )}
            </div>
          )}
          {view && !view.book && (
            <section className="panel expense-setup">
              <Garden variant="sprout" />
              <h2>{tr("Bắt đầu từ tháng bạn chọn")}</h2>
              <p>
                {tr(
                  "Thêm các khoản chi định kỳ và khoản cần tích lũy. Ứng dụng tự tính tiền cần bỏ hũ; bạn chỉ điều chỉnh những tháng có thay đổi.",
                )}
              </p>
              <button
                className="expense-primary"
                onClick={() => openEditor({ mode: "initialize" })}
              >
                {tr("Chọn tháng bắt đầu")}
              </button>
            </section>
          )}
          {view?.book && (
            <>
              {outsideYears && (
                <div className="data-warning" role="status">
                  {tr("Năm")} {selectedYear}{" "}
                  {tr("chưa có dữ liệu. Sổ đang quản lý từ")}{" "}
                  {monthName(view.book.start, locale)} {tr("đến năm")}{" "}
                  {currentYear}.
                  <button
                    type="button"
                    className="expense-secondary"
                    onClick={() => {
                      setYear(currentYear);
                      setMonth(Number(view.today.slice(5, 7)));
                    }}
                  >
                    {tr("Về năm hiện tại")}
                  </button>
                </div>
              )}
              <div className="expense-toolbar">
                <div className="expense-filters">
                  <MonthYearSelect
                    monthDisabled={(period) => period < view.book!.start}
                    value={`${selectedYear}-${String(month ?? 1).padStart(2, "0")}`}
                    onChange={(period) => {
                      const nextYear = Number(period.slice(0, 4));
                      if (nextYear !== selectedYear) {
                        setMethod("");
                        setGroup("");
                        setTab("month");
                      }
                      setYear(nextYear);
                      const requested =
                        period < view.book!.start &&
                        nextYear === Number(view.book!.start.slice(0, 4))
                          ? view.book!.start
                          : period;
                      setMonth(Number(requested.slice(5, 7)));
                    }}
                    yearLabel={(value) => {
                      const entry = view.book!.years.find(
                        (item) => item.year === value,
                      );
                      return `${value}${entry?.closedAt ? tr(" · Đã chốt") : !entry ? tr(" · Chưa có dữ liệu") : value === currentYear ? tr(" · Hiện tại") : tr(" · Chưa chốt")}`;
                    }}
                  />
                </div>
                <ScrollTabs
                  className="expense-segment"
                  role="group"
                  aria-label={tr("Nội dung chi tiêu")}
                >
                  <button
                    aria-pressed={tab === "month"}
                    onClick={() => setTab("month")}
                  >
                    {tr("Theo tháng")}
                  </button>
                  <button
                    aria-pressed={tab === "reports"}
                    disabled={selectedYear !== currentYear}
                    onClick={() => setTab("reports")}
                  >
                    {tr("Báo cáo năm")}
                  </button>
                </ScrollTabs>
              </div>
              {selectedYear < currentYear && !outsideYears && (
                <div className="expense-notice expense-archive-note">
                  <Archive size={20} aria-hidden="true" />
                  <p>
                    {readonly
                      ? tr(
                          "Năm {0} đã chốt. Bạn có thể xem lịch sử. Sao lưu toàn bộ dữ liệu trong Cài đặt.",
                          { 0: selectedYear },
                        )
                      : tr(
                          "Năm {0} chưa chốt. Hoàn tất dữ liệu trước khi lưu trữ; số dư năm mới sẽ được cập nhật theo.",
                          { 0: selectedYear },
                        )}
                  </p>
                  {!readonly && (
                    <button
                      className="expense-primary"
                      onClick={() =>
                        openEditor({ mode: "closeYear", year: selectedYear })
                      }
                    >
                      {tr("Chốt năm")} {selectedYear}
                    </button>
                  )}
                </div>
              )}
              {selectedYear < currentYear && !outsideYears && (
                <details className="panel expense-archive-summary">
                  <summary>
                    {tr("Tổng kết năm")} {selectedYear}
                    {readonly ? tr(" · Đã lưu") : tr(" · Chưa chốt")}
                  </summary>
                  <p className="expense-muted">
                    {tr(
                      "Tổng hợp toàn bộ hũ của năm, không áp dụng bộ lọc bên dưới.",
                    )}
                  </p>
                  {archivedTotals && (
                    <div className="expense-report-totals">
                      <span>
                        {tr("Đầu năm:")}{" "}
                        <strong>{money(archivedTotals.opening)}</strong>
                      </span>
                      <span>
                        {tr("Bỏ hũ:")}{" "}
                        <strong>{money(archivedTotals.funding)}</strong>
                      </span>
                      <span>
                        {tr("Thực chi:")}{" "}
                        <strong>{money(archivedTotals.spent)}</strong>
                      </span>
                      <span>
                        {tr("Cuối năm:")}{" "}
                        <strong>{money(archivedTotals.closing)}</strong>
                      </span>
                    </div>
                  )}
                  <div className="expense-table-scroll">
                    <ColumnTable tableId="expenses-workspace-1">
                      <caption className="sr-only">
                        {tr("Tổng kết từng tháng năm")} {selectedYear}
                        {tr(", đơn vị VND")}
                      </caption>
                      <thead>
                        <tr>
                          <th>{tr("Tháng")}</th>
                          <th>{tr("Bỏ hũ")}</th>
                          <th>{tr("Thực chi")}</th>
                          <th>{tr("Còn lại")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {archivedMonths.map((item) => (
                          <tr key={item.key}>
                            <th>{monthName(item.key, locale)}</th>
                            <td>{money(item.funding)}</td>
                            <td>{money(item.spent)}</td>
                            <td>{money(item.closing)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </ColumnTable>
                  </div>
                </details>
              )}
              <div className="expense-filters expense-filter-panel">
                <label>
                  {tr("Loại hũ")}
                  <select
                    value={kind}
                    onChange={(e) => setKind(e.target.value)}
                  >
                    <option value="">{tr("Tất cả")}</option>
                    <option value="monthly">{tr("Chi trong tháng")}</option>
                    <option value="accumulation">{tr("Tích lũy")}</option>
                  </select>
                </label>
                <label>
                  {tr("Phương thức")}
                  <select
                    value={method}
                    onChange={(e) => setMethod(e.target.value)}
                  >
                    <option value="">{tr("Tất cả")}</option>
                    {methods.map((m) => (
                      <option key={m}>{m}</option>
                    ))}
                  </select>
                </label>
                <label>
                  {tr("Nhóm mục đích")}
                  <select
                    value={group}
                    onChange={(e) => setGroup(e.target.value)}
                  >
                    <option value="">{tr("Tất cả")}</option>
                    {groups.map((g) => (
                      <option key={g}>{g}</option>
                    ))}
                  </select>
                </label>
                <label className="expense-checkbox">
                  <input
                    type="checkbox"
                    checked={inactive}
                    onChange={(e) => setInactive(e.target.checked)}
                  />{" "}
                  {tr("Gồm hũ đã ngừng")}
                </label>
              </div>
              {tab === "reports" ? (
                <ExpenseReports view={view} filters={{ kind, method, group }} />
              ) : (
                <>
                  <section
                    className="expense-metrics"
                    aria-label={tr("Tổng hợp {0}", {
                      0: monthName(selectedMonth, locale),
                    })}
                  >
                    {[
                      { name: tr("Mức tháng"), value: total("target") },
                      {
                        name: tr("Cần thêm mặc định"),
                        value: total("required"),
                      },
                      {
                        name: future
                          ? tr("Dự kiến bỏ hũ")
                          : tr("Đã ghi nhận bỏ hũ"),
                        value: funding,
                      },
                      {
                        name: future
                          ? tr("Thực chi chưa phát sinh")
                          : selectedMonth === view.today.slice(0, 7)
                            ? tr("Thực chi · tạm tính")
                            : tr("Thực chi"),
                        value: total("spent"),
                      },
                      {
                        name: future ? tr("Số dư dự kiến") : tr("Số còn lại"),
                        value: total("closing"),
                      },
                    ].map((metric) => (
                      <article className="metric" key={metric.name}>
                        <h2>{metric.name}</h2>
                        <p>{money(metric.value)}</p>
                      </article>
                    ))}
                  </section>
                  <div className="expense-section-heading">
                    <h2>{monthName(selectedMonth, locale)}</h2>
                    <div className="expense-section-tools">
                      <span className="expense-muted">
                        {rows.length} {tr("hũ")}
                        {future ? tr(" · Kế hoạch") : ""}
                        {readonly ? tr(" · Chỉ xem") : ""}
                      </span>
                      {rows.length > 0 && (
                        <ColumnPicker
                          tableId="expenses-workspace-2"
                          columns={[
                            { id: tr("Khoản chi"), fixed: true },
                            ...[
                              tr("Mức tháng"),
                              tr("Chuyển sang"),
                              tr("Cần thêm"),
                              future ? tr("Dự kiến bỏ") : tr("Đã bỏ hũ"),
                              tr("Thực chi"),
                              tr("Còn lại"),
                            ].map((id) => ({ id })),
                            { id: tr("Thao tác"), fixed: true },
                          ]}
                        />
                      )}
                    </div>
                  </div>
                  {selectedMonth === view.today.slice(0, 7) && (
                    <p className="expense-notice">
                      {tr(
                        "Hũ chi tháng mặc định số dư bằng 0, nên thực chi hiện tại là tạm tính. Nhập số dư nếu còn tiền; ứng dụng sẽ tính lại tiền cần thêm của tháng sau.",
                      )}
                    </p>
                  )}
                  {rows.length ? (
                    <>
                      <div className="expense-desktop-table expense-table-scroll">
                        <ColumnTable
                          tableId="expenses-workspace-2"
                          showColumnPicker={false}
                        >
                          <caption className="sr-only">
                            {tr("Các hũ trong")}{" "}
                            {monthName(selectedMonth, locale)}
                            {tr(", đơn vị VND")}
                          </caption>
                          <thead>
                            <tr>
                              <th>{tr("Khoản chi")}</th>
                              <th>{tr("Mức tháng")}</th>
                              <th>{tr("Chuyển sang")}</th>
                              <th>{tr("Cần thêm")}</th>
                              <th>
                                {future ? tr("Dự kiến bỏ") : tr("Đã bỏ hũ")}
                              </th>
                              <th>{tr("Thực chi")}</th>
                              <th>{tr("Còn lại")}</th>
                              <th>{tr("Thao tác")}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rows.map((row) => (
                              <tr key={row.jarId}>
                                <th>
                                  <button
                                    className="expense-name-button"
                                    onClick={() => setDetail(row)}
                                  >
                                    <span
                                      className="jar-emoji"
                                      aria-hidden="true"
                                    >
                                      {jarEmoji(row.name, row.kind, row.emoji)}
                                    </span>
                                    {row.name}
                                    <ArrowUpRight
                                      size={14}
                                      aria-hidden="true"
                                    />
                                  </button>
                                  <JarClassification
                                    row={row}
                                    labels={view.book?.labels}
                                  />
                                  <JarProgress row={row} />
                                </th>
                                <td>{money(row.target)}</td>
                                <td>{money(row.opening)}</td>
                                <td>{money(row.required)}</td>
                                <td>
                                  {money(
                                    (
                                      BigInt(row.funding) + BigInt(row.extra)
                                    ).toString(),
                                  )}
                                </td>
                                <td>
                                  {money(row.spent)}
                                  {BigInt(row.over) > 0n && (
                                    <small className="expense-over">
                                      {tr("Vượt")} {money(row.over)}
                                    </small>
                                  )}
                                </td>
                                <td>{money(row.closing)}</td>
                                <td>
                                  <div className="expense-row-actions">
                                    {!readonly && (
                                      <button
                                        className="expense-icon-button"
                                        aria-label={tr("Điều chỉnh {0}", {
                                          0: row.name,
                                        })}
                                        title={tr("Điều chỉnh {0}", {
                                          0: row.name,
                                        })}
                                        onClick={() =>
                                          openEditor({ mode: "month", row })
                                        }
                                      >
                                        <Pencil size={17} aria-hidden="true" />
                                      </button>
                                    )}
                                    {!readonly &&
                                      !future &&
                                      row.kind === "accumulation" && (
                                        <button
                                          className="expense-icon-button"
                                          aria-label={tr("Dùng tiền")}
                                          title={tr("Dùng tiền")}
                                          onClick={() =>
                                            openEditor({ mode: "spend", row })
                                          }
                                        >
                                          <Wallet
                                            size={17}
                                            aria-hidden="true"
                                          />
                                        </button>
                                      )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </ColumnTable>
                      </div>
                      <div className="expense-mobile-cards">
                        {rows.map((row) => (
                          <article
                            key={row.jarId}
                            className="panel expense-jar-card"
                          >
                            <div>
                              <button
                                className="expense-name-button"
                                onClick={() => setDetail(row)}
                              >
                                <span className="jar-emoji" aria-hidden="true">
                                  {jarEmoji(row.name, row.kind, row.emoji)}
                                </span>
                                {row.name}
                                <ArrowUpRight size={16} />
                              </button>
                              <JarClassification
                                row={row}
                                labels={view.book?.labels}
                              />
                            </div>
                            <div className="jar-balance">
                              <span>
                                {future
                                  ? tr("Số dư dự kiến")
                                  : tr("Còn trong hũ")}
                              </span>
                              <strong>{money(row.closing)}</strong>
                            </div>
                            <JarProgress row={row} />
                            <details className="jar-details">
                              <summary>{tr("Các khoản trong hũ")}</summary>
                              <dl>
                                {[
                                  [tr("Mức tháng"), row.target],
                                  [tr("Chuyển sang"), row.opening],
                                  [tr("Cần thêm"), row.required],
                                  [
                                    future ? tr("Dự kiến bỏ") : tr("Đã bỏ hũ"),
                                    (
                                      BigInt(row.funding) + BigInt(row.extra)
                                    ).toString(),
                                  ],
                                  [tr("Thực chi"), row.spent],
                                  [tr("Còn lại"), row.closing],
                                ]
                                  .filter(([label]) => !hidden.includes(label))
                                  .map(([label, value]) => (
                                    <div key={label}>
                                      <dt>{label}</dt>
                                      <dd>{money(value)}</dd>
                                    </div>
                                  ))}
                              </dl>
                            </details>
                            {BigInt(row.over) > 0n && (
                              <p className="expense-over">
                                {tr("Vượt mức")} {money(row.over)}
                              </p>
                            )}
                            {!readonly && (
                              <div className="expense-actions">
                                <button
                                  className="expense-secondary"
                                  onClick={() =>
                                    openEditor({ mode: "month", row })
                                  }
                                >
                                  {tr("Điều chỉnh")}
                                </button>
                                {row.kind === "accumulation" && !future && (
                                  <button
                                    className="expense-primary"
                                    onClick={() =>
                                      openEditor({ mode: "spend", row })
                                    }
                                  >
                                    {tr("Dùng tiền")}
                                  </button>
                                )}
                              </div>
                            )}
                          </article>
                        ))}
                      </div>
                    </>
                  ) : (
                    <section className="panel expense-empty">
                      <Garden variant="sprout" />
                      <h3>{tr("Chưa có hũ trong tháng hoặc bộ lọc này")}</h3>
                      <p>
                        {tr(
                          "Thêm một hũ chi tiêu hoặc thay đổi bộ lọc để xem các khoản đã tạo.",
                        )}
                      </p>
                      {!readonly && (
                        <button
                          className="expense-primary"
                          onClick={() => openEditor({ mode: "create" })}
                        >
                          <Plus size={17} /> {tr("Thêm hũ chi tiêu")}
                        </button>
                      )}
                    </section>
                  )}
                </>
              )}
            </>
          )}
        </>
      )}
      {editor && view && (
        <ExpenseEditor
          key={editorKey}
          editor={editor}
          view={view}
          month={selectedMonth}
          onClose={() => setEditor(null)}
          onSaved={saved}
          onReload={reload}
        />
      )}
      {detail && view?.book && (
        <ExpenseDetails
          key={detail.jarId}
          row={detail}
          yearRows={yearRows}
          book={view.book}
          year={selectedYear}
          readonly={readonly}
          onClose={() => setDetail(null)}
          onEdit={openEditor}
        />
      )}
      {labelsOpen && view?.book && (
        <ExpenseLabels
          book={view.book}
          onClose={() => setLabelsOpen(false)}
          onEdit={openEditor}
        />
      )}
    </div>
  );
}
