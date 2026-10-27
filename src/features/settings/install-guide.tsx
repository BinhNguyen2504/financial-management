"use client";
import { ScrollTabs } from "@/components/scroll-tabs";
import { useI18n } from "@/i18n/provider";

import { CheckCircle2, Monitor, Smartphone } from "lucide-react";
import { useEffect, useId, useState } from "react";

const guides = {
  ios: {
    name: "iPhone / iPad",
    source: "https://support.apple.com/guide/iphone/iphea86e5236/ios",
    steps: [
      [
        "Mở bằng Safari",
        "Mở địa chỉ ứng dụng trong Safari. Nếu đang xem từ ứng dụng khác, sao chép liên kết và mở trong Safari.",
        "Safari · Financial Manager",
      ],
      [
        "Mở menu chia sẻ",
        "Chạm nút Chia sẻ (hình vuông có mũi tên hướng lên). Tùy phiên bản Safari, nút nằm trên thanh công cụ hoặc trong menu Thêm.",
        "↑  Chia sẻ",
      ],
      [
        "Thêm vào màn hình chính",
        "Cuộn danh sách thao tác và chọn Thêm vào Màn hình chính. Nếu chưa thấy, mở Sửa tác vụ để tìm mục này.",
        "＋  Thêm vào Màn hình chính",
      ],
      [
        "Xác nhận và mở ứng dụng",
        "Giữ tên Financial Manager, bật Mở dưới dạng ứng dụng web nếu có, rồi chạm Thêm. Mở bằng biểu tượng mới trên màn hình chính.",
        "Financial Manager       Thêm",
      ],
    ],
  },
  android: {
    name: "Android",
    source:
      "https://support.google.com/chrome/answer/9658361?co=GENIE.Platform%3DAndroid&hl=vi",
    steps: [
      [
        "Mở bằng Chrome",
        "Mở địa chỉ ứng dụng trong Chrome và đợi trang tải xong.",
        "Chrome · Financial Manager",
      ],
      [
        "Mở menu trình duyệt",
        "Chạm nút ba chấm ở góc trên bên phải Chrome.",
        "Financial Manager       ⋮",
      ],
      [
        "Chọn cài đặt",
        "Chọn Thêm vào màn hình chính, sau đó chọn Cài đặt nếu trình duyệt hiển thị lựa chọn này.",
        "＋  Thêm vào màn hình chính",
      ],
      [
        "Xác nhận cài đặt",
        "Chạm Cài đặt hoặc Thêm theo hộp thoại. Khi hoàn tất, mở Financial Manager từ màn hình chính hoặc danh sách ứng dụng.",
        "Financial Manager     Cài đặt",
      ],
    ],
  },
  desktop: {
    name: "Máy tính",
    source: "https://support.google.com/chrome/answer/9658361?hl=vi",
    steps: [
      [
        "Mở bằng Chrome hoặc Edge",
        "Truy cập địa chỉ ứng dụng bằng Chrome hoặc Microsoft Edge trên máy tính.",
        "https://… /overview",
      ],
      [
        "Tìm thao tác cài ứng dụng",
        "Bấm biểu tượng Cài đặt ứng dụng ở bên phải thanh địa chỉ. Nếu không thấy, mở menu trình duyệt.",
        "Thanh địa chỉ              ↓",
      ],
      [
        "Chọn Financial Manager",
        "Trong Chrome, tìm Truyền, lưu và chia sẻ → Cài đặt trang dưới dạng ứng dụng. Trong Edge, tìm Ứng dụng → Cài đặt trang này dưới dạng ứng dụng.",
        "Cài đặt Financial Manager",
      ],
      [
        "Cài đặt và ghim lối tắt",
        "Xác nhận Cài đặt. Bạn có thể ghim ứng dụng vào thanh tác vụ hoặc Dock để mở nhanh vào lần sau.",
        "Financial Manager     Cài đặt",
      ],
    ],
  },
} as const;
type Platform = keyof typeof guides;

