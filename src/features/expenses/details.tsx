"use client";
import {
  Pencil as EditActionIcon,
  Trash2 as DeleteActionIcon,
} from "lucide-react";
import { Palette, Settings2, Archive, Plus } from "lucide-react";
import { LabelName } from "./label-visual";
import { useMoney } from "@/components/privacy";
import {
  DialogFacts,
  DialogList,
  DialogNote,
  DialogSummary,
  DialogTabs,
  dateLabel,
} from "@/components/dialog-content";
import type { ExpenseBook, ExpenseRow } from "@/domain/expenses/types";
import { ExpenseModal } from "./modal";
import type { EditorMode } from "./editor";
import { monthName } from "./format";

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
      description={`${monthName(row.month)} · ${row.kind === "monthly" ? "Chi trong tháng" : "Tích lũy"}`}
      onClose={onClose}
    >
      <DialogSummary
        label={
          row.status === "planned"
            ? "Còn lại theo kế hoạch"
            : "Còn lại trong hũ"
        }
        value={money(row.closing)}
      >
        <DialogFacts
          items={[
            { label: "Mức tháng", value: money(row.target) },
            {
              label: "Đã bỏ hũ",
              value: money(
                (BigInt(row.funding) + BigInt(row.extra)).toString(),
              ),
            },
            { label: "Thực chi", value: money(row.spent) },
          ]}
        />
        {row.status !== "actual" && (
          <p className="expense-muted">
            {row.status === "planned" ? "Tháng kế hoạch" : "Số liệu tạm tính"}
          </p>
        )}
      </DialogSummary>
      {!readonly && row.kind === "accumulation" && (
        <button
          type="button"
          className="expense-secondary"
          onClick={() => onEdit({ mode: "spend", row })}
        >
          Ghi lần sử dụng
        </button>
      )}
      <DialogTabs
        tabs={[
          {
            id: "months",
            label: "Theo tháng",
            count: months.length,
            content: (
              <DialogList
                items={months}
                rowKey={(r) => r.month}
                label={`Các tháng trong năm ${year}`}
                columns={[
                  {
                    label: "Tháng",
                    render: (r) => (
                      <>
                        {dateLabel(r.month)}
                        {r.status !== "actual" && (
                          <p className="expense-muted">
                            {r.status === "planned" ? "Kế hoạch" : "Tạm tính"}
                          </p>
                        )}
                      </>
                    ),
                  },
                  {
                    label: "Mức tháng",
                    numeric: true,
                    render: (r) => money(r.target),
                  },
                  {
                    label: "Bỏ hũ",
                    numeric: true,
                    render: (r) =>
                      money((BigInt(r.funding) + BigInt(r.extra)).toString()),
                  },
                  {
                    label: "Thực chi",
                    numeric: true,
                    render: (r) => money(r.spent),
                  },
                  {
                    label: "Còn lại",
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
                  label: "Các lần sử dụng",
                  count: spends.filter((s) => !s.deleted).length,
                  content: (
                    <DialogList
                      items={spends}
                      rowKey={(s) => s.id}
                      label={`Các lần sử dụng · ${year}`}
                      searchText={(s) => s.note}
                      getDate={(s) => s.date}
                      filters={[
                        {
                          label: "Trạng thái",
                          initial: "active",
                          value: (s) => (s.deleted ? "deleted" : "active"),
                          options: [
                            { value: "active", label: "Đang có hiệu lực" },
                            { value: "", label: "Tất cả" },
                            { value: "deleted", label: "Đã xóa" },
                          ],
                        },
                      ]}
                      columns={[
                        { label: "Ngày", render: (s) => dateLabel(s.date) },
                        {
                          label: "Nội dung",
                          render: (s) => (
                            <>
                              <DialogNote text={s.note || "Không có ghi chú"} />
                              {s.deleted && <p>Đã xóa</p>}
                            </>
                          ),
                        },
                        {
                          label: "Số tiền",
                          numeric: true,
                          render: (s) => <strong>{money(s.amount)}</strong>,
                        },
                        {
                          label: "Thao tác",
                          render: (s) =>
                            !readonly && !s.deleted ? (
                              <div className="expense-actions">
                                <button
                                  type="button"
                                  className="expense-secondary icon-action action-edit"
                                  onClick={() =>
                                    onEdit({ mode: "spend", row, spend: s })
                                  }
                                  aria-label="Sửa"
                                  title="Sửa"
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
                                  aria-label="Xóa"
                                  title="Xóa"
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
            label: "Lịch sử thay đổi",
            count: audit.length,
            content: (
              <DialogList
                items={audit}
                rowKey={(a) => String(a.version)}
                label="Lịch sử thay đổi"
                searchText={(a) => actionNames[a.action] ?? a.action}
                columns={[
                  {
                    label: "Thời điểm",
                    render: (a) =>
                      new Date(a.at).toLocaleString("vi-VN", {
                        timeZone: "Asia/Ho_Chi_Minh",
                      }),
                  },
                  {
                    label: "Thay đổi",
                    render: (a) => (
                      <strong>{actionNames[a.action] ?? a.action}</strong>
                    ),
                  },
                  { label: "Lần ghi", render: (a) => `#${a.version}` },
                ]}
              />
            ),
          },
        ]}
      />
      <details className="dialog-secondary-section" open>
        <summary>Thông tin và quản lý hũ</summary>
        <DialogNote text={row.description || "Chưa có mô tả."} />
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
              Đổi biểu tượng
            </button>
            <button
              type="button"
              className="expense-secondary"
              onClick={() => onEdit({ mode: "configure", row })}
            >
              <Settings2 size={18} aria-hidden="true" />
              Sửa hũ / mức mặc định
            </button>
            {row.active && (
              <button
                type="button"
                className="expense-secondary expense-warning"
                onClick={() => onEdit({ mode: "stop", row })}
              >
                <Archive size={18} aria-hidden="true" />
                Ngừng cấp tiền
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
  return (
    <ExpenseModal
      title="Phương thức và nhóm"
      stableTabs
      size="detail"
      description="Danh sách lựa chọn khi thêm hũ. Các hũ giữ phân loại theo từng tháng."
      onClose={onClose}
      footer={
        <div className="expense-actions">
          <button
            type="button"
            className="expense-primary"
            onClick={() => onEdit({ mode: "label" })}
          >
            Thêm phân loại
          </button>
        </div>
      }
    >
      <DialogTabs
        tabs={(["method", "group"] as const).map((kind) => ({
          id: kind,
          label: kind === "method" ? "Phương thức" : "Nhóm mục đích",
          count: book.labels.filter((l) => l.kind === kind).length,
          content: (
            <DialogList
              items={book.labels.filter((l) => l.kind === kind)}
              rowKey={(l) => l.id}
              label={kind === "method" ? "Phương thức" : "Nhóm mục đích"}
              searchText={(l) => l.name}
              columns={[
                {
                  label: "Tên",
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
                  label: "Thao tác",
                  render: (l) => (
                    <div className="expense-actions">
                      <button
                        type="button"
                        className="expense-secondary icon-action action-edit"
                        onClick={() => onEdit({ mode: "label", label: l })}
                        aria-label="Sửa"
                        title="Sửa"
                      >
                        <EditActionIcon size={18} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className="expense-secondary icon-action action-delete"
                        onClick={() =>
                          onEdit({ mode: "deleteLabel", label: l })
                        }
                        aria-label="Xóa"
                        title="Xóa"
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
