"use client";
import { AnimatedDetails } from "@/components/animated-details";
import { StatusBadge } from "@/components/status-badge";
import { formatMoney } from "@/i18n/format";
import { useI18n } from "@/i18n/provider";

import { ScrollTabs } from "@/components/scroll-tabs";
import { AppLogo } from "@/components/app-logo";
import { AssetScene } from "@/components/asset-scene";
import { Garden } from "@/components/garden";
import { SafetyScene } from "@/components/safety-scene";
import { ThemeIcon, ThemeText } from "@/components/theme-decoration";

import { ModuleIcon } from "@/components/module-icon";
import { modules, navigationSummary } from "@/features/catalog";
import { LabelName } from "@/features/expenses/label-visual";
import { ProgressScene } from "@/features/funds/progress-scene";
import { ArrowDownLeft, ArrowUpRight, Eye, EyeOff } from "lucide-react";
import { useId, useRef, useState, type KeyboardEvent } from "react";

const tabs = modules.filter((item) =>
  ["overview", "income", "budgets", "savings", "investments", "funds"].includes(
    item.slug,
  ),
);
const helpPreview = {
  overview:
    "Thêm, ẩn và sắp xếp 10 widget theo tài khoản. Các module là sổ độc lập; Tổng quan không cộng chúng thành tài sản ròng.",
  budgets:
    "Chia trước, chi sau. Hũ là phần tiền dành cho một mục đích; ngân hàng, ví hay tiền mặt là nơi bạn quy ước để chi. Đối chiếu số còn lại để biết tháng này thừa thiếu ra sao.",
  income:
    "Danh mục cố định là nguồn thu lặp lại, không có nghĩa số tiền cố định. Thu phát sinh là khoản riêng lẻ. Chưa nhập khác với đã ghi nhận 0 đồng. Xóa danh mục khi không còn số thu ở bất kỳ tháng nào; nếu còn số thu, dùng Ngừng.",
  savings:
    "Tách tài sản mở đầu, tiền góp mới và lãi/lỗ. Chuyển giữa các khoản tiết kiệm chỉ đổi nơi giữ, không làm tăng tổng tài sản.",
  investments:
    "Tách vốn, tiền chờ và kết quả đầu tư. Định giá có ngày giúp đọc đúng giá trị tài sản; cập nhật định giá không thay đổi tiền trong ví.",
  funds:
    "Ba quỹ có mục đích riêng. Mục tiêu lấy từ mức sinh hoạt và hệ số bạn chọn; đổi mục tiêu không tự thêm tiền vào quỹ.",
};
// Fixed illustrative data, including in server-rendered public SEO content.
// Never substitute account data or fetch financial APIs for this preview.
const data = {
  overview: {
    title: "Một góc nhìn chung, từng khoản rõ ràng.",
    subtitle: "6 widget mặc định · thêm, ẩn và sắp xếp theo tài khoản.",
    label: "Tổng thực nhận",
    value: "28500000",
    secondary: "Widget mặc định",
    secondaryValue: "6",
    columns: ["Module", "Giá trị minh họa"],
    rows: [],
    chartLabel: "",
    bars: [],
  },
  funds: {
    title: "Từng bước vun đắp sự an tâm.",
    subtitle: "Chuẩn bị từng quỹ dự phòng theo nhu cầu sinh hoạt của bạn.",
    label: "Tổng dự phòng",
    value: "42750000",
    secondary: "Emergency đủ trang trải",
    secondaryValue: "3 tháng",
    columns: ["Quỹ an toàn", "Đã dự phòng"],
    rows: [
      {
        name: "Emergency Fund",
        note: "27 / 54 triệu · Hoàn thành 50%",
        emoji: "🌳",
        amount: "27000000",
        percent: 50,
      },
      {
        name: "Rainy Day Fund",
        note: "6,75 / 9 triệu · Hoàn thành 75%",
        emoji: "☂️",
        amount: "6750000",
        percent: 75,
      },
      {
        name: "Sinking Fund",
        note: "9 / 18 triệu · Hoàn thành 50%",
        emoji: "🌉",
        amount: "9000000",
        percent: 50,
      },
    ],
    chartLabel: "EMERGENCY · CÂY ĐANG LỚN",
    bars: [0, 0, 0, 0, 0, 0],
  },
  income: {
    title: "Những điều bạn đã làm được.",
    subtitle:
      "Thu cố định và phát sinh phân biệt rõ; khoản chưa nhập có nhắc bổ sung.",
    label: "Tổng thực nhận",
    value: "28500000",
    secondary: "Nguồn thu trong tháng",
    secondaryValue: "2 nguồn",
    columns: ["Nguồn thu", "Thực nhận"],
    rows: [
      {
        name: "Lương",
        note: "Cố định · Đã ghi nhận",
        emoji: "🌿",
        amount: "25000000",
        percent: 88,
      },
      {
        name: "Dự án cá nhân",
        note: "Phát sinh · Khoản thu một lần",
        emoji: "☀️",
        amount: "3500000",
        percent: 12,
      },
    ],
    chartLabel: "THỰC NHẬN THEO THÁNG",
    bars: [45, 58, 50, 72, 64, 86],
  },
  budgets: {
    title: "Chăm chút cho tháng của bạn.",
    subtitle:
      "Hũ chi tháng và tích lũy, có emoji riêng, phân loại ngân hàng/ví và bộ lọc hũ đã ngừng.",
    label: "Kế hoạch tháng",
    value: "12000000",
    secondary: "Số còn trong hũ",
    secondaryValue: "4650000",
    columns: ["Hũ chi tiêu", "Còn trong hũ"],
    rows: [
      {
        name: "Sinh hoạt",
        note: "Chi hàng tháng · Đã dùng 65%",
        emoji: "🏡",
        amount: "2450000",
        percent: 65,
      },
      {
        name: "Chăm sóc bản thân",
        note: "Chi hàng tháng · Đã dùng 56%",
        emoji: "🌷",
        amount: "2200000",
        percent: 56,
      },
    ],
    chartLabel: "THỰC CHI THEO THÁNG",
    bars: [60, 48, 72, 55, 68, 52],
  },
  investments: {
    title: "Nhìn rõ những khoản đang đầu tư.",
    subtitle: "Theo dõi tài sản và tiền chờ, kèm ngày cập nhật giá trị.",
    label: "Tài sản trong Đầu tư",
    value: "72000000",
    secondary: "Danh mục và ví",
    secondaryValue: "1 danh mục · 1 ví",
    columns: ["Danh mục / ví", "Giá trị"],
    rows: [
      {
        name: "Cổ phiếu",
        note: "Định giá 30/06/2026",
        emoji: "📈",
        amount: "65000000",
        percent: 90,
      },
      {
        name: "Tiền chờ TCBS",
        note: "Tiền chờ · Không tính ROI",
        emoji: "💼",
        amount: "7000000",
        percent: 10,
      },
    ],
    chartLabel: "TÀI SẢN ĐẦU TƯ CUỐI THÁNG",
    bars: [45, 55, 52, 68, 80, 85],
  },
  savings: {
    title: "Những điều đang lớn lên.",
    subtitle:
      "Đọc rõ từng danh mục, đối chiếu giao dịch theo tháng và kỳ báo cáo.",
    label: "Tài sản trong Tiết kiệm",
    value: "85000000",
    secondary: "Danh mục đang theo dõi",
    secondaryValue: "2 danh mục",
    columns: ["Danh mục", "Giá trị"],
    rows: [
      {
        name: "Tiền tích lũy",
        note: "Tiền · Tích lũy đều đặn",
        emoji: "🌱",
        amount: "25000000",
        percent: 29,
      },
      {
        name: "Sổ tiết kiệm",
        note: "Tiền gửi · Theo dõi từng sổ",
        emoji: "🪴",
        amount: "60000000",
        percent: 71,
      },
    ],
    chartLabel: "TÀI SẢN TIẾT KIỆM CUỐI THÁNG",
    bars: [30, 42, 50, 62, 75, 90],
  },
} as const;
type PreviewKey = keyof typeof data;

