"use client";
import { useI18n } from "@/i18n/provider";

import {
  paymentBrands,
  suggestedBrand,
  type LabelIconKey,
} from "@/domain/expenses/label-visuals";
import type { ExpenseRow, Label } from "@/domain/expenses/types";
import {
  Banknote,
  BriefcaseBusiness,
  Building2,
  CircleEllipsis,
  CreditCard,
  Gift,
  GraduationCap,
  Heart,
  House,
  PiggyBank,
  Plane,
  ShoppingBag,
  UserRound,
  Users,
  Utensils,
  Wallet,
} from "lucide-react";
import { useState } from "react";

export const labelIcons = {
  wallet: { Icon: Wallet, name: "Ví tiền" },
  bank: { Icon: Building2, name: "Ngân hàng" },
  cash: { Icon: Banknote, name: "Tiền mặt" },
  card: { Icon: CreditCard, name: "Thẻ" },
  family: { Icon: Users, name: "Gia đình" },
  personal: { Icon: UserRound, name: "Bản thân" },
  home: { Icon: House, name: "Nhà ở" },
  work: { Icon: BriefcaseBusiness, name: "Công việc" },
  health: { Icon: Heart, name: "Sức khỏe" },
  education: { Icon: GraduationCap, name: "Học tập" },
  travel: { Icon: Plane, name: "Du lịch" },
  gift: { Icon: Gift, name: "Quà tặng" },
  shopping: { Icon: ShoppingBag, name: "Mua sắm" },
  food: { Icon: Utensils, name: "Ăn uống" },
  savings: { Icon: PiggyBank, name: "Tích lũy" },
  other: { Icon: CircleEllipsis, name: "Khác" },
};
export function LabelVisual({
  name,
  label,
  kind = "method",
}: {
  name: string;
  label?: Label;
  kind?: "method" | "group";
}) {
  const { config: localize } = useI18n("expenses");
  const localizedLabelIcons = localize(labelIcons);

  const [failed, setFailed] = useState<string | null>(null);
  const brand =
    kind === "method" && label?.brandKey
      ? paymentBrands.find((item) => item.key === label.brandKey)
      : !label?.iconKey && kind === "method"
        ? suggestedBrand(name)
        : undefined;
  const key =
    label?.iconKey ??
    (/^(cash|tiền mặt)$/i.test(name)
      ? "cash"
      : kind === "method"
        ? "wallet"
        : /gia đình/i.test(name)
          ? "family"
          : /bản thân/i.test(name)
            ? "personal"
            : "other");
  const Icon = localizedLabelIcons[key as LabelIconKey]?.Icon ?? Wallet;
  return (
    <span className="label-visual" aria-hidden="true">
      {brand && failed !== brand.key ? (
        // eslint-disable-next-line @next/next/no-img-element -- Render fixed 20px local brand symbols without changing the existing fallback or asset URL.
        <img
          src={`/brands/${brand.file}`}
          alt=""
          width={20}
          height={20}
          onError={() => setFailed(brand.key)}
        />
      ) : (
        <Icon size={16} />
      )}
    </span>
  );
}
export function LabelName({
  name,
  labels,
  kind = "method",
}: {
  name: string;
  labels?: Label[];
  kind?: "method" | "group";
}) {
  return (
    <span className="label-name">
      <LabelVisual
        name={name}
        label={labels?.find((item) => item.kind === kind && item.name === name)}
        kind={kind}
      />
      <span>{name}</span>
    </span>
  );
}
export function JarClassification({
  row,
  labels,
}: {
  row: ExpenseRow;
  labels?: Label[];
}) {
  const { t: tr } = useI18n("expenses");

  return (
    <div className="expense-jar-meta">
      <span className="expense-kind-label">
        {row.kind === "monthly" ? tr("Chi tháng") : tr("Tích lũy")}
      </span>
      <LabelName name={row.method} labels={labels} />
      {row.group && <LabelName name={row.group} labels={labels} kind="group" />}
      {!row.active && (
        <span className="expense-inactive-label">{tr("Đã ngừng")}</span>
      )}
    </div>
  );
}
export function LabelSelect({
  name,
  value,
  onChange,
  labels,
  kind,
  error,
}: {
  name: string;
  value: string;
  onChange(value: string): void;
  labels: Label[];
  kind: "method" | "group";
  error?: string;
}) {
  const { t: tr } = useI18n("expenses");

  const id = `expense-field-${kind}`;
  const available = labels.filter((item) => item.kind === kind);
  const legacy = value && !available.some((item) => item.name === value);
  return (
    <div className="form-field">
      <label htmlFor={id}>
        {name}
        {kind === "method" && (
          <span className="required-mark" aria-hidden="true">
            *
          </span>
        )}
      </label>
      <div className="label-select">
        <LabelVisual
          name={value}
          label={available.find((item) => item.name === value)}
          kind={kind}
        />
        <select
          id={id}
          aria-label={name}
          name={kind}
          value={value}
          required={kind === "method"}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : `${id}-hint`}
        >
          <option value="">
            {kind === "method" ? tr("Chọn phương thức") : tr("Không chọn nhóm")}
          </option>
          {legacy && (
            <option value={value}>
              {value} {tr("· đã lưu trước đây")}
            </option>
          )}
          {available.map((item) => (
            <option key={item.id} value={item.name}>
              {item.name}
            </option>
          ))}
        </select>
      </div>
      {error && (
        <small className="field-error" id={`${id}-error`}>
          {tr(error)}
        </small>
      )}
      <small id={`${id}-hint`} className="expense-muted">
        {available.length
          ? tr("Chỉ chọn từ danh sách đã tạo trong Phân loại.")
          : tr(
              "Chưa có lựa chọn. Thêm phương thức hoặc nhóm trong Phân loại trước khi lưu hũ.",
            )}
      </small>
    </div>
  );
}
