"use client";
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
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronDown,
  Eye,
  EyeOff,
} from "lucide-react";
import { useId, useRef, useState, type KeyboardEvent } from "react";

const tabs = modules.filter((item) =>
  ["income", "budgets", "savings", "investments", "funds"].includes(item.slug),
);
const helpPreview = {
  budgets:
    "Chia trước, chi sau. Hũ là phần tiền dành cho một mục đích; ngân hàng, ví hay tiền mặt là nơi bạn quy ước để chi. Đối chiếu số còn lại để biết tháng này thừa thiếu ra sao.",
  income:
    "Danh mục cố định là nguồn thu lặp lại, không có nghĩa số tiền cố định. Thu phát sinh là khoản riêng lẻ. Chưa nhập khác với đã ghi nhận 0 đồng.",
  savings:
    "Tách tài sản mở đầu, tiền góp mới và lãi/lỗ. Chuyển giữa các khoản tiết kiệm chỉ đổi nơi giữ, không làm tăng tổng tài sản.",
  investments:
    "Tách vốn, tiền chờ và kết quả đầu tư. Định giá có ngày giúp đọc đúng giá trị tài sản; cập nhật định giá không thay đổi tiền trong ví.",
  funds:
    "Ba quỹ có mục đích riêng. Mục tiêu lấy từ mức sinh hoạt và hệ số bạn chọn; đổi mục tiêu không tự thêm tiền vào quỹ.",
};
const data = {
  funds: {
    title: "Từng bước vun đắp sự an tâm.",
    subtitle: "Ba quỹ độc lập, cùng một nền tảng sinh hoạt đã xác nhận.",
    label: "Tổng dự phòng",
    value: "42.750.000",
    secondary: "Emergency đủ trang trải",
    secondaryValue: "3 tháng",
    columns: ["Quỹ an toàn", "Đã dự phòng"],
    rows: [
      {
        name: "Emergency Fund",
        note: "27 / 54 triệu · Hoàn thành 50%",
        emoji: "🌳",
        amount: "27.000.000",
        percent: 50,
      },
      {
        name: "Rainy Day Fund",
        note: "6,75 / 9 triệu · Hoàn thành 75%",
        emoji: "☂️",
        amount: "6.750.000",
        percent: 75,
      },
      {
        name: "Sinking Fund",
        note: "9 / 18 triệu · Hoàn thành 50%",
        emoji: "🌉",
        amount: "9.000.000",
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
    value: "28.500.000",
    secondary: "Nguồn thu trong tháng",
    secondaryValue: "2 nguồn",
    columns: ["Nguồn thu", "Thực nhận"],
    rows: [
      {
        name: "Lương",
        note: "Cố định · Đã ghi nhận",
        emoji: "🌿",
        amount: "25.000.000",
        percent: 88,
      },
      {
        name: "Dự án cá nhân",
        note: "Phát sinh · Khoản thu một lần",
        emoji: "☀️",
        amount: "3.500.000",
        percent: 12,
      },
    ],
    chartLabel: "THỰC NHẬN THEO THÁNG",
    bars: [45, 58, 50, 72, 64, 86],
  },
  budgets: {
    title: "Chăm chút cho tháng của bạn.",
    subtitle: "Hũ chi tháng và tích lũy gọn gàng, dễ theo dõi số còn lại.",
    label: "Kế hoạch tháng",
    value: "12.000.000",
    secondary: "Số còn trong hũ",
    secondaryValue: "4.650.000",
    columns: ["Hũ chi tiêu", "Còn trong hũ"],
    rows: [
      {
        name: "Sinh hoạt",
        note: "Chi hàng tháng · Đã dùng 65%",
        emoji: "🏡",
        amount: "2.450.000",
        percent: 65,
      },
      {
        name: "Chăm sóc bản thân",
        note: "Chi hàng tháng · Đã dùng 56%",
        emoji: "🌷",
        amount: "2.200.000",
        percent: 56,
      },
    ],
    chartLabel: "THỰC CHI THEO THÁNG",
    bars: [60, 48, 72, 55, 68, 52],
  },
  investments: {
    title: "Nhìn rõ những khoản đang đầu tư.",
    subtitle: "Giá trị chính ở đầu, từng danh mục và ngày định giá rõ ràng.",
    label: "Tài sản trong Đầu tư",
    value: "72.000.000",
    secondary: "Danh mục và ví",
    secondaryValue: "1 danh mục · 1 ví",
    columns: ["Danh mục / ví", "Giá trị"],
    rows: [
      {
        name: "Cổ phiếu",
        note: "Định giá 30/06/2026",
        emoji: "📈",
        amount: "65.000.000",
        percent: 90,
      },
      {
        name: "Tiền chờ TCBS",
        note: "Tiền chờ · Không tính ROI",
        emoji: "💼",
        amount: "7.000.000",
        percent: 10,
      },
    ],
    chartLabel: "TÀI SẢN ĐẦU TƯ CUỐI THÁNG",
    bars: [45, 55, 52, 68, 80, 85],
  },
  savings: {
    title: "Những điều đang lớn lên.",
    subtitle: "Nhìn lại tích lũy, giá trị và tỷ trọng từng danh mục.",
    label: "Tài sản trong Tiết kiệm",
    value: "85.000.000",
    secondary: "Danh mục đang theo dõi",
    secondaryValue: "2 danh mục",
    columns: ["Danh mục", "Giá trị"],
    rows: [
      {
        name: "Tiền tích lũy",
        note: "Tiền · Tích lũy đều đặn",
        emoji: "🌱",
        amount: "25.000.000",
        percent: 29,
      },
      {
        name: "Sổ tiết kiệm",
        note: "Tiền gửi · Theo dõi từng sổ",
        emoji: "🪴",
        amount: "60.000.000",
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
  const neutral = appearance === "marketing";
  const [active, setActive] = useState<PreviewKey>("budgets");
  const [hidden, setHidden] = useState(false);
  const id = useId();
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const selected = data[active];
  const money = (value: string) => (hidden ? "•••••• ₫" : `${value} ₫`);
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
    setActive(tabs[next].slug as PreviewKey);
    buttons.current[next]?.focus({ preventScroll: true });
  };
  return (
    <div className="product-preview">
      <div className="preview-toolbar">
        <div className="preview-window-dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
        <span>financial manager / không gian cá nhân</span>
        <span className="preview-demo-label">Dữ liệu minh họa</span>
      </div>
      <div className="preview-body">
        <aside className="preview-sidebar" aria-label="Các mục trong preview">
          <span className="preview-logo">
            <AppLogo size={24} /> Financial Manager
          </span>
          <p>KHÔNG GIAN CÁ NHÂN</p>
          <ScrollTabs
            className="preview-tabs"
            role="tablist"
            aria-label="Khám phá các tính năng"
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
                onClick={() => setActive(item.slug as PreviewKey)}
              >
                <ModuleIcon name={item.icon} size={19} />
                {item.title}
              </button>
            ))}
          </ScrollTabs>
          <div className="preview-sidebar-note">
            <span className="status-dot" />
            {neutral ? (
              "Từng khoản tiền, rõ mục đích."
            ) : (
              <ThemeText name="storyNote" />
            )}
            <small>Tải bản sao dữ liệu của bạn trong Cài đặt.</small>
            <small>{navigationSummary}</small>
            <small>
              Trong app: Tiếng Việt / English. Bản xem thử dùng tiếng Việt.
            </small>
          </div>
        </aside>
        <div className="preview-workspace">
          <div className="preview-workspace-top">
            <span>
              THÁNG 06 / 2026 <ChevronDown size={13} aria-hidden="true" />
            </span>
            <button
              className="preview-privacy"
              aria-label={
                hidden ? "Hiện số tiền minh họa" : "Ẩn số tiền minh họa"
              }
              aria-pressed={hidden}
              onClick={() => setHidden(!hidden)}
            >
              {hidden ? (
                <EyeOff size={18} aria-hidden="true" />
              ) : (
                <Eye size={18} aria-hidden="true" />
              )}
              <span>Riêng tư</span>
            </button>
          </div>
          <details className="preview-help" key={active}>
            <summary>
              Hướng dẫn · {modules.find((item) => item.slug === active)?.title}
            </summary>
            <p>{helpPreview[active]}</p>
            <small>
              Minh họa rút gọn. Trong ứng dụng, mỗi trang có mục lục đánh số,
              các ý chính được nhấn rõ và hướng dẫn từng thao tác; các biểu mẫu
              báo lỗi ngay tại trường cần sửa.
            </small>
          </details>
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
                      <p>{item.title}</p>
                      <h2>
                        {neutral ? (
                          selected.title
                        ) : active === "funds" ? (
                          <ThemeText name="previewFunds" />
                        ) : active === "savings" ? (
                          <ThemeText name="previewSavings" />
                        ) : (
                          selected.title
                        )}
                      </h2>
                      <span>{selected.subtitle}</span>
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
                  <div className="preview-metrics">
                    <div>
                      <span>{selected.label}</span>
                      <strong>{money(selected.value)}</strong>
                      <small>
                        <ArrowDownLeft size={14} aria-hidden="true" />
                        Tháng 06 · Dữ liệu mẫu
                      </small>
                    </div>
                    <div>
                      <span>{selected.secondary}</span>
                      <strong>
                        {active === "budgets"
                          ? money(selected.secondaryValue)
                          : selected.secondaryValue}
                      </strong>
                      <small>
                        <ArrowUpRight size={14} aria-hidden="true" />
                        Theo nhịp của bạn
                      </small>
                    </div>
                  </div>
                  <div className="preview-detail-grid">
                    <div className="preview-rows">
                      <div className="preview-table-heading">
                        <span>{selected.columns[0]}</span>
                        <span>{selected.columns[1]}</span>
                      </div>
                      {selected.rows.map((row) => (
                        <div className="preview-row" key={row.name}>
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
                            <strong>{row.name}</strong>
                            <small>
                              {active === "funds"
                                ? `Hoàn thành ${row.percent}%`
                                : row.note}
                            </small>
                            {active === "budgets" && (
                              <span className="preview-payment">
                                <LabelName
                                  name={
                                    row.name === "Sinh hoạt" ? "Timo" : "HSBC"
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
                          ? "EMERGENCY · TIẾN ĐỘ DỰ PHÒNG"
                          : selected.chartLabel}
                      </span>
                      {active === "funds" ? (
                        <>
                          {neutral ? (
                            <div
                              className="marketing-fund-progress"
                              role="img"
                              aria-label="Emergency Fund đã chuẩn bị 50% mục tiêu"
                            >
                              <span>
                                50<small>%</small>
                              </span>
                            </div>
                          ) : (
                            <ProgressScene fund="emergency" percent="50" />
                          )}
                          <p>
                            Đã chuẩn bị 50% · Mức sinh hoạt {money("9.000.000")}
                            /tháng
                          </p>
                        </>
                      ) : (
                        <div
                          className="preview-bars"
                          role="img"
                          aria-label={
                            active === "budgets"
                              ? "Minh họa mức thực chi khác nhau qua sáu tháng"
                              : "Minh họa xu hướng qua sáu tháng"
                          }
                        >
                          {selected.bars.map((height, index) => (
                            <div key={index}>
                              <i style={{ height: `${height}%` }} />
                              <small>T{index + 1}</small>
                            </div>
                          ))}
                        </div>
                      )}
                      <small>Số liệu minh họa cố định</small>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
