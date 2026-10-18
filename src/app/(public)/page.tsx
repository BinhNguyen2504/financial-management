import type { Metadata } from "next";
import {
  ArrowDown,
  ArrowUpRight,
  Check,
  EyeOff,
  Fingerprint,
  Sprout,
} from "lucide-react";
import { modules, moduleStatusLabels } from "@/features/catalog";
import { ModuleIcon } from "@/components/module-icon";
import { Garden } from "@/components/garden";
import { StartLink } from "@/features/landing/account-actions";
import { ProductPreview } from "@/features/landing/product-preview";

const title = "Financial Manager — Một nơi rõ ràng hơn cho tài chính của bạn";
const description =
  "Từ nhu cầu thật đến một không gian quản lý thu nhập, hũ chi tiêu, tiết kiệm và đầu tư. Khám phá Financial Manager, theo nhịp của bạn.";
export const metadata: Metadata = {
  title: { absolute: title },
  description,
  openGraph: {
    title,
    description,
    locale: "vi_VN",
    type: "website",
    siteName: "Financial Manager",
  },
  twitter: { card: "summary_large_image", title, description },
};

const features = modules.filter((item) =>
  ["income", "budgets", "savings", "investments"].includes(item.slug),
);
const benefits: Record<string, { heading: string; detail: string }> = {
  income: {
    heading: "Biết rõ tiền đến từ đâu.",
    detail: "Thực nhận rõ ràng · Báo cáo theo kỳ",
  },
  budgets: {
    heading: "Mỗi hũ, một mục đích.",
    detail: "Hũ chi tháng · Hũ tích lũy",
  },
  investments: {
    heading: "Hiểu rõ vốn và giá trị hiện tại.",
    detail: "Danh mục · Tiền chờ · Lãi/lỗ",
  },
  savings: {
    heading: "Nhìn thấy hành trình tích lũy.",
    detail: "Tiền · Sổ tiền gửi · Vàng",
  },
};

