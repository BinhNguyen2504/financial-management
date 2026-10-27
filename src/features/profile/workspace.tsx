"use client";
import { ProfileForm } from "./profile-form";

import { useI18n } from "@/i18n/provider";

import { LoadingStatus } from "@/components/loading";
import { HelpPageTitle } from "@/features/help/provider";

import { BackButton } from "@/components/back-button";

import Link from "next/link";

import { useUser } from "./user-provider";

export function ProfileWorkspace() {
  const { t: tr } = useI18n("profile");

  const { user, configured, loading, error, reload } = useUser();
  return (
    <div className="profile-workspace">
      <div className="expense-page-heading">
        <div>
          <p className="eyebrow">{tr("KHÔNG GIAN CỦA BẠN")}</p>
          <HelpPageTitle>{tr("Thông tin cá nhân")}</HelpPageTitle>
          <p className="lead">
            {tr("Một vài thông tin cơ bản để làm quen và giữ liên lạc.")}
          </p>
        </div>
        <BackButton />
      </div>
      {loading ? (
        <LoadingStatus>{tr("Đang tải thông tin cá nhân…")}</LoadingStatus>
      ) : error ? (
        <div className="panel">
          <p className="expense-error" role="alert">
            {tr(error)}
          </p>
          <button className="expense-secondary" onClick={() => void reload()}>
            {tr("Thử tải lại")}
          </button>
        </div>
      ) : !configured ? (
        <section className="panel">
          <h2>{tr("Chưa kết nối dịch vụ đăng nhập")}</h2>
          <p>
            {tr(
              "Thông tin cá nhân sẽ được lưu cùng tài khoản khi dịch vụ đăng nhập được kết nối.",
            )}
          </p>
        </section>
      ) : !user ? (
        <section className="panel">
          <h2>{tr("Đăng nhập để xem thông tin cá nhân")}</h2>
          <Link className="expense-primary" href="/login?next=/profile">
            {tr("Đăng nhập")}
          </Link>
        </section>
      ) : (
        <ProfileForm key={user.id} user={user} />
      )}
    </div>
  );
}
