"use client";
import { useI18n } from "@/i18n/provider";

import {
  DialogFacts,
  DialogList,
  DialogNote,
  DialogSummary,
  DialogTabs,
  dateLabel,
} from "@/components/dialog-content";
import { useMoney } from "@/components/privacy";
import type { ExpenseBook, ExpenseRow } from "@/domain/expenses/types";
import {
  Archive,
  Trash2 as DeleteActionIcon,
  Pencil as EditActionIcon,
  Palette,
  Settings2,
} from "lucide-react";
import type { EditorMode } from "./editor-config";
import { monthName } from "./format";
import { LabelName } from "./label-visual";
import { Modal as ExpenseModal } from "@/components/modal";

const actionNames: Record<string, string> = {
  createJar: "Tạo hũ",
  setJarEmoji: "Đổi biểu tượng",
  configureJar: "Đổi cấu hình",
  editMonth: "Điều chỉnh tháng",
  stopJar: "Ngừng cấp tiền",
  upsertSpend: "Ghi / sửa lần sử dụng",
  deleteSpend: "Xóa lần sử dụng",
};
export function ExpenseDetails({
  row,
  yearRows,
  book,
  year,
  readonly,
  onClose,
  onEdit,
}: {
  row: ExpenseRow;
  yearRows: ExpenseRow[];
  book: ExpenseBook;
  year: number;
  readonly: boolean;
  onClose(): void;
  onEdit(mode: EditorMode): void;
}) {
  const { t: tr, locale, numberLocale, config: localize } = useI18n("expenses");
  const localizedActionNames = localize(actionNames);

  const money = useMoney();
  const months = yearRows
    .filter((r) => r.jarId === row.jarId)
    .slice()
    .sort((a, b) => b.month.localeCompare(a.month));
  const spends = book.spends
    .filter((s) => s.jarId === row.jarId && s.date.startsWith(String(year)))
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  const audit = book.audit
    .filter((a) => {
      const detail = a.detail as Record<string, unknown>;
      return (
        detail.jarId === row.jarId ||
        detail.id === row.jarId ||
        book.spends.some((s) => s.jarId === row.jarId && s.id === detail.id)
      );
    })
    .slice()
    .reverse();
  return (
    <ExpenseModal
      title={row.name}
      size="detail"
      description={`${monthName(row.month, locale)} · ${row.kind === "monthly" ? tr("Chi trong tháng") : tr("Tích lũy")}`}
      onClose={onClose}
    >
      <DialogSummary
        label={
          row.status === "planned"
            ? tr("Còn lại theo kế hoạch")
            : tr("Còn lại trong hũ")
        }
        value={money(row.closing)}
      >
        <DialogFacts
          items={[
            { label: tr("Mức tháng"), value: money(row.target) },
            {
              label: tr("Đã bỏ hũ"),
              value: money(
                (BigInt(row.funding) + BigInt(row.extra)).toString(),
              ),
            },
            { label: tr("Thực chi"), value: money(row.spent) },
          ]}
        />
        {row.status !== "actual" && (
          <p className="expense-muted">
            {row.status === "planned"
              ? tr("Tháng kế hoạch")
              : tr("Số liệu tạm tính")}
          </p>
        )}
      </DialogSummary>
      {!readonly && row.kind === "accumulation" && (
        <button
          type="button"
          className="expense-secondary"
          onClick={() => onEdit({ mode: "spend", row })}
        >
          {tr("Ghi lần sử dụng")}
        </button>
      )}
      <DialogTabs
        tabs={[
          {
            id: "months",
            label: tr("Theo tháng"),
            count: months.length,
            content: (
              <DialogList
                items={months}
                rowKey={(r) => r.month}
                label={tr("Các tháng trong năm {0}", { 0: year })}
                columns={[
                  {
                    label: tr("Tháng"),
                    render: (r) => (
                      <>
                        {dateLabel(r.month, locale)}
                        {r.status !== "actual" && (
                          <p className="expense-muted">
                            {r.status === "planned"
                              ? tr("Kế hoạch")
                              : tr("Tạm tính")}
                          </p>
                        )}
                      </>
                    ),
                  },
                  {
                    label: tr("Mức tháng"),
                    numeric: true,
                    render: (r) => money(r.target),
                  },
                  {
                    label: tr("Bỏ hũ"),
                    numeric: true,
                    render: (r) =>
                      money((BigInt(r.funding) + BigInt(r.extra)).toString()),
                  },
                  {
                    label: tr("Thực chi"),
                    numeric: true,
                    render: (r) => money(r.spent),
                  },
                  {
                    label: tr("Còn lại"),
                    numeric: true,
                    render: (r) => <strong>{money(r.closing)}</strong>,
                  },
                ]}
              />
            ),
          },
          ...(row.kind === "accumulation"
            ? [
                {
                  id: "spends",
                  label: tr("Các lần sử dụng"),
                  count: spends.filter((s) => !s.deleted).length,
                  content: (
                    <DialogList
                      items={spends}
                      rowKey={(s) => s.id}
                      label={tr("Các lần sử dụng · {0}", { 0: year })}
                      searchText={(s) => s.note}
                      getDate={(s) => s.date}
                      filters={[
                        {
                          label: tr("Trạng thái"),
                          initial: "active",
                          value: (s) => (s.deleted ? "deleted" : "active"),
                          options: [
                            { value: "active", label: tr("Đang có hiệu lực") },
                            { value: "", label: tr("Tất cả") },
                            { value: "deleted", label: tr("Đã xóa") },
                          ],
                        },
                      ]}
                      columns={[
                        {
                          label: tr("Ngày"),
                          render: (s) => dateLabel(s.date, locale),
                        },
                        {
                          label: tr("Nội dung"),
                          render: (s) => (
                            <>
                              <DialogNote
                                text={s.note || tr("Không có ghi chú")}
                              />
                              {s.deleted && <p>{tr("Đã xóa")}</p>}
                            </>
                          ),
                        },
                        {
                          label: tr("Số tiền"),
                          numeric: true,
                          render: (s) => <strong>{money(s.amount)}</strong>,
                        },
                        {
                          label: tr("Thao tác"),
                          render: (s) =>
                            !readonly && !s.deleted ? (
                              <div className="expense-actions">
                                <button
                                  type="button"
                                  className="expense-secondary icon-action action-edit"
                                  onClick={() =>
                                    onEdit({ mode: "spend", row, spend: s })
                                  }
                                  aria-label={tr("Sửa")}
                                  title={tr("Sửa")}
                                >
                                  <EditActionIcon
                                    size={18}
                                    aria-hidden="true"
                                  />
                                </button>
                                <button
                                  type="button"
                                  className="expense-secondary icon-action action-delete"
                                  onClick={() =>
                                    onEdit({ mode: "deleteSpend", spend: s })
                                  }
                                  aria-label={tr("Xóa")}
                                  title={tr("Xóa")}
                                >
                                  <DeleteActionIcon
                                    size={18}
                                    aria-hidden="true"
                                  />
                                </button>
                              </div>
                            ) : (
                              "—"
                            ),
                        },
                      ]}
                    />
                  ),
                },
              ]
            : []),
          {
            id: "audit",
            label: tr("Lịch sử thay đổi"),
            count: audit.length,
            content: (
              <DialogList
                items={audit}
                rowKey={(a) => String(a.version)}
                label={tr("Lịch sử thay đổi")}
                searchText={(a) => localizedActionNames[a.action] ?? a.action}
                columns={[
                  {
                    label: tr("Thời điểm"),
                    render: (a) =>
                      new Date(a.at).toLocaleString(numberLocale, {
                        timeZone: "Asia/Ho_Chi_Minh",
                      }),
                  },
                  {
                    label: tr("Thay đổi"),
                    render: (a) => (
                      <strong>
                        {localizedActionNames[a.action] ?? a.action}
                      </strong>
                    ),
                  },
                  { label: tr("Lần ghi"), render: (a) => `#${a.version}` },
                ]}
              />
            ),
          },
        ]}
      />
      <details className="dialog-secondary-section" open>
        <summary>{tr("Thông tin và quản lý hũ")}</summary>
        <DialogNote text={row.description || tr("Chưa có mô tả.")} />
        <p className="expense-muted">
          <LabelName name={row.method} labels={book.labels} />
          {row.group && (
            <>
              {" "}
              · <LabelName name={row.group} labels={book.labels} kind="group" />
            </>
          )}
        </p>
        {!readonly && (
          <div className="expense-actions">
            <button
              type="button"
              className="expense-secondary"
              onClick={() => onEdit({ mode: "emoji", row })}
            >
              <Palette size={18} aria-hidden="true" />
              {tr("Đổi biểu tượng")}
            </button>
            <button
              type="button"
              className="expense-secondary"
              onClick={() => onEdit({ mode: "configure", row })}
            >
              <Settings2 size={18} aria-hidden="true" />
              {tr("Sửa hũ / mức mặc định")}
            </button>
            {row.active && (
              <button
                type="button"
                className="expense-secondary expense-warning"
                onClick={() => onEdit({ mode: "stop", row })}
              >
                <Archive size={18} aria-hidden="true" />
                {tr("Ngừng cấp tiền")}
              </button>
            )}
          </div>
        )}
      </details>
    </ExpenseModal>
  );
}

