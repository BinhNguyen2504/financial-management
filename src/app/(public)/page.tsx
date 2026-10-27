import type { Metadata } from "next";
import { LandingAudience } from "@/features/landing/landing-audience";
import { MarketingLanding } from "@/features/landing/marketing-landing";
import { ThemedLanding } from "@/features/landing/themed-landing";
import { getLandingMetadata, getWebsiteJsonLd } from "@/lib/seo";

export const metadata: Metadata = getLandingMetadata();

export default function Home() {
  const jsonLd = getWebsiteJsonLd();
  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd }}
        />
      )}
      <LandingAudience marketing={<MarketingLanding />}>
        <ThemedLanding />
      </LandingAudience>
    </>
  );
}
