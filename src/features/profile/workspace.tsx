"use client";
import { HelpPageTitle } from "@/features/help/provider";
import { LoadingStatus, LoadingSpinner } from "@/components/loading";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import type { User } from "@supabase/supabase-js";
import { BackButton } from "@/components/back-button";
import { comparable } from "@/lib/form-values";
import { Save } from "lucide-react";
import { useToast } from "@/components/toast";
import { browserAuth } from "@/lib/supabase/browser";
import { useUser } from "./user-provider";
import {
  initials,
  profileFields,
  profileSchema,
  type ProfileFields,
} from "./fields";

export function ProfileWorkspace() {
  const { user, configured, loading, error, reload } = useUser();
  return (
    <div className="profile-workspace">
      <div className="expense-page-heading">
        <div>
          <p className="eyebrow">KHÔNG GIAN CỦA BẠN</p>
          <HelpPageTitle>Thông tin cá nhân</HelpPageTitle>
          <p className="lead">
            Một vài thông tin cơ bản để làm quen và giữ liên lạc.
          </p>
        </div>
        <BackButton />
      </div>
      {loading ? (
        <LoadingStatus>Đang tải thông tin cá nhân…</LoadingStatus>
      ) : error ? (
        <div className="panel">
          <p className="expense-error" role="alert">
            {error}
          </p>
          <button className="expense-secondary" onClick={() => void reload()}>
            Thử tải lại
          </button>
        </div>
      ) : !configured ? (
        <section className="panel">
          <h2>Chưa kết nối dịch vụ đăng nhập</h2>
          <p>
            Thông tin cá nhân sẽ được lưu cùng tài khoản khi dịch vụ đăng nhập
            được kết nối.
          </p>
        </section>
      ) : !user ? (
        <section className="panel">
          <h2>Đăng nhập để xem thông tin cá nhân</h2>
          <Link className="expense-primary" href="/login?next=/profile">
            Đăng nhập
          </Link>
        </section>
      ) : (
        <ProfileForm key={user.id} user={user} />
      )}
    </div>
  );
}

function ProfileForm({ user }: { user: User }) {
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
      toast("success", "Đã lưu thông tin cá nhân.");
    } catch (failure) {
      const status =
        failure && typeof failure === "object" && "status" in failure
          ? Number(failure.status)
          : 0;
      const uncertain = !status || status >= 500;
      setError(
        uncertain
          ? "Chưa xác nhận kết quả lưu. Nội dung đang nhập được giữ lại; hãy kiểm tra hồ sơ rồi thử lại."
          : "Chưa lưu được thông tin. Nội dung đang nhập được giữ lại; hãy thử lại.",
      );
      toast(
        uncertain ? "warning" : "error",
        uncertain
          ? "Chưa xác nhận kết quả lưu hồ sơ. Hãy kiểm tra rồi thử lại."
          : "Chưa lưu được thông tin cá nhân.",
      );
    } finally {
      setBusy(false);
    }
  }
  const name = profileFields(user.user_metadata).full_name || "Bạn";
  return (
    <section className="panel profile-panel" aria-label="Hồ sơ của bạn">
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
        <p className="required-fields-note">
          <span className="required-mark" aria-hidden="true">
            *
          </span>{" "}
          là thông tin cần nhập.
        </p>
        <fieldset disabled={busy}>
          <div className="profile-field">
            <label htmlFor="profile-name">
              Họ và tên
              <span className="required-mark" aria-hidden="true">
                *
              </span>
            </label>
            <input
              id="profile-name"
              aria-label="Họ và tên"
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
                {errors.full_name}
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
              Email dùng để đăng nhập tài khoản.
            </span>
          </div>
          <div className="profile-form-grid">
            <div className="profile-field">
              <label htmlFor="profile-birth">Ngày sinh</label>
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
                  {errors.birth_date}
                </span>
              )}
            </div>
            <div className="profile-field">
              <label htmlFor="profile-gender">Giới tính</label>
              <select
                id="profile-gender"
                name="gender"
                value={fields.gender}
                onChange={(e) =>
                  change("gender", e.target.value as ProfileFields["gender"])
                }
              >
                <option value="">Chưa cung cấp</option>
                <option value="female">Nữ</option>
                <option value="male">Nam</option>
                <option value="other">Khác</option>
                <option value="prefer_not_to_say">Không muốn chia sẻ</option>
              </select>
            </div>
          </div>
        </fieldset>
        <p className="profile-hint">
          Ngày sinh và giới tính là thông tin tùy chọn.
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
            {busy ? "Đang lưu…" : "Lưu thông tin"}
          </button>
        </div>
        <p role="alert" className="expense-error">
          {error}
        </p>
      </form>
    </section>
  );
}
