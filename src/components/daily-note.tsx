"use client";
import { useEffect, useState } from "react";
import { Sprout } from "lucide-react";
import { vietnamClock } from "@/domain/expenses/engine";
const notes = [
  "Mỗi khoản để dành là một chút bình yên cho ngày mai.",
  "Bạn có thể bắt đầu nhỏ, rồi lớn lên theo nhịp của mình.",
  "Một lần nhìn lại hôm nay, một bước chủ động hơn ngày mai.",
  "Chăm sóc tài chính cũng là một cách chăm sóc bản thân.",
  "Không cần vội. Những thói quen nhỏ cần thời gian để nảy mầm.",
  "Dành chỗ cho điều cần thiết và cả những niềm vui vừa đủ.",
  "Một tháng chưa như ý cũng là cơ hội để hiểu mình hơn.",
];
export function DailyNote() {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const update = () => {
      const day = vietnamClock().today;
      setIndex(
        Math.floor(Date.parse(`${day}T00:00:00Z`) / 86400000) % notes.length,
      );
      clearTimeout(timer);
      const midnight = Date.parse(`${day}T00:00:00+07:00`) + 86400000;
      timer = setTimeout(update, Math.max(1000, midnight - Date.now() + 100));
    };
    update();
    document.addEventListener("visibilitychange", update);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);
  return (
    <aside className="daily-note">
      <Sprout size={21} aria-hidden="true" />
      <p>
        <span>MỘT CHÚT BÌNH YÊN</span>
        {notes[index]}
      </p>
    </aside>
  );
}
