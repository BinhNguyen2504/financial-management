"use client";
import { useI18n } from "@/i18n/provider";

import { Garden } from "@/components/garden";
import { ModuleIcon } from "@/components/module-icon";
import { ThemeIcon, ThemeText } from "@/components/theme-decoration";
import {
  languageSummary,
  modules,
  moduleStatusLabels,
  navigationSummary,
  pageHelpSummary,
} from "@/features/catalog";
import { StartLink } from "@/features/landing/account-actions";
import { ProductPreview } from "@/features/landing/product-preview";
import {
  ArrowDown,
  ArrowUpRight,
  Check,
  EyeOff,
  Fingerprint,
} from "lucide-react";

const features = modules.filter((item) =>
  ["income", "budgets", "savings", "investments", "funds"].includes(item.slug),
);
const benefits: Record<string, { heading: string; detail: string }> = {
  funds: {
    heading: "Vun đắp nền tảng an tâm.",
    detail: "Chi phí sinh hoạt · Ba quỹ · Tiến độ trực quan",
  },
  income: {
    heading: "Biết rõ tiền đến từ đâu.",
    detail: "Thực nhận rõ ràng · Báo cáo theo kỳ",
  },
  budgets: {
    heading: "Mỗi hũ, một mục đích.",
    detail: "Hũ chi tháng · Hũ tích lũy · Ghi sử dụng tiền tích lũy",
  },
  investments: {
    heading: "Hiểu rõ vốn và giá trị hiện tại.",
    detail: "Danh mục · Tiền chờ · Lãi/lỗ",
  },
  savings: {
    heading: "Nhìn thấy hành trình tích lũy.",
    detail: "Tiền · Sổ tiền gửi · Vàng · Danh mục và giao dịch rõ từng cột",
  },
};

