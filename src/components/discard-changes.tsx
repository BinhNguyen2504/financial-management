"use client";

import { useState } from "react";
import { Modal } from "./modal";
import { useI18n } from "@/i18n/provider";

/** State comparison includes optional fields; the DOM check also catches invalid numeric drafts. */
export function useDiscardChanges(
  dirty: boolean,
  blocked: boolean,
  onClose: () => void,
  scopeId: string,
) {
  const [confirming, setConfirming] = useState(false);
  function close() {
    if (blocked) return;
    const invalid = document
      .getElementById(scopeId)
      ?.querySelector('[data-number-invalid="true"]');
    if (dirty || invalid) setConfirming(true);
    else onClose();
  }
  return {
    close,
    discardConfirmation: confirming ? (
      <DiscardConfirmation
        onContinue={() => setConfirming(false)}
        onDiscard={() => {
          if (!blocked) onClose();
        }}
      />
    ) : null,
  };
}

function DiscardConfirmation({
  onContinue,
  onDiscard,
}: {
  onContinue(): void;
  onDiscard(): void;
}) {
  const { t } = useI18n();
  return (
    <Modal
      title={t("Bỏ thay đổi?")}
      size="confirm"
      onClose={onContinue}
      footer={
        <>
          <button
            type="button"
            className="expense-secondary"
            onClick={onContinue}
          >
            {t("Tiếp tục nhập")}
          </button>
          <button
            type="button"
            className="expense-primary expense-danger"
            onClick={onDiscard}
          >
            {t("Bỏ thay đổi")}
          </button>
        </>
      }
    >
      <p>{t("Nội dung chưa lưu sẽ bị bỏ.")}</p>
    </Modal>
  );
}
