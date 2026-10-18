"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronDown,
  Eye,
  EyeOff,
  WalletCards,
} from "lucide-react";
import { modules } from "@/features/catalog";
import { ModuleIcon } from "@/components/module-icon";

const tabs = modules.filter((item) =>
  ["income", "budgets", "savings", "investments"].includes(item.slug),
);
const data = {
  income: {
    title: "Những điều bạn đã làm được.",
    subtitle: "Ghi nhận từng nguồn thu, nhìn rõ thực nhận trong tháng.",
    label: "Tổng thực nhận",
    value: "28.500.000",
    secondary: "Nguồn thu trong tháng",
    secondaryValue: "2 nguồn",
    columns: ["Nguồn thu", "Thực nhận"],
    rows: [
      {
        name: "Lương",
        note: "Thu nhập cố định",
        emoji: "🌿",
        amount: "25.000.000",
        percent: 88,
      },
      {
        name: "Dự án cá nhân",
        note: "Thu nhập phát sinh",
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
    subtitle: "Mỗi hũ một mục đích. Mỗi khoản chi một lựa chọn.",
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
    subtitle: "Tổng danh mục và tiền chờ, cùng ngày định giá rõ ràng.",
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
    subtitle: "Nhìn lại phần tích lũy và những bước tiến của riêng bạn.",
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

export function ProductPreview() {
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
    buttons.current[next]?.focus();
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
            <WalletCards size={20} aria-hidden="true" /> Financial Manager
          </span>
          <p>KHÔNG GIAN CÁ NHÂN</p>
          <div
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
          </div>
          <div className="preview-sidebar-note">
            <span className="status-dot" />
            Từng bước vun đắp.
            <small>Tải bản sao dữ liệu của bạn trong Cài đặt.</small>
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
                    <p>{item.title}</p>
                    <h2>{selected.title}</h2>
                    <span>{selected.subtitle}</span>
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
                            {row.emoji}
                          </span>
                          <div className="preview-row-info">
                            <strong>{row.name}</strong>
                            <small>{row.note}</small>
                            <span className="preview-progress">
                              <i style={{ width: `${row.percent}%` }} />
                            </span>
                          </div>
                          <span className="preview-row-money">
                            {money(row.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="preview-chart">
                      <span>{selected.chartLabel}</span>
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
                      <small>Biểu đồ từ số liệu minh họa cố định</small>
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
