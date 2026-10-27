"use client";
import { formatMoney } from "@/i18n/format";
import { useI18n } from "@/i18n/provider";

import { ModuleIcon } from "@/components/module-icon";
import {
  languageSummary,
  modules,
  moduleStatusLabels,
  navigationSummary,
  publicHomeSummary,
} from "@/features/catalog";
import {
  ArrowDown,
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  CircleCheck,
  EyeOff,
  Fingerprint,
  Layers3,
  MoveUpRight,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import { ProductPreview } from "./product-preview";

function BeginLink({ children = "Bắt đầu sử dụng" }: { children?: string }) {
  const { t: tr } = useI18n("landing");
  return (
    <Link
      className="marketing-button"
      href="/login?next=%2Foverview"
      prefetch={false}
    >
      {tr(children)}
      <ArrowUpRight size={19} aria-hidden="true" />
    </Link>
  );
}

const featureCopy: Record<string, string> = {
  income: "Rõ từng khoản thu.",
  budgets: "Chi tiêu có chủ đích.",
  savings: "Tích lũy có hành trình, giao dịch rõ từng kỳ.",
  investments: "Hiểu từng khoản đầu tư.",
  funds: "Chủ động trước bất ngờ.",
};

export function MarketingLanding() {
  const { t: tr, locale } = useI18n("landing");
  return (
    <>
      <section
        className="marketing-hero marketing-container"
        aria-labelledby="marketing-title"
      >
        <div className="marketing-hero-copy">
          <p className="marketing-eyebrow">
            <span /> {tr("TÀI CHÍNH RÕ RÀNG. CUỘC SỐNG CHỦ ĐỘNG.")}
          </p>
          <h1 id="marketing-title">
            {tr("Làm chủ tiền bạc.")}
            <br />
            <span>
              {tr("Sống trọn điều")}
              <br className="marketing-desktop-break" /> {tr("bạn muốn.")}
            </span>
          </h1>
          <p className="marketing-lead">
            {tr(
              "Financial Manager giúp bạn quản lý tài chính cá nhân: theo dõi thu nhập, chia hũ chi tiêu, tích lũy tiết kiệm và ghi nhận đầu tư. Từ những khoản thu chi mỗi ngày đến các dự định dài lâu.",
            )}
          </p>
          <div className="marketing-actions">
            <BeginLink />
            <a className="marketing-text-link" href="#trai-nghiem">
              {tr("Khám phá giao diện")}{" "}
              <ArrowDown size={17} aria-hidden="true" />
            </a>
          </div>
          <p className="marketing-hero-note">
            <Check size={15} aria-hidden="true" />{" "}
            {tr("Xem thử ngay, không cần tài khoản.")}
          </p>
        </div>
        <div
          className="marketing-composition"
          aria-label={tr("Minh họa kế hoạch chi tiêu tháng 06 năm 2026")}
        >
          <div
            className="marketing-orbit marketing-orbit-one"
            aria-hidden="true"
          />
          <div
            className="marketing-orbit marketing-orbit-two"
            aria-hidden="true"
          />
          <span className="marketing-art-index" aria-hidden="true">
            {tr("MỘT GÓC TÀI CHÍNH CỦA BẠN / 01")}
          </span>
          <div className="marketing-plan-card">
            <div className="marketing-card-top">
              <WalletCards size={21} aria-hidden="true" />
              <span>{tr("KẾ HOẠCH THÁNG")}</span>
              <span>06 / 2026</span>
            </div>
            <p>
              {tr("Mỗi đồng tiền.")}
              <br />
              {tr("Một mục đích.")}
            </p>
            <div className="marketing-plan-total">
              {formatMoney("12000000", locale).slice(0, -2)} <small>₫</small>
            </div>
            <div className="marketing-allocation" aria-hidden="true">
              <i />
              <i />
              <i />
            </div>
            <div className="marketing-plan-legend">
              <span>
                <i /> {tr("Sinh hoạt")}
              </span>
              <span>
                <i /> {tr("Chăm sóc bản thân")}
              </span>
            </div>
            <div className="marketing-plan-bottom">
              <span>{tr("Số còn trong hũ")}</span>
              <strong>{formatMoney("4650000", locale)}</strong>
            </div>
          </div>
          <div className="marketing-income-card">
            <span className="marketing-mini-icon">
              <ArrowDownLeft size={20} aria-hidden="true" />
            </span>
            <div>
              <span>{tr("Thu nhập tháng 06")}</span>
              <strong>{formatMoney("28500000", locale)}</strong>
            </div>
            <CircleCheck size={18} aria-hidden="true" />
          </div>
          <div className="marketing-saving-card">
            <span className="marketing-saving-ring" aria-hidden="true">
              <Layers3 size={24} />
            </span>
            <div>
              <span>{tr("Tài sản trong Tiết kiệm")}</span>
              <strong>{formatMoney("85000000", locale)}</strong>
              <small>{tr("Từng bước, thêm vững vàng.")}</small>
            </div>
          </div>
          <span className="marketing-art-caption">
            {tr("DỮ LIỆU MINH HỌA · KHÔNG PHẢI TÀI KHOẢN THẬT")}
          </span>
        </div>
      </section>

      <div
        className="marketing-benefits marketing-container"
        aria-label={tr("Lợi ích sản phẩm")}
      >
        <p>
          <Layers3 size={19} aria-hidden="true" />
          <span>{tr("Thu, chi và tích lũy trong một nơi")}</span>
        </p>
        <p>
          <EyeOff size={19} aria-hidden="true" />
          <span>{tr("Chủ động che số tiền khi cần")}</span>
        </p>
        <p>
          <Fingerprint size={19} aria-hidden="true" />
          <span>{tr("Không gian riêng sau đăng nhập")}</span>
        </p>
      </div>

      <section
        className="marketing-showcase marketing-container"
        id="trai-nghiem"
        aria-labelledby="marketing-preview-title"
      >
        <div className="marketing-section-heading">
          <div>
            <p className="marketing-eyebrow">
              {tr("01 / TỪ CON SỐ ĐẾN SỰ RÕ RÀNG")}
            </p>
            <h2 id="marketing-preview-title">
              {tr("Bớt đoán.")}
              <br />
              {tr("Hiểu rõ hơn.")}
            </h2>
          </div>
          <p>
            {tr(
              "Tháng này nhận bao nhiêu? Các hũ còn lại thế nào? Phần tích lũy đang ở đâu? Khám phá từng mục bằng dữ liệu minh họa bên dưới.",
            )}
          </p>
        </div>
        <ProductPreview appearance="marketing" />
        <div className="marketing-preview-caption">
          <span>
            <span className="marketing-live-dot" />{" "}
            {tr("BẢN XEM THỬ TƯƠNG TÁC")}
          </span>
          <p>
            {tr(
              "Chọn một mục, thử che số tiền. Mọi thao tác ở đây chỉ để khám phá.",
            )}
          </p>
        </div>
      </section>

      <section
        className="marketing-features marketing-container"
        aria-labelledby="marketing-features-title"
      >
        <div className="marketing-section-heading">
          <div>
            <p className="marketing-eyebrow">
              {tr("02 / CHO TỪNG QUYẾT ĐỊNH MỖI NGÀY")}
            </p>
            <h2 id="marketing-features-title">
              {tr("Quản lý thu chi,")}
              <br />
              {tr("tiết kiệm và đầu tư.")}
            </h2>
          </div>
          <p>
            {tr(
              "Bắt đầu từ một khoản thu, một hũ chi tiêu. Thêm những mảnh ghép khác khi bạn sẵn sàng.",
            )}
          </p>
        </div>
        <div className="marketing-feature-grid">
          {modules
            .filter((item) => item.slug in featureCopy)
            .map((item, index) => (
              <article
                className={`marketing-feature marketing-feature-${item.slug}`}
                key={item.slug}
              >
                <div className="marketing-feature-top">
                  <ModuleIcon name={item.icon} size={24} />
                  <span>0{index + 1}</span>
                </div>
                <p className="marketing-feature-label">{tr(item.title)}</p>
                <h3>{tr(featureCopy[item.slug])}</h3>
                <p>{tr(item.description)}</p>
                {item.slug === "budgets" && (
                  <div className="marketing-jar-visual" aria-hidden="true">
                    <span>
                      <i />
                      {tr("Sinh hoạt")}
                    </span>
                    <span>
                      <i />
                      {tr("Bản thân")}
                    </span>
                    <span>
                      <i />
                      {tr("Tích lũy")}
                    </span>
                  </div>
                )}
              </article>
            ))}
        </div>
      </section>

      <section
        className="marketing-philosophy"
        id="cau-chuyen"
        aria-labelledby="marketing-story-title"
      >
        <div className="marketing-container marketing-philosophy-grid">
          <div>
            <p className="marketing-eyebrow">
              {tr("03 / MỘT THÓI QUEN, MỘT THAY ĐỔI")}
            </p>
            <h2 id="marketing-story-title">
              {tr("Tiền có kế hoạch.")}
              <br />
              {tr("Bạn có khoảng thở.")}
            </h2>
            <p>
              {tr(
                "Financial Manager bắt đầu từ một nhu cầu rất thật: có một công cụ mà chính mình muốn mở mỗi ngày. Ít rối hơn, rõ ràng hơn, gần với cuộc sống hơn.",
              )}
            </p>
            <a className="marketing-text-link" href="#trai-nghiem">
              {tr("Tìm điểm bắt đầu của bạn")}{" "}
              <MoveUpRight size={18} aria-hidden="true" />
            </a>
          </div>
          <ol className="marketing-steps">
            <li>
              <span>01</span>
              <div>
                <h3>{tr("Nhìn lại điều đang có")}</h3>
                <p>
                  {tr(
                    "Ghi nhận thu nhập, khoản chi và phần tích lũy để hiểu tình hình hiện tại.",
                  )}
                </p>
              </div>
            </li>
            <li>
              <span>02</span>
              <div>
                <h3>{tr("Chia trước, chi sau")}</h3>
                <p>
                  {tr(
                    "Mỗi hũ có một mục đích. Ngân hàng, ví hay tiền mặt là nơi giữ tiền; ứng dụng giúp bạn tổng hợp, không chuyển tiền.",
                  )}
                </p>
              </div>
            </li>
            <li>
              <span>03</span>
              <div>
                <h3>{tr("Điều chỉnh theo cuộc sống")}</h3>
                <p>
                  {tr(
                    "Xem lại lịch sử, cập nhật kế hoạch và từng bước chuẩn bị cho điều phía trước.",
                  )}
                </p>
              </div>
            </li>
          </ol>
        </div>
      </section>

      <section
        className="marketing-container marketing-details"
        id="dang-phat-trien"
        aria-labelledby="marketing-details-title"
      >
        <div>
          <p className="marketing-eyebrow">{tr("RÕ RÀNG NGAY TỪ ĐẦU")}</p>
          <h2 id="marketing-details-title">
            {tr("Hiểu sản phẩm.")}
            <br />
            {tr("An tâm bắt đầu.")}
          </h2>
          <p>
            {tr(
              "Những điều có thể bạn muốn biết trước khi mở không gian của mình.",
            )}
          </p>
          <span className="marketing-stage">
            {tr("Sản phẩm đang phát triển")}
          </span>
        </div>
        <div className="marketing-faq">
          <details open>
            <summary>{tr("Tôi có thể sử dụng những gì hôm nay?")}</summary>
            <div className="marketing-answer">
              <p>
                {tr(
                  "Thu nhập, Chi tiêu, Tiết kiệm, Đầu tư và Quỹ an toàn đã có trong bản hiện tại.",
                )}
              </p>
              <div className="marketing-status-list">
                {modules
                  .filter((item) => item.status !== "planned")
                  .map((item) => (
                    <p key={item.slug}>
                      <span>{tr(item.title)}</span>
                      <small>{tr(moduleStatusLabels[item.status])}</small>
                    </p>
                  ))}
              </div>
              <p>
                {tr(
                  "Tổng quan tập trung vào hũ chi tiêu; chưa có tổng tài sản ròng toàn hệ thống. Các mục",
                )}{" "}
                {modules
                  .filter((item) => item.status === "planned")
                  .map((item) => tr(item.title))
                  .join(", ")}{" "}
                {tr("đang phát triển.")}
              </p>
            </div>
          </details>
          <details>
            <summary>
              {tr("Có cần liên kết tài khoản ngân hàng không?")}
            </summary>
            <div className="marketing-answer">
              <p>
                {tr(
                  "Không. Bạn chủ động ghi nhận và theo dõi số liệu. Ứng dụng chưa kết nối ngân hàng và không thực hiện chuyển tiền.",
                )}
              </p>
            </div>
          </details>
          <details>
            <summary>{tr("Bắt đầu sử dụng như thế nào?")}</summary>
            <div className="marketing-answer">
              <p>
                {tr(
                  "Đăng nhập bằng mã 8 chữ số gửi qua email. Mã dùng một lần, có hiệu lực 30 phút. Chọn một mục bạn muốn quản lý trước; nút Hướng dẫn cạnh tiêu đề giúp bạn tìm hiểu thuật ngữ và từng thao tác.",
                )}
              </p>
              <p>{tr(publicHomeSummary)}</p>
            </div>
          </details>
          <details>
            <summary>{tr("Tôi có thể tự giữ bản sao dữ liệu không?")}</summary>
            <div className="marketing-answer">
              <p>
                {tr(
                  "Có. Trong Cài đặt, tải bản sao lưu JSON và khôi phục vào tài khoản trống khi cần. File không có mật khẩu; hãy giữ ở nơi an toàn.",
                )}
              </p>
            </div>
          </details>
          <details>
            <summary>{tr("Có thể dùng tiếng Anh không?")}</summary>
            <div className="marketing-answer">
              <p>{tr(languageSummary)}</p>
            </div>
          </details>
          <details>
            <summary>{tr("Có dùng được trên điện thoại không?")}</summary>
            <div className="marketing-answer">
              <p>
                {tr(
                  "Giao diện được thiết kế cho điện thoại và máy tính. Tab giữ nhãn đầy đủ; bảng rộng cuộn trong vùng riêng. Bản triển khai qua HTTPS hỗ trợ thêm vào màn hình chính. Hiện chưa hỗ trợ nhập dữ liệu khi mất mạng.",
                )}
              </p>
              <p>{tr(navigationSummary)}</p>
            </div>
          </details>
          <details>
            <summary>{tr("Các con số trên trang này là của ai?")}</summary>
            <div className="marketing-answer">
              <p>
                {tr(
                  "Đây là dữ liệu minh họa cố định. Bản xem thử không đọc tài chính của bạn và không lưu thao tác vào tài khoản.",
                )}
              </p>
            </div>
          </details>
        </div>
      </section>

      <section
        className="marketing-final marketing-container"
        aria-labelledby="marketing-final-title"
      >
        <div>
          <p className="marketing-eyebrow">{tr("CHO NHỮNG ĐIỀU BẠN MUỐN")}</p>
          <h2 id="marketing-final-title">
            {tr("Ngày mai rõ ràng hơn.")}
            <br />
            {tr("Bắt đầu từ hôm nay.")}
          </h2>
          <p>{tr("Một khoản thu. Một hũ chi tiêu. Một bước chủ động.")}</p>
          <BeginLink>Mở không gian của bạn</BeginLink>
        </div>
        <ArrowUpRight
          className="marketing-final-arrow"
          size={240}
          strokeWidth={0.7}
          aria-hidden="true"
        />
      </section>
    </>
  );
}