function InstallIllustration({
  action,
  step,
  desktop,
}: {
  action: string;
  step: number;
  desktop: boolean;
}) {
  const { t: tr } = useI18n("settings");

  const id = useId();
  return (
    <svg viewBox="0 0 320 180" role="img" aria-labelledby={id}>
      <title id={id}>
        {tr("Minh họa bước {0}: {1}", { 0: step, 1: action })}
      </title>
      <rect
        x={desktop ? 12 : 65}
        y="5"
        width={desktop ? 296 : 190}
        height="170"
        rx="14"
        fill="var(--canvas)"
        stroke="var(--border)"
        strokeWidth="2"
      />
      <rect
        x={desktop ? 24 : 77}
        y="19"
        width={desktop ? 272 : 166}
        height="22"
        rx="7"
        fill="var(--surface-alt)"
      />
      <circle cx={desktop ? 35 : 88} cy="30" r="3" fill="var(--accent)" />
      <rect
        x={desktop ? 24 : 77}
        y="52"
        width={desktop ? 272 : 166}
        height="104"
        rx="9"
        fill="var(--surface)"
      />
      <text
        x="160"
        y="80"
        textAnchor="middle"
        fontSize="13"
        fontWeight="750"
        fill="var(--text)"
      >
        Financial Manager
      </text>
      <rect
        x="40"
        y="96"
        width="240"
        height="38"
        rx="9"
        fill="var(--primary-soft)"
        stroke="var(--primary)"
      />
      <text
        x="160"
        y="119"
        textAnchor="middle"
        fontSize="11"
        fill="var(--primary)"
        fontWeight="750"
      >
        {action}
      </text>
      <circle cx="282" cy="96" r="13" fill="var(--primary)" />
      <text
        x="282"
        y="101"
        textAnchor="middle"
        fontSize="13"
        fill="var(--on-primary)"
        fontWeight="800"
      >
        {step}
      </text>
    </svg>
  );
}

export function InstallGuide() {
  const { t: tr, config: localize } = useI18n("settings");
  const localizedGuides = localize(guides);

  const [platform, setPlatform] = useState<Platform>("ios");
  const [installed, setInstalled] = useState(false);
  useEffect(() => {
    const agent = navigator.userAgent;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Reflect the browser installation environment after mount.
    setPlatform(
      /iPhone|iPad|iPod/.test(agent) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
        ? "ios"
        : /Android/.test(agent)
          ? "android"
          : "desktop",
    );
    const media = window.matchMedia("(display-mode: standalone)");
    const sync = () =>
      setInstalled(
        media.matches ||
          !!(navigator as Navigator & { standalone?: boolean }).standalone,
      );
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);
  const guide = localizedGuides[platform];
  return (
    <div>
      {installed && (
        <p className="status-badge">
          <CheckCircle2 size={18} aria-hidden="true" />
          {tr("Bạn đang mở ứng dụng đã cài.")}
        </p>
      )}
      <ScrollTabs
        className="install-platforms"
        role="group"
        aria-label={tr("Thiết bị muốn cài")}
      >
        {Object.entries(localizedGuides).map(([key, item]) => (
          <button
            className="expense-secondary"
            key={key}
            type="button"
            aria-pressed={platform === key}
            onClick={() => setPlatform(key as Platform)}
          >
            {key === "desktop" ? (
              <Monitor size={18} aria-hidden="true" />
            ) : (
              <Smartphone size={18} aria-hidden="true" />
            )}
            {item.name}
          </button>
        ))}
      </ScrollTabs>
      <ol className="install-steps">
        {guide.steps.map(([title, description, action], index) => (
          <li key={title}>
            <h3>{title}</h3>
            <p>{description}</p>
            <InstallIllustration
              action={action}
              step={index + 1}
              desktop={platform === "desktop"}
            />
          </li>
        ))}
      </ol>
      <p className="expense-muted install-caption">
        {tr(
          "Hình minh họa thao tác; vị trí và tên menu có thể khác theo phiên bản trình duyệt.",
        )}{" "}
        <a
          className="external-link"
          href={guide.source}
          target="_blank"
          rel="noreferrer"
        >
          {tr("Xem hướng dẫn chính thức ↗")}
        </a>
      </p>
      <p>
        {tr(
          "Cần kết nối mạng để xem và lưu dữ liệu. Việc cài lên màn hình chính không bật tính năng nhập ngoại tuyến.",
        )}
      </p>
    </div>
  );
}
