"use client";
import { RequiredFieldsNote } from "@/components/required-fields-note";
import { useI18n } from "@/i18n/provider";
import { LoadingSpinner } from "@/components/loading";

import { useToast } from "@/components/toast";
import { comparable } from "@/lib/form-values";
import { browserAuth } from "@/lib/supabase/browser";
import type { User } from "@supabase/supabase-js";
import { Save } from "lucide-react";

import { useRef, useState, type FormEvent } from "react";
import {
  initials,
  profileFields,
  profileSchema,
  type ProfileFields,
} from "./fields";
import { useUser } from "./user-provider";
export function ProfileForm({ user }: { user: User }) {
  const { t: tr } = useI18n("profile");

  const { update } = useUser();
  const toast = useToast();
  const [fields, setFields] = useState(() => profileFields(user.user_metadata));
  const [errors, setErrors] = useState<
    Partial<Record<keyof ProfileFields, string>>
  >({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  function change<K extends keyof ProfileFields>(
    key: K,
    value: ProfileFields[K],
  ) {
    setFields((previous) => ({ ...previous, [key]: value }));
    setErrors((previous) => ({ ...previous, [key]: undefined }));
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    setError("");
    const parsed = profileSchema.safeParse(fields);
    if (!parsed.success) {
      const next: typeof errors = {};
      for (const issue of parsed.error.issues)
        next[issue.path[0] as keyof ProfileFields] = issue.message;
      setErrors(next);
      form.current
        ?.querySelector<HTMLInputElement>(`[name="${Object.keys(next)[0]}"]`)
        ?.focus();
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await browserAuth().auth.updateUser({
        data: parsed.data,
      });
      if (error || !data.user) throw error ?? new Error("Missing user");
      update(data.user);
      setFields(profileFields(data.user.user_metadata));
      toast("success", tr("Đã lưu thông tin cá nhân."));
    } catch (failure) {
      const status =
        failure && typeof failure === "object" && "status" in failure
          ? Number(failure.status)
          : 0;
      const uncertain = !status || status >= 500;
      setError(
        uncertain
          ? tr(
              "Chưa xác nhận kết quả lưu. Nội dung đang nhập được giữ lại; hãy kiểm tra hồ sơ rồi thử lại.",
            )
          : tr(
              "Chưa lưu được thông tin. Nội dung đang nhập được giữ lại; hãy thử lại.",
            ),
      );
      toast(
        uncertain ? "warning" : "error",
        uncertain
          ? tr("Chưa xác nhận kết quả lưu hồ sơ. Hãy kiểm tra rồi thử lại.")
          : tr("Chưa lưu được thông tin cá nhân."),
      );
    } finally {
      setBusy(false);
    }
  }
  const name = profileFields(user.user_metadata).full_name || tr("Bạn");
  return (
    <section className="panel profile-panel" aria-label={tr("Hồ sơ của bạn")}>
      <div className="profile-identity">
        <span className="user-avatar profile-avatar" aria-hidden="true">
          {initials(name)}
        </span>
        <div>
          <h2>{name}</h2>
          <p>{user.email}</p>
        </div>
      </div>
      <form
        ref={form}
        className="expense-form profile-form"
        onSubmit={save}
        noValidate
        aria-busy={busy}
      >
        <RequiredFieldsNote />
        <fieldset disabled={busy}>
          <div className="profile-field">
            <label htmlFor="profile-name">
              {tr("Họ và tên")}
              <span className="required-mark" aria-hidden="true">
                *
              </span>
            </label>
            <input
              id="profile-name"
              aria-label={tr("Họ và tên")}
              name="full_name"
              autoComplete="name"
              maxLength={100}
              required
              value={fields.full_name}
              onChange={(e) => change("full_name", e.target.value)}
              aria-invalid={Boolean(errors.full_name)}
              aria-describedby={
                errors.full_name ? "profile-name-error" : undefined
              }
            />
            {errors.full_name && (
              <span id="profile-name-error" className="profile-field-error">
                {tr(errors.full_name)}
              </span>
            )}
          </div>
          <div className="profile-field">
            <label htmlFor="profile-email">Email</label>
            <input
              id="profile-email"
              type="email"
              autoComplete="email"
              value={user.email ?? ""}
              readOnly
              aria-describedby="profile-email-hint"
            />
            <span id="profile-email-hint" className="profile-hint">
              {tr("Email dùng để đăng nhập tài khoản.")}
            </span>
          </div>
          <div className="profile-form-grid">
            <div className="profile-field">
              <label htmlFor="profile-birth">{tr("Ngày sinh")}</label>
              <input
                id="profile-birth"
                name="birth_date"
                type="date"
                autoComplete="bday"
                min="1900-01-01"
                value={fields.birth_date}
                onChange={(e) => change("birth_date", e.target.value)}
                aria-invalid={Boolean(errors.birth_date)}
                aria-describedby={
                  errors.birth_date ? "profile-birth-error" : undefined
                }
              />
              {errors.birth_date && (
                <span id="profile-birth-error" className="profile-field-error">
                  {tr(errors.birth_date)}
                </span>
              )}
            </div>
            <div className="profile-field">
              <label htmlFor="profile-gender">{tr("Giới tính")}</label>
              <select
                id="profile-gender"
                name="gender"
                value={fields.gender}
                onChange={(e) =>
                  change("gender", e.target.value as ProfileFields["gender"])
                }
              >
                <option value="">{tr("Chưa cung cấp")}</option>
                <option value="female">{tr("Nữ")}</option>
                <option value="male">{tr("Nam")}</option>
                <option value="other">{tr("Khác")}</option>
                <option value="prefer_not_to_say">
                  {tr("Không muốn chia sẻ")}
                </option>
              </select>
            </div>
          </div>
        </fieldset>
        <p className="profile-hint">
          {tr("Ngày sinh và giới tính là thông tin tùy chọn.")}
        </p>
        <div className="expense-actions">
          <button
            aria-busy={busy}
            className="expense-primary"
            disabled={
              busy ||
              comparable(fields) ===
                comparable(profileFields(user.user_metadata))
            }
          >
            {busy ? <LoadingSpinner /> : <Save size={18} aria-hidden="true" />}
            {busy ? tr("Đang lưu…") : tr("Lưu thông tin")}
          </button>
        </div>
        <p role="alert" className="expense-error">
          {tr(error)}
        </p>
      </form>
    </section>
  );
}
