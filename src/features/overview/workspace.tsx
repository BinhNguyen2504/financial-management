"use client";
import Link from "next/link";
import { useRef } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Garden } from "@/components/garden";
import { LoadingSpinner, LoadingStatus } from "@/components/loading";
import { HelpPageTitle } from "@/features/help/provider";
import { useUser } from "@/features/profile/user-provider";
import { useI18n } from "@/i18n/provider";
import { vietnamClock } from "@/domain/shared/clock";
import { Customize } from "./customize";
import { OverviewWidget } from "./widgets";
import { useOverview } from "./use-overview";
import "./overview.css";
export function OverviewWorkspace({ configured }: { configured: boolean }) {
  const { user } = useUser();
  return (
    <AccountOverview key={user?.id ?? "unconfigured"} configured={configured} />
  );
}
function AccountOverview({ configured }: { configured: boolean }) {
  const { t } = useI18n("overview"),
    vm = useOverview(configured);
  const expenses = vm.sources.expenses;
  const customizeTrigger = useRef<HTMLButtonElement>(null);
  function openCustomizer() {
    customizeTrigger.current?.focus({ preventScroll: true });
    vm.open();
  }
  function closeCustomizer() {
    vm.edit(null);
    vm.setCustomizing(false);
    requestAnimationFrame(() =>
      customizeTrigger.current?.focus({ preventScroll: true }),
    );
  }
  return (
    <div className="zen-overview overview-workspace">
      <header className="overview-heading">
        <div>
          <HelpPageTitle>{t("Tổng quan")}</HelpPageTitle>
          <p>{t("Một góc nhìn chung, từng khoản rõ ràng.")}</p>
        </div>
        <Garden variant="jar" />
        <button
          ref={customizeTrigger}
          className="expense-primary"
          disabled={!configured || !vm.layoutReady}
          onClick={openCustomizer}
        >
          <SlidersHorizontal size={17} aria-hidden="true" />
          {t("Tùy chỉnh Tổng quan")}
        </button>
        {vm.loading && vm.summary && (
          <p className="overview-refresh" role="status">
            <LoadingSpinner />
            {t("Đang cập nhật Tổng quan…")}
          </p>
        )}
      </header>
      {!configured && (
        <div className="expense-notice">
          {t("Kết nối dịch vụ đăng nhập và lưu trữ để bắt đầu.")}
        </div>
      )}
      {vm.error && (
        <div className="expense-notice" role="alert">
          <p>{t(vm.error)}</p>
          <button
            className="expense-secondary"
            aria-busy={vm.loading}
            disabled={vm.loading}
            onClick={() => void vm.reload().catch(() => {})}
          >
            {vm.loading && <LoadingSpinner />}
            {t("Thử tải lại")}
          </button>
          {vm.needsLogin && (
            <Link className="text-link" href="/login?next=/overview">
              {t("Đăng nhập")}
            </Link>
          )}
        </div>
      )}
      {vm.draft && (
        <div className="overview-preview-note">
          <p role="status">
            {t("Đang xem thử bố cục. Chưa lưu vào tài khoản.")}
          </p>
          <div className="expense-actions">
            <button
              className="expense-secondary"
              disabled={vm.saving}
              onClick={openCustomizer}
            >
              {t("Chỉnh tiếp")}
            </button>
            <button
              className="expense-secondary"
              disabled={vm.saving}
              onClick={() => {
                vm.edit(null);
                vm.setCustomizing(false);
              }}
            >
              {t("Hủy")}
            </button>
            <button
              className="expense-primary"
              disabled={vm.saving || vm.conflict}
              aria-busy={vm.saving}
              onClick={() => void vm.save()}
            >
              {vm.saving && <LoadingSpinner />}
              {t("Lưu")}
            </button>
          </div>
          {vm.saveError && (
            <p role="alert">
              {t(vm.saveError)}
              {vm.conflict && (
                <button
                  className="text-link"
                  onClick={() => void vm.loadLatest()}
                >
                  {t("Tải bố cục mới")}
                </button>
              )}
            </p>
          )}
        </div>
      )}
      {vm.layout && !vm.layout.widgets.length && (
        <div className="panel overview-empty-layout">
          <h2>{t("Tổng quan theo cách của bạn")}</h2>
          <p>{t("Thêm widget để xem nhanh những điều bạn quan tâm.")}</p>
          <button
            className="expense-primary"
            disabled={!vm.layoutReady}
            onClick={openCustomizer}
          >
            {t("Tùy chỉnh Tổng quan")}
          </button>
        </div>
      )}
      {configured && !vm.layout && vm.loading && (
        <div className="panel overview-initial-loading">
          <LoadingStatus>{t("Đang tải Tổng quan…")}</LoadingStatus>
        </div>
      )}
      <div className="overview-widget-grid" data-ready={!!vm.summary}>
        {configured &&
          vm.layout?.widgets.map((id) => (
            <OverviewWidget
              key={id}
              id={id}
              sources={vm.sources}
              staleSources={vm.staleSources}
              loading={vm.loading}
              today={vm.summary?.today ?? vietnamClock().today}
              jarIds={vm.layout!.jarIds}
              widgets={vm.layout!.widgets}
              onRetry={() => void vm.reload().catch(() => {})}
            />
          ))}
      </div>
      <p className="overview-footnote">
        {t(
          "Mỗi module là một sổ độc lập. Các giá trị ở đây chưa được cộng thành tài sản ròng.",
        )}
      </p>
      {vm.draft && vm.customizing && (
        <Customize
          layout={vm.draft}
          onChange={vm.edit}
          onClose={closeCustomizer}
          onPreview={() => vm.setCustomizing(false)}
          onSave={() => void vm.save()}
          onLatest={() => void vm.loadLatest()}
          saving={vm.saving}
          error={vm.saveError}
          conflict={vm.conflict}
          jars={expenses?.status === "ready" ? expenses.data.jars : undefined}
          jarsLoading={vm.loading}
          onRetry={() => void vm.reload().catch(() => {})}
        />
      )}
    </div>
  );
}