export function ExpenseLabels({
  book,
  onClose,
  onEdit,
}: {
  book: ExpenseBook;
  onClose(): void;
  onEdit(mode: EditorMode): void;
}) {
  const { t: tr } = useI18n("expenses");

  return (
    <ExpenseModal
      title={tr("Phương thức và nhóm")}
      stableTabs
      size="detail"
      description={tr(
        "Danh sách lựa chọn khi thêm hũ. Các hũ giữ phân loại theo từng tháng.",
      )}
      onClose={onClose}
      footer={
        <div className="expense-actions">
          <button
            type="button"
            className="expense-primary"
            onClick={() => onEdit({ mode: "label" })}
          >
            {tr("Thêm phân loại")}
          </button>
        </div>
      }
    >
      <DialogTabs
        tabs={(["method", "group"] as const).map((kind) => ({
          id: kind,
          label: kind === "method" ? tr("Phương thức") : tr("Nhóm mục đích"),
          count: book.labels.filter((l) => l.kind === kind).length,
          content: (
            <DialogList
              items={book.labels.filter((l) => l.kind === kind)}
              rowKey={(l) => l.id}
              label={
                kind === "method" ? tr("Phương thức") : tr("Nhóm mục đích")
              }
              searchText={(l) => l.name}
              columns={[
                {
                  label: tr("Tên"),
                  render: (l) => (
                    <strong>
                      <LabelName
                        name={l.name}
                        labels={book.labels}
                        kind={l.kind}
                      />
                    </strong>
                  ),
                },
                {
                  label: tr("Thao tác"),
                  render: (l) => (
                    <div className="expense-actions">
                      <button
                        type="button"
                        className="expense-secondary icon-action action-edit"
                        onClick={() => onEdit({ mode: "label", label: l })}
                        aria-label={tr("Sửa")}
                        title={tr("Sửa")}
                      >
                        <EditActionIcon size={18} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className="expense-secondary icon-action action-delete"
                        onClick={() =>
                          onEdit({ mode: "deleteLabel", label: l })
                        }
                        aria-label={tr("Xóa")}
                        title={tr("Xóa")}
                      >
                        <DeleteActionIcon size={18} aria-hidden="true" />
                      </button>
                    </div>
                  ),
                },
              ]}
            />
          ),
        }))}
      />
    </ExpenseModal>
  );
}
