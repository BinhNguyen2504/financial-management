import type { Metadata } from "next";
import { LandingAudience } from "@/features/landing/landing-audience";
import { MarketingLanding } from "@/features/landing/marketing-landing";
import { ThemedLanding } from "@/features/landing/themed-landing";

const title = "Financial Manager — Làm chủ tiền bạc. Sống trọn điều bạn muốn.";
const description =
  "Một không gian để hiểu tiền của bạn: quản lý thu nhập, hũ chi tiêu, tiết kiệm, đầu tư và quỹ an toàn. Khám phá giao diện với dữ liệu minh họa, không cần tài khoản.";
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

export default function Home() {
  return (
    <LandingAudience marketing={<MarketingLanding />}>
      <ThemedLanding />
    </LandingAudience>
  );
}