export function ProductPreview({
  appearance = "themed",
}: {
  appearance?: "themed" | "marketing";
}) {
  const { t: tr, locale } = useI18n("landing");
  const neutral = appearance === "marketing";
  const [active, setActive] = useState<PreviewKey>("overview");
  const [hidden, setHidden] = useState(false);
  const id = useId();
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const workspace = useRef<HTMLDivElement>(null);
  const selected = data[active];
  const money = (value: string) =>
    hidden ? "•••••• ₫" : formatMoney(value, locale);
  const selectTab = (key: PreviewKey) => {
    setActive(key);
    workspace.current?.scrollTo({ top: 0, behavior: "instant" });
  };
  const changeTab = (
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
    else if (event.key === "ArrowLeft")
      next = (index + tabs.length - 1) % tabs.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = tabs.length - 1;
    else return;
    event.preventDefault();
    selectTab(tabs[next].slug as PreviewKey);
    buttons.current[next]?.focus({ preventScroll: true });
  };
  return (
    <div className="product-preview" data-ui>
      <div className="preview-toolbar">
        <span className="preview-mobile-brand" aria-hidden="true">
          <AppLogo size={22} />
        </span>
        <div className="preview-window-dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
        <span>{tr("financial manager / không gian cá nhân")}</span>
        <StatusBadge tone="info" size="compact" className="preview-demo-label">
          {tr("Dữ liệu minh họa")}
        </StatusBadge>
      </div>
      <div className="preview-body">
        <aside className="preview-sidebar" aria-label={tr("Các mục minh họa")}>
          <span className="preview-logo">
            <AppLogo size={24} /> Financial Manager
          </span>
          <p>{tr("KHÔNG GIAN CÁ NHÂN")}</p>
          <ScrollTabs
            className="preview-tabs"
            role="tablist"
            aria-label={tr("Khám phá các tính năng")}
          >
            {tabs.map((item, index) => (
              <button
                key={item.slug}
                role="tab"
                id={`${id}-tab-${item.slug}`}
                aria-selected={active === item.slug}
                aria-controls={`${id}-panel-${item.slug}`}
                tabIndex={active === item.slug ? 0 : -1}
                ref={(node) => {
                  buttons.current[index] = node;
                }}
                onKeyDown={(event) => changeTab(event, index)}
                onClick={() => selectTab(item.slug as PreviewKey)}
              >
                <ModuleIcon name={item.icon} size={19} />
                {tr(item.title)}
              </button>
            ))}
          </ScrollTabs>
          <div className="preview-sidebar-note">
            <span className="status-dot" />
            {neutral ? (
              tr("Từng khoản tiền, rõ mục đích.")
            ) : (
              <ThemeText name="storyNote" />
            )}
            <small>{tr("Tải bản sao dữ liệu của bạn trong Cài đặt.")}</small>
            <small>{tr(navigationSummary)}</small>
            <small>
              {tr("Trang chủ và ứng dụng hỗ trợ Tiếng Việt / English.")}
            </small>
          </div>
        </aside>
        <div
          className="preview-workspace"
          ref={workspace}
          role="region"
          aria-label={tr("Nội dung xem thử ứng dụng")}
          tabIndex={0}
        >
          <div className="preview-workspace-top">
            <dl
              className="preview-period"
              aria-label={tr("Kỳ minh họa cố định")}
            >
              <div>
                <dt>{tr("Năm")}</dt>
                <dd>2026</dd>
              </div>
              <div>
                <dt>{tr("Tháng")}</dt>
                <dd>{tr("Tháng")} 6</dd>
              </div>
            </dl>
            <button
              className="preview-privacy"
              aria-label={tr(
                hidden ? "Hiện số tiền minh họa" : "Ẩn số tiền minh họa",
              )}
              aria-pressed={hidden}
              onClick={() => setHidden(!hidden)}
            >
              {hidden ? (
                <EyeOff size={18} aria-hidden="true" />
              ) : (
                <Eye size={18} aria-hidden="true" />
              )}
              <span>{tr("Riêng tư")}</span>
            </button>
          </div>
          <AnimatedDetails className="preview-help" key={active}>
            <summary>
              {tr("Hướng dẫn ·")}{" "}
              {tr(modules.find((item) => item.slug === active)!.title)}
            </summary>
            <p>{tr(helpPreview[active])}</p>
            <small>
              {tr(
                "Trong ứng dụng, nút Hướng dẫn giúp bạn tìm hiểu từng mục khi cần.",
              )}
            </small>
          </AnimatedDetails>
          {tabs.map((item) => (
            <div
              key={item.slug}
              id={`${id}-panel-${item.slug}`}
              role="tabpanel"
              aria-labelledby={`${id}-tab-${item.slug}`}
              hidden={active !== item.slug}
              tabIndex={0}
            >
              {active === item.slug && (
                <>
                  <div className="preview-heading">
                    <div>
                      <p>{tr(item.title)}</p>
                      <h2>
                        {neutral ? (
                          tr(selected.title)
                        ) : active === "funds" ? (
                          <ThemeText name="previewFunds" />
                        ) : active === "savings" ? (
                          <ThemeText name="previewSavings" />
                        ) : (
                          tr(selected.title)
                        )}
                      </h2>
                      <span>{tr(selected.subtitle)}</span>
                    </div>
                    {!neutral &&
                      (active === "savings" || active === "investments") && (
                        <AssetScene kind={active} />
                      )}
                    {!neutral && active === "budgets" && (
                      <Garden variant="jar" />
                    )}
                    {!neutral && active === "income" && (
                      <Garden variant="harvest" />
                    )}
                    {!neutral && active === "funds" && <SafetyScene />}
                  </div>
                  {active === "overview" ? (
                    <div className="preview-overview-grid">
                      <section>
                        <h3>{tr("Cần chú ý")}</h3>
                        <p>{tr("Kiểm tra số dư hũ tháng này.")}</p>
                        <small>{tr("Tạm tính · Dữ liệu mẫu")}</small>
                      </section>
                      <section>
                        <h3>{tr("Thu nhập tháng này")}</h3>
                        <strong>{money(data.income.value)}</strong>
                        <small>{tr("Tổng thực nhận")}</small>
                      </section>
                      <section>
                        <h3>{tr("Chi tiêu tháng này")}</h3>
                        <strong>{money(data.budgets.value)}</strong>
                        <small>{tr("Mức tháng")}</small>
                        <span>
                          {tr("Còn trong hũ")} ·{" "}
                          {money(data.budgets.secondaryValue)}
                        </span>
                      </section>
                      <section>
                        <h3>{tr("Tiết kiệm hiện tại")}</h3>
                        <strong>{money(data.savings.value)}</strong>
                        <small>{tr("Theo định giá đã nhập")}</small>
                      </section>
                      <section>
                        <h3>{tr("Đầu tư hiện tại")}</h3>
                        <strong>{money(data.investments.value)}</strong>
                        <small>{tr("Gồm khoản đầu tư và tiền chờ")}</small>
                      </section>
                      <section>
                        <h3>{tr("Quỹ an toàn")}</h3>
                        <strong>{money(data.funds.value)}</strong>
                        <small>{tr("Sổ quỹ độc lập")}</small>
                      </section>
                      <p>
                        {tr(
                          "Minh họa · Các giá trị không cộng thành tài sản ròng.",
                        )}
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="preview-metrics">
                        <div>
                          <span>{tr(selected.label)}</span>
                          <strong>{money(selected.value)}</strong>
                          <small>
                            <ArrowDownLeft size={14} aria-hidden="true" />
                            {tr("Tháng 06 · Dữ liệu mẫu")}
                          </small>
                        </div>
                        <div>
                          <span>{tr(selected.secondary)}</span>
                          <strong>
                            {active === "budgets"
                              ? money(selected.secondaryValue)
                              : tr(selected.secondaryValue)}
                          </strong>
                          <small>
                            <ArrowUpRight size={14} aria-hidden="true" />
                            {tr("Theo nhịp của bạn")}
                          </small>
                        </div>
                      </div>
                      <div className="preview-detail-grid">
                        <div className="preview-rows">
                          <div className="preview-table-heading">
                            <span>{tr(selected.columns[0])}</span>
                            <span>{tr(selected.columns[1])}</span>
                          </div>
                          {selected.rows.map((row) => (
                            <div className="preview-row" key={tr(row.name)}>
                              <span
                                className="preview-row-emoji"
                                aria-hidden="true"
                              >
                                {neutral ? (
                                  <ModuleIcon name={item.icon} size={21} />
                                ) : active === "funds" ? (
                                  <ThemeIcon size={21} />
                                ) : (
                                  row.emoji
                                )}
                              </span>
                              <div className="preview-row-info">
                                <strong>{tr(row.name)}</strong>
                                <small>
                                  {active === "funds"
                                    ? tr("Hoàn thành {0}%", { 0: row.percent })
                                    : tr(row.note)}
                                </small>
                                {active === "budgets" && (
                                  <span className="preview-payment">
                                    <LabelName
                                      name={
                                        row.name === "Sinh hoạt"
                                          ? "Timo"
                                          : "HSBC"
                                      }
                                    />
                                  </span>
                                )}
                                <span
                                  className="preview-progress"
                                  hidden={active === "funds"}
                                >
                                  <i style={{ width: `${row.percent}%` }} />
                                </span>
                              </div>
                              <span className="preview-row-money">
                                {money(row.amount)}
                              </span>
                            </div>
                          ))}
                        </div>
                        <div
                          className={`preview-chart ${active === "funds" ? "preview-chart-funds" : ""}`}
                        >
                          <span>
                            {neutral && active === "funds"
                              ? tr("EMERGENCY · TIẾN ĐỘ DỰ PHÒNG")
                              : tr(selected.chartLabel)}
                          </span>
                          {active === "funds" ? (
                            <>
                              {neutral ? (
                                <div
                                  className="marketing-fund-progress"
                                  role="img"
                                  aria-label={tr(
                                    "Emergency Fund đã chuẩn bị 50% mục tiêu",
                                  )}
                                >
                                  <span>
                                    50<small>%</small>
                                  </span>
                                </div>
                              ) : (
                                <ProgressScene fund="emergency" percent="50" />
                              )}
                              <p>
                                {tr("Đã chuẩn bị 50% · Mức sinh hoạt")}{" "}
                                {money("9000000")}
                                {tr("/tháng")}
                              </p>
                            </>
                          ) : (
                            <div
                              className="preview-bars"
                              role="img"
                              aria-label={tr(
                                active === "budgets"
                                  ? "Minh họa mức thực chi khác nhau qua sáu tháng"
                                  : "Minh họa xu hướng qua sáu tháng",
                              )}
                            >
                              {selected.bars.map((height, index) => (
                                <div key={index}>
                                  <i style={{ height: `${height}%` }} />
                                  <small>{tr("T{0}", { 0: index + 1 })}</small>
                                </div>
                              ))}
                            </div>
                          )}
                          <small>{tr("Số liệu minh họa cố định")}</small>
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
