"use client";

import { useId, useRef, useState, type ComponentProps } from "react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowLeftRight,
  Ellipsis,
  History,
  Pencil,
  Archive,
  ArchiveRestore,
} from "lucide-react";
import { useI18n } from "@/i18n/provider";
import type { EditorMode } from "./editor-config";

function WalletAction({
  label,
  children,
  ...props
}: ComponentProps<"button"> & { label: string }) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  return (
    <span
      className="investment-wallet-action"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      <button
        {...props}
        type="button"
        className="expense-icon-button"
        aria-label={label}
        aria-describedby={visible ? id : undefined}
        onFocus={() => setVisible(true)}
        onBlur={() => setVisible(false)}
        onKeyDown={(event) => {
          if (event.key === "Escape" && visible) {
            event.preventDefault();
            event.stopPropagation();
            setVisible(false);
          }
        }}
        onClick={(event) => {
          setVisible(false);
          props.onClick?.(event);
        }}
      >
        {children}
      </button>
      {visible && (
        <span id={id} role="tooltip" className="investment-wallet-tooltip">
          {label}
        </span>
      )}
    </span>
  );
}

export function WalletActions({
  id,
  active,
  portfolioActive,
  onEdit,
}: {
  id: string;
  active: boolean;
  portfolioActive: boolean;
  onEdit(mode: EditorMode): void;
}) {
  const { t: tr } = useI18n("investments");
  const [expanded, setExpanded] = useState(false);
  const moreId = useId();
  const controls = useRef<HTMLDivElement>(null);
  const edit = (mode: EditorMode) => {
    setExpanded(false);
    onEdit(mode);
  };
  return (
    <div
      className="investment-wallet-controls"
      ref={controls}
      onKeyDown={(event) => {
        if (event.key === "Escape" && expanded) {
          event.preventDefault();
          event.stopPropagation();
          setExpanded(false);
          controls.current
            ?.querySelector<HTMLButtonElement>("[aria-expanded]")
            ?.focus();
        }
      }}
    >
      <div className="expense-actions investment-wallet-quick-actions">
        {portfolioActive &&
          active &&
          (
            [
              ["deposit", "Nạp tiền", ArrowDownToLine],
              ["withdraw", "Rút tiền", ArrowUpFromLine],
              ["transfer", "Chuyển ví", ArrowLeftRight],
            ] as const
          ).map(([kind, label, Icon]) => (
            <WalletAction
              key={kind}
              label={tr(label)}
              onClick={() =>
                edit({ type: "transaction", kind, categoryId: id })
              }
            >
              <Icon size={18} aria-hidden="true" />
            </WalletAction>
          ))}
        <WalletAction
          label={tr("Thêm thao tác")}
          aria-expanded={expanded}
          aria-controls={moreId}
          onClick={() => setExpanded(!expanded)}
        >
          <Ellipsis size={18} aria-hidden="true" />
        </WalletAction>
      </div>
      <div id={moreId} hidden={!expanded} className="investment-wallet-more">
        {portfolioActive && active && (
          <button
            type="button"
            className="expense-secondary"
            onClick={() =>
              edit({ type: "transaction", kind: "openingCash", categoryId: id })
            }
          >
            <History size={17} aria-hidden="true" />
            {tr("Số dư ví mở đầu")}
          </button>
        )}
        <button
          type="button"
          className="expense-secondary"
          onClick={() => edit({ type: "configure", categoryId: id })}
        >
          <Pencil size={17} aria-hidden="true" />
          {tr("Sửa")}
        </button>
        {portfolioActive && (
          <button
            type="button"
            className="expense-secondary"
            onClick={() =>
              edit({ type: active ? "archive" : "restore", categoryId: id })
            }
          >
            {active ? (
              <Archive size={17} aria-hidden="true" />
            ) : (
              <ArchiveRestore size={17} aria-hidden="true" />
            )}
            {active ? tr("Xóa / lưu trữ") : tr("Khôi phục")}
          </button>
        )}
      </div>
    </div>
  );
}
