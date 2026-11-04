"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Modal } from "@/components/modal";
import { LoadingStatus } from "@/components/loading";
import { useI18n } from "@/i18n/provider";
import type { DetailResult, Metric, Report } from "@/domain/reports/model";
import { reportsJSON } from "./api";
import { ReportTable } from "./table";

export function ReportDetails({
  report,
  metric,
  onClose,
  onRefresh,
}: {
  report: Report;
  metric: Metric;
  onClose(): void;
  onRefresh(): void;
}) {
  const { t } = useI18n("reports"),
    [page, setPage] = useState(1),
    [data, setData] = useState<DetailResult | null>(null),
    [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const abort = new AbortController();
    const params = new URLSearchParams({
      ...Object.fromEntries(
        Object.entries(report.query).map(([k, v]) => [k, String(v)]),
      ),
      metric: metric.id,
      versions: report.versions,
      page: String(page),
    });
    reportsJSON<DetailResult>(`/details?${params}`, abort.signal)
      .then((value) => {
        if (!abort.signal.aborted) setData(value);
      })
      .catch((e) => {
        if (!abort.signal.aborted) setError(e.message);
      });
    return () => abort.abort();
  }, [report, metric.id, page, retry]);
  const source = metric.source === "expenses" ? "budgets" : metric.source;
  return (
    <Modal
      title={t("Xem nguồn số liệu")}
      size="detail"
      onClose={onClose}
      footer={
        <>
          {metric.id === "cashflow.difference" ? (
            <>
              <Link className="expense-secondary" href="/income">
                {t("Thu nhập")}
              </Link>
              <Link className="expense-secondary" href="/budgets">
                {t("Chi tiêu")}
              </Link>
            </>
          ) : (
            <Link className="expense-secondary" href={`/${source}`}>
              {t("Mở chức năng gốc")}
            </Link>
          )}
          <button className="expense-primary" onClick={onClose}>
            {t("Đóng")}
          </button>
        </>
      }
    >
      <p>
        {t(metric.label)} · {report.period.from} – {report.period.asOf}
      </p>
      {error ? (
        <div role="alert">
          <p>{t(error)}</p>
          <button
            className="expense-secondary"
            onClick={() => {
              setError("");
              setData(null);
              setRetry((r) => r + 1);
            }}
          >
            {t("Thử tải lại")}
          </button>
          <button
            className="expense-primary"
            onClick={() => {
              onClose();
              onRefresh();
            }}
          >
            {t("Cập nhật để xem chi tiết")}
          </button>
        </div>
      ) : data ? (
        <>
          <ReportTable
            paginated={false}
            table={{
              id: metric.id,
              title: metric.label,
              columns: data.columns,
              rows: data.rows,
            }}
          />
          {data.total > 20 && (
            <div className="reports-pagination">
              <button
                className="expense-secondary"
                disabled={page === 1}
                onClick={() => {
                  setData(null);
                  setPage(page - 1);
                }}
              >
                {t("Trang trước")}
              </button>
              <span>
                {t("Trang {page} / {pages}", {
                  page,
                  pages: Math.ceil(data.total / 20),
                })}
              </span>
              <button
                className="expense-secondary"
                disabled={page * 20 >= data.total}
                onClick={() => {
                  setData(null);
                  setPage(page + 1);
                }}
              >
                {t("Trang sau")}
              </button>
            </div>
          )}
        </>
      ) : (
        <LoadingStatus>{t("Đang tải Báo cáo…")}</LoadingStatus>
      )}
    </Modal>
  );
}