export function ThemedLanding() {
  const { t: tr } = useI18n("landing");
  return (
    <>
      <section
        className="landing-hero landing-container"
        aria-labelledby="landing-title"
      >
        <div className="hero-topline">
          <span className="landing-kicker">
            <span className="status-dot" />
            {tr("TÀI CHÍNH CÁ NHÂN, THEO NHỊP CỦA BẠN")}
          </span>
          <span className="landing-stage">{tr("Đang phát triển")}</span>
        </div>
        <div className="hero-copy">
          <h1 id="landing-title">
            {tr("Một nơi rõ ràng hơn")}
            <br /> {tr("cho")} <span>{tr("tài chính của bạn.")}</span>
          </h1>
          <div className="hero-aside">
            <p>
              {tr("Hiểu tiền mình kiếm được.")}
              <br /> {tr("Chủ động với những khoản chi.")}
              <br /> {tr("Vun đắp điều mình muốn giữ lại.")}
            </p>
            <span>
              {tr("Một công cụ từ nhu cầu thật, cho cuộc sống hàng ngày.")}
            </span>
          </div>
        </div>
        <div className="hero-bottom">
          <div className="landing-actions">
            <StartLink />
            <a className="landing-secondary" href="#trai-nghiem">
              {tr("Khám phá giao diện")}{" "}
              <ArrowDown size={17} aria-hidden="true" />
            </a>
          </div>
          <p>{tr("Ít rối hơn. Có chủ đích hơn.")}</p>
        </div>
      </section>

      <section
        className="landing-container preview-section"
        id="trai-nghiem"
        aria-label={tr("Khám phá giao diện")}
      >
        <ProductPreview />
        <div className="preview-caption">
          <span>{tr("01 / MỘT GÓC KHÔNG GIAN CỦA BẠN")}</span>
          <p>
            {tr(
              "Chuyển giữa các mục để khám phá số liệu chính, phần hướng dẫn và bảng có nhãn rõ ràng. Dữ liệu minh họa, không cần đăng nhập; khi nhập liệu thật, ứng dụng chỉ báo lưu thành công sau khi nhận xác nhận.",
            )}
          </p>
        </div>
      </section>

      <section
        className="landing-container landing-section"
        aria-labelledby="features-title"
      >
        <div className="section-intro">
          <p className="landing-kicker">
            {tr("BẮT ĐẦU TỪ NHỮNG ĐIỀU THIẾT THỰC")}
          </p>
          <h2 id="features-title">
            {tr("Từng mảnh ghép.")}
            <br />
            {tr("Một bức tranh rõ hơn.")}
          </h2>
          <p>
            {tr("Không cần thay đổi mọi thứ trong một ngày.")}
            <br />
            {tr("Bắt đầu từ điều bạn muốn hiểu rõ hơn hôm nay.")}
          </p>
        </div>
        <div className="landing-features">
          {features.map((item, index) => (
            <article className="landing-feature" key={item.slug}>
              <div className="feature-top">
                <span className="feature-number">0{index + 1}</span>
                <ModuleIcon name={item.icon} size={25} />
              </div>
              <p className="feature-label">{tr(item.title)}</p>
              <h3>{tr(benefits[item.slug].heading)}</h3>
              <p>{tr(item.description)}</p>
              <span className="feature-detail">
                {tr(benefits[item.slug].detail)}
              </span>
            </article>
          ))}
        </div>
        <div className="landing-principles">
          <p>
            <EyeOff size={19} aria-hidden="true" />
            <span>{tr("Che số tiền khi cần riêng tư")}</span>
          </p>
          <p>
            <Fingerprint size={19} aria-hidden="true" />
            <span>{tr("Không gian riêng sau đăng nhập")}</span>
          </p>
          <p>
            <ThemeIcon size={19} kind="sprout" />
            <span>{tr("Năm chủ đề, sáng/tối theo bạn")}</span>
          </p>
        </div>
      </section>

      <section
        className="landing-story"
        id="cau-chuyen"
        aria-labelledby="story-title"
      >
        <div className="landing-container story-grid">
          <div className="story-art">
            <span className="landing-kicker">{tr("ĐIỂM KHỞI ĐẦU")}</span>
            <Garden variant="garden" />
            <span className="story-art-note">
              <ThemeText name="storyNote" />
            </span>
          </div>
          <div className="story-copy">
            <p className="landing-kicker">{tr("TỪ MỘT NHU CẦU RẤT THẬT")}</p>
            <h2 id="story-title">
              {tr("Một công cụ để")}
              <br />
              {tr("chính mình muốn dùng.")}
            </h2>
            <p>
              {tr(
                "Financial Manager bắt đầu từ nhu cầu quản lý tài chính cá nhân: biết tháng này nhận được bao nhiêu, những hũ chi tiêu còn lại thế nào và phần tích lũy đang đi đến đâu.",
              )}
            </p>
            <p>
              {tr(
                "Từ nhu cầu đó, từng phần được xây dựng để việc nhìn lại tiền bạc trở nên rõ ràng, liền mạch và gần với cách sử dụng mỗi ngày.",
              )}
            </p>
            <div className="story-note">
              {tr("Không cần một bức tranh hoàn hảo.")}
              <br />
              {tr("Chỉ cần hiểu rõ hơn từng chút một.")}
            </div>
          </div>
        </div>
      </section>

      <section
        className="landing-container landing-section development-section"
        id="dang-phat-trien"
        aria-labelledby="development-title"
      >
        <div className="section-intro">
          <p className="landing-kicker">
            {tr("MỘT SẢN PHẨM ĐANG ĐƯỢC VUN ĐẮP")}
          </p>
          <h2 id="development-title">
            {tr("Có gì hôm nay,")}
            <br />
            {tr("và điều gì ở phía trước.")}
          </h2>
          <p>
            {tr(
              "Ứng dụng vẫn đang phát triển. Cùng nhìn lại những gì đã có trong phiên bản hiện tại và những phần đang tiếp tục được xây dựng.",
            )}
          </p>
        </div>
        <div className="development-grid">
          <div className="development-current">
            <h3>{tr("Có trong bản hiện tại")}</h3>
            {modules
              .filter((item) => item.status !== "planned")
              .map((item) => (
                <div className="development-row" key={item.slug}>
                  <Check size={17} aria-hidden="true" />
                  <span>{tr(item.title)}</span>
                  <small>{tr(moduleStatusLabels[item.status])}</small>
                </div>
              ))}
            <p>
              {tr(
                "Tổng quan hiện tập trung vào các hũ chi tiêu. Báo cáo nằm trong từng mục; chưa có tổng tài sản ròng toàn hệ thống.",
              )}
            </p>
          </div>
          <div className="development-next">
            <h3>{tr("Những mảnh ghép tiếp theo")}</h3>
            <div className="planned-tags">
              {modules
                .filter((item) => item.status === "planned")
                .map((item) => (
                  <span key={item.slug}>{tr(item.title)}</span>
                ))}
            </div>
            <p>
              {tr(
                "Đây là định hướng phát triển, chưa phải tính năng sẵn sàng sử dụng. Kết nối ngân hàng và nhập liệu ngoại tuyến hiện chưa có.",
              )}
            </p>
          </div>
        </div>
        <div className="landing-faq">
          <h3>{tr("Một vài điều bạn có thể muốn biết")}</h3>
          <details>
            <summary>
              {tr("Tôi chưa quen các khái niệm tài chính, bắt đầu thế nào?")}
            </summary>
            <p>
              {tr(pageHelpSummary)}{" "}
              {tr(
                "Mở nút Hướng dẫn cạnh tiêu đề trang hoặc phần giải thích cạnh thuật ngữ. Đóng hướng dẫn để tiếp tục với nội dung đang nhập.",
              )}
            </p>
          </details>
          <details>
            <summary>{tr("Tôi có cần đăng nhập để dùng ứng dụng?")}</summary>
            <p>
              {tr(
                "Có. Bạn có thể khám phá trang giới thiệu và dữ liệu minh họa trước. Để mở không gian tài chính, hãy nhập mã 8 chữ số gửi qua email. Mã dùng một lần, có hiệu lực 30 phút.",
              )}
            </p>
          </details>
          <details>
            <summary>{tr("Dữ liệu trong phần trải nghiệm là của ai?")}</summary>
            <p>
              {tr(
                "Đó là dữ liệu minh họa cố định, không lấy dữ liệu tài chính của bạn và không lưu thao tác vào tài khoản.",
              )}
            </p>
          </details>
          <details>
            <summary>{tr("Có thể dùng tiếng Anh không?")}</summary>
            <p>{tr(languageSummary)}</p>
          </details>
          <details>
            <summary>{tr("Có thể dùng trên điện thoại không?")}</summary>
            <p>
              {tr(
                "Bạn có thể dùng trên điện thoại và máy tính, chọn tháng/năm theo cùng một cách ở các mục. Bạn cũng có thể thêm ứng dụng vào màn hình chính nếu trình duyệt hỗ trợ. Hiện chưa hỗ trợ nhập dữ liệu khi mất mạng.",
              )}
            </p>
            <p>{tr(navigationSummary)}</p>
          </details>
          <details>
            <summary>
              {tr("Nếu mất tài khoản, tôi có thể lấy lại dữ liệu không?")}
            </summary>
            <p>
              {tr(
                "Trong Cài đặt, bạn có thể chủ động tải bản sao lưu toàn bộ dữ liệu và nhập lại vào tài khoản mới chưa có dữ liệu. File không mật khẩu; hãy tự giữ một bản ở nơi an toàn. Trang Cài đặt có liên kết lưu file trực tiếp nếu trình duyệt chưa bắt đầu tải. Hồ sơ cá nhân được khôi phục nếu bạn chọn.",
              )}
            </p>
          </details>
          <details>
            <summary>{tr("Ứng dụng đã hoàn thiện chưa?")}</summary>
            <p>
              {tr(
                "Chưa. Thu nhập, Chi tiêu, Tiết kiệm, Đầu tư và Quỹ an toàn đã có trong phiên bản hiện tại; các phần còn lại tiếp tục được xây dựng. Trang giới thiệu sẽ được rà soát và cập nhật cùng những thay đổi của sản phẩm.",
              )}
            </p>
          </details>
        </div>
      </section>

      <section
        className="landing-container landing-final"
        aria-labelledby="final-title"
      >
        <div>
          <p className="landing-kicker">{tr("BẮT ĐẦU TỪ HÔM NAY")}</p>
          <h2 id="final-title">
            {tr("Một chút rõ ràng.")}
            <br />
            {tr("Thêm nhiều chủ động.")}
          </h2>
          <p>{tr("Mở không gian của bạn và bắt đầu từ điều nhỏ nhất.")}</p>
        </div>
        <StartLink final />
        <ArrowUpRight
          className="final-decoration"
          size={160}
          strokeWidth={0.7}
          aria-hidden="true"
        />
      </section>
    </>
  );
}