export default function Home() {
  return (
    <>
      <section
        className="landing-hero landing-container"
        aria-labelledby="landing-title"
      >
        <div className="hero-topline">
          <span className="landing-kicker">
            <span className="status-dot" />
            TÀI CHÍNH CÁ NHÂN, THEO NHỊP CỦA BẠN
          </span>
          <span className="landing-stage">Đang phát triển</span>
        </div>
        <div className="hero-copy">
          <h1 id="landing-title">
            Một nơi rõ ràng hơn
            <br /> cho <span>tài chính của bạn.</span>
          </h1>
          <div className="hero-aside">
            <p>
              Hiểu tiền mình kiếm được.
              <br /> Chủ động với những khoản chi.
              <br /> Vun đắp điều mình muốn giữ lại.
            </p>
            <span>Một công cụ từ nhu cầu thật, cho cuộc sống hàng ngày.</span>
          </div>
        </div>
        <div className="hero-bottom">
          <div className="landing-actions">
            <StartLink />
            <a className="landing-secondary" href="#trai-nghiem">
              Khám phá giao diện <ArrowDown size={17} aria-hidden="true" />
            </a>
          </div>
          <p>Ít rối hơn. Có chủ đích hơn.</p>
        </div>
      </section>

      <section
        className="landing-container preview-section"
        id="trai-nghiem"
        aria-label="Khám phá giao diện"
      >
        <ProductPreview />
        <div className="preview-caption">
          <span>01 / MỘT GÓC KHÔNG GIAN CỦA BẠN</span>
          <p>
            Chuyển giữa các mục để khám phá. Dữ liệu minh họa, không cần đăng
            nhập.
          </p>
        </div>
      </section>

      <section
        className="landing-container landing-section"
        aria-labelledby="features-title"
      >
        <div className="section-intro">
          <p className="landing-kicker">BẮT ĐẦU TỪ NHỮNG ĐIỀU THIẾT THỰC</p>
          <h2 id="features-title">
            Ba mảnh ghép.
            <br />
            Một bức tranh rõ hơn.
          </h2>
          <p>
            Không cần thay đổi mọi thứ trong một ngày.
            <br />
            Bắt đầu từ điều bạn muốn hiểu rõ hơn hôm nay.
          </p>
        </div>
        <div className="landing-features">
          {features.map((item, index) => (
            <article className="landing-feature" key={item.slug}>
              <div className="feature-top">
                <span className="feature-number">0{index + 1}</span>
                <ModuleIcon name={item.icon} size={25} />
              </div>
              <p className="feature-label">{item.title}</p>
              <h3>{benefits[item.slug].heading}</h3>
              <p>{item.description}</p>
              <span className="feature-detail">
                {benefits[item.slug].detail}
              </span>
            </article>
          ))}
        </div>
        <div className="landing-principles">
          <p>
            <EyeOff size={19} aria-hidden="true" />
            <span>Che số tiền khi cần riêng tư</span>
          </p>
          <p>
            <Fingerprint size={19} aria-hidden="true" />
            <span>Không gian riêng sau đăng nhập</span>
          </p>
          <p>
            <Sprout size={19} aria-hidden="true" />
            <span>Dễ nhìn trên điện thoại & máy tính</span>
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
            <span className="landing-kicker">ĐIỂM KHỞI ĐẦU</span>
            <Garden variant="garden" />
            <span className="story-art-note">Từng bước vun đắp.</span>
          </div>
          <div className="story-copy">
            <p className="landing-kicker">TỪ MỘT NHU CẦU RẤT THẬT</p>
            <h2 id="story-title">
              Một công cụ để
              <br />
              chính mình muốn dùng.
            </h2>
            <p>
              Financial Manager bắt đầu từ nhu cầu quản lý tài chính cá nhân:
              biết tháng này nhận được bao nhiêu, những hũ chi tiêu còn lại thế
              nào và phần tích lũy đang đi đến đâu.
            </p>
            <p>
              Từ nhu cầu đó, từng phần được xây dựng để việc nhìn lại tiền bạc
              trở nên rõ ràng, liền mạch và gần với cách sử dụng mỗi ngày.
            </p>
            <div className="story-note">
              Không cần một bức tranh hoàn hảo.
              <br />
              Chỉ cần hiểu rõ hơn từng chút một.
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
          <p className="landing-kicker">MỘT SẢN PHẨM ĐANG ĐƯỢC VUN ĐẮP</p>
          <h2 id="development-title">
            Có gì hôm nay,
            <br />
            và điều gì ở phía trước.
          </h2>
          <p>
            Ứng dụng vẫn đang phát triển. Cùng nhìn lại những gì đã có trong
            phiên bản hiện tại và những phần đang tiếp tục được xây dựng.
          </p>
        </div>
        <div className="development-grid">
          <div className="development-current">
            <h3>Có trong bản hiện tại</h3>
            {modules
              .filter((item) => item.status !== "planned")
              .map((item) => (
                <div className="development-row" key={item.slug}>
                  <Check size={17} aria-hidden="true" />
                  <span>{item.title}</span>
                  <small>{moduleStatusLabels[item.status]}</small>
                </div>
              ))}
            <p>
              Tổng quan hiện tập trung vào các hũ chi tiêu. Báo cáo nằm trong
              từng module; chưa có tổng tài sản ròng toàn hệ thống.
            </p>
          </div>
          <div className="development-next">
            <h3>Những mảnh ghép tiếp theo</h3>
            <div className="planned-tags">
              {modules
                .filter((item) => item.status === "planned")
                .map((item) => (
                  <span key={item.slug}>{item.title}</span>
                ))}
            </div>
            <p>
              Đây là định hướng phát triển, chưa phải tính năng sẵn sàng sử
              dụng. Kết nối ngân hàng và nhập liệu ngoại tuyến hiện chưa có.
            </p>
          </div>
        </div>
        <div className="landing-faq">
          <h3>Một vài điều bạn có thể muốn biết</h3>
          <details>
            <summary>Tôi có cần đăng nhập để dùng ứng dụng?</summary>
            <p>
              Có. Bạn có thể khám phá trang giới thiệu và dữ liệu minh họa
              trước. Để mở không gian tài chính, hãy đăng nhập bằng email và mã
              xác nhận hoặc liên kết trong email.
            </p>
          </details>
          <details>
            <summary>Dữ liệu trong phần trải nghiệm là của ai?</summary>
            <p>
              Đó là dữ liệu minh họa cố định. Preview không đọc dữ liệu tài
              chính của bạn và không lưu thao tác vào tài khoản.
            </p>
          </details>
          <details>
            <summary>Có thể dùng trên điện thoại không?</summary>
            <p>
              Giao diện được thiết kế cho cả điện thoại và máy tính. Bản triển
              khai qua HTTPS có nền PWA để thêm vào màn hình chính; hiện chưa hỗ
              trợ ghi dữ liệu khi mất mạng.
            </p>
          </details>
          <details>
            <summary>Nếu mất tài khoản, tôi có thể lấy lại dữ liệu không?</summary>
            <p>Trong Cài đặt, bạn có thể chủ động tải bản sao lưu JSON toàn bộ dữ liệu và nhập lại vào tài khoản mới chưa có dữ liệu. File không mật khẩu; hãy tự giữ một bản ở nơi an toàn. Trang Cài đặt có liên kết lưu file trực tiếp nếu trình duyệt chưa bắt đầu tải. Hồ sơ cá nhân được khôi phục nếu bạn chọn.</p>
          </details>
          <details>
            <summary>Ứng dụng đã hoàn thiện chưa?</summary>
            <p>
              Chưa. Thu nhập, Chi tiêu, Tiết kiệm và Đầu tư đã có trong phiên
              bản hiện tại; các phần còn lại tiếp tục được xây dựng. Trang giới
              thiệu sẽ được rà soát và cập nhật cùng những thay đổi của sản
              phẩm.
            </p>
          </details>
        </div>
      </section>

      <section
        className="landing-container landing-final"
        aria-labelledby="final-title"
      >
        <div>
          <p className="landing-kicker">BẮT ĐẦU TỪ HÔM NAY</p>
          <h2 id="final-title">
            Một chút rõ ràng.
            <br />
            Thêm nhiều chủ động.
          </h2>
          <p>Mở không gian của bạn và bắt đầu từ điều nhỏ nhất.</p>
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
