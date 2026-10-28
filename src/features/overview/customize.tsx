"use client";
import { ArrowUp, ArrowDown } from "lucide-react";
import { Modal } from "@/components/modal";
import { LoadingSpinner } from "@/components/loading";
import { useI18n } from "@/i18n/provider";
import {
  defaultLayout,
  widgetCatalog,
  widgetIds,
  type OverviewLayout,
} from "@/domain/overview/layout";
import type { OverviewData } from "@/domain/overview/summary";
import { useState } from "react";
export function Customize({
  layout,
  onChange,
  onClose,
  onPreview,
  onSave,
  onLatest,
  saving,
  error,
  conflict,
  jars,
  jarsLoading,
  onRetry,
}: {
  layout: OverviewLayout;
  onChange: (v: OverviewLayout) => void;
  onClose: () => void;
  onPreview: () => void;
  onSave: () => void;
  onLatest: () => void;
  saving: boolean;
  error: string;
  conflict: boolean;
  jars?: OverviewData["expenses"]["jars"];
  jarsLoading: boolean;
  onRetry: () => void;
}) {
  const { t } = useI18n("overview");
  const [announcement, announce] = useState("");
  const order = [
    ...layout.widgets,
    ...widgetIds.filter((id) => !layout.widgets.includes(id)),
  ];
  function move(index: number, delta: number) {
    const widgets = [...layout.widgets];
    [widgets[index], widgets[index + delta]] = [
      widgets[index + delta],
      widgets[index],
    ];
    onChange({ ...layout, widgets });
    announce(
      t("Đã chuyển {0} đến vị trí {1}.", {
        0: t(widgetCatalog[widgets[index + delta]].title),
        1: index + delta + 1,
      }),
    );
  }
  return (
    <Modal
      title={t("Tùy chỉnh Tổng quan")}
      size="detail"
      busy={saving}
      onClose={onClose}
      description={t(
        "Thay đổi được xem thử trên trang. Chọn Lưu để đồng bộ với tài khoản.",
      )}
      footer={
        <div className="expense-actions">
          <button
            className="expense-secondary"
            disabled={saving}
            onClick={onPreview}
          >
            {t("Xem thử bố cục")}
          </button>
          <button
            className="expense-secondary"
            disabled={saving}
            onClick={() => onChange(defaultLayout())}
          >
            {t("Khôi phục mặc định")}
          </button>
          <button
            className="expense-secondary"
            disabled={saving}
            onClick={onClose}
          >
            {t("Hủy")}
          </button>
          <button
            className="expense-primary"
            disabled={saving || conflict}
            aria-busy={saving}
            onClick={onSave}
          >
            {saving && <LoadingSpinner />}
            {t("Lưu")}
          </button>
        </div>
      }
    >
      <div className="overview-customize">
        <p className="sr-only" role="status">
          {announcement}
        </p>
        {error && (
          <div className="expense-notice" role="alert">
            <p>{t(error)}</p>
            {conflict && (
              <button
                className="expense-secondary"
                disabled={saving}
                onClick={onLatest}
              >
                {t("Tải bố cục mới")}
              </button>
            )}
          </div>
        )}
        {order.map((id) => {
          const index = layout.widgets.indexOf(id),
            enabled = index >= 0;
          return (
            <div key={id} className="overview-option" data-widget-option={id}>
              <label>
                <input
                  type="checkbox"
                  checked={enabled}
                  disabled={saving}
                  onChange={() =>
                    onChange({
                      ...layout,
                      widgets: enabled
                        ? layout.widgets.filter((w) => w !== id)
                        : [...layout.widgets, id],
                    })
                  }
                />
                <span>
                  <strong>{t(widgetCatalog[id].title)}</strong>
                  <small>{t(widgetCatalog[id].description)}</small>
                </span>
              </label>
              {enabled && (
                <div className="overview-move">
                  <button
                    className="expense-icon-button"
                    disabled={saving || index === 0}
                    aria-label={t("Chuyển {0} lên", {
                      0: t(widgetCatalog[id].title),
                    })}
                    onClick={() => move(index, -1)}
                  >
                    <ArrowUp size={18} />
                  </button>
                  <button
                    className="expense-icon-button"
                    disabled={saving || index === layout.widgets.length - 1}
                    aria-label={t("Chuyển {0} xuống", {
                      0: t(widgetCatalog[id].title),
                    })}
                    onClick={() => move(index, 1)}
                  >
                    <ArrowDown size={18} />
                  </button>
                </div>
              )}
              {id === "jars" && enabled && (
                <fieldset className="overview-jar-options">
                  <legend>{t("Chọn tối đa 5 hũ")}</legend>
                  {!jars ? (
                    <p role="status">
                      {t(
                        jarsLoading
                          ? "Đang tải danh sách hũ…"
                          : "Chưa tải được danh sách hũ.",
                      )}
                      {!jarsLoading && (
                        <button className="text-link" onClick={onRetry}>
                          {t("Thử tải lại")}
                        </button>
                      )}
                    </p>
                  ) : (
                    <>
                      {jars.length === 0 && (
                        <p>{t("Chưa có hũ. Bạn có thể tạo trong Chi tiêu.")}</p>
                      )}
                      {[
                        ...jars,
                        ...layout.jarIds
                          .filter((id) => !jars.some((j) => j.jarId === id))
                          .map((jarId) => ({
                            jarId,
                            name: t("Hũ không còn trong tháng này"),
                            active: false,
                          })),
                      ].map((j) => (
                        <label key={j.jarId}>
                          <input
                            type="checkbox"
                            checked={layout.jarIds.includes(j.jarId)}
                            disabled={
                              saving ||
                              (!layout.jarIds.includes(j.jarId) &&
                                layout.jarIds.length >= 5)
                            }
                            onChange={() =>
                              onChange({
                                ...layout,
                                jarIds: layout.jarIds.includes(j.jarId)
                                  ? layout.jarIds.filter((v) => v !== j.jarId)
                                  : [...layout.jarIds, j.jarId],
                              })
                            }
                          />
                          <span>
                            {j.name}
                            {!j.active && ` · ${t("Đã ngừng")}`}
                          </span>
                        </label>
                      ))}
                    </>
                  )}
                </fieldset>
              )}
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
