import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import NewsTicker from "@/components/NewsTicker";
import PolicySection from "@/components/PolicySection";
import ActivitiesSection from "@/components/ActivitiesSection";
import DownloadsSection from "@/components/DownloadsSection";
import NewsletterSection from "@/components/NewsletterSection";
import Footer from "@/components/Footer";
import CustomBlock from "@/components/CustomBlock";
import { Metadata } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_DATAGOV_URL || "http://localhost:3002";

export const metadata: Metadata = {
  title: "DataGOV | ศูนย์กลางธรรมาภิบาลข้อมูล ศาลปกครอง",
  description: "ระบบบริหารจัดการและกำกับดูแลข้อมูลอิเล็กทรอนิกส์ สำนักงานศาลปกครอง ภายใต้มาตรฐานธรรมาภิบาลข้อมูลภาครัฐ",
  keywords: ["ธรรมาภิบาลข้อมูล", "ศาลปกครอง", "DataGOV", "Open Data", "ข้อมูลภาครัฐ", "DGA"],
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    title: "DataGOV | ศูนย์กลางธรรมาภิบาลข้อมูล ศาลปกครอง",
    description: "ระบบบริหารจัดการและกำกับดูแลข้อมูลอิเล็กทรอนิกส์ สำนักงานศาลปกครอง ภายใต้มาตรฐานธรรมาภิบาลข้อมูลภาครัฐ",
    url: SITE_URL,
    siteName: "DataGOV ศาลปกครอง",
    locale: "th_TH",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "DataGOV | ธรรมาภิบาลข้อมูล ศาลปกครอง",
    description: "ระบบบริหารจัดการและกำกับดูแลข้อมูลภาครัฐ สำนักงานศาลปกครอง",
  },
  robots: { index: true, follow: true },
};

import ScrollProgress from "@/components/ScrollProgress";
import BackToTop from "@/components/BackToTop";
import { fetchAPI } from "@/lib/api";
import { headers } from "next/headers";

export const revalidate = 60; // Revalidate every 60 seconds (ISR) to pull fresh data from Strapi

export default async function Home() {
  const headersList = await headers();
  const host = headersList.get("host") || "localhost";

  // Normalize domain for config matching
  let domain = host;
  if (host.includes(":3004")) domain = "pdpa.localhost";
  else if (host.includes(":3002") || host.includes(":3000")) domain = "localhost";
  // Fallback map based on port for production external access (e.g. 54.224.21.48:3002 -> localhost)
  else if (host.includes("3004")) domain = "pdpa.localhost";
  else domain = "localhost";

  // กำหนด Theme ตาม Domain (ใช้สำหรับ Layout Wrapper หรือผ่าน Context)
  const theme = domain.includes("pdpa") ? "pdpa" : "datagov";

  let announcement = undefined;
  let siteConfig = undefined;
  let slides = [];
  let activities = [];

  try {
    const config = await fetchAPI("/site-configs", {
      filters: { domain }
    });
    siteConfig = config.data?.[0];
    announcement = siteConfig?.announcement;

    const slidesRes = await fetchAPI("/hero-slides", {
      filters: { domain, isActive: true },
      populate: ["image"],
      sort: ["displayOrder:asc"]
    });
    slides = slidesRes.data || [];

    const activitiesRes = await fetchAPI("/articles", {
      filters: { domain },
      sort: ["publishedAt:desc"],
      pagination: { limit: 3 },
      populate: "*"
    });
    activities = activitiesRes.data || [];
  } catch (e) {
    console.error("Error fetching home data", e);
  }

  const toggles = siteConfig?.sectionToggles || {};
  const sectionOrder: any[] = siteConfig?.sectionOrder || ["hero", "policies", "activities", "downloads", "newsletter"];

  // Build visible sections list based on toggles + order
  const visibleSections = sectionOrder.filter((item: any) => {
    const key = typeof item === "string" ? item : item.id;
    return toggles[key] !== false;
  });

  // Section background colors for dividers
  const getSectionBg = (item: any) => {
    if (typeof item !== "string") {
      return item.bgColor || "transparent";
    }
    const sectionBg: Record<string, string> = {
      hero: "var(--primary-color)",
      policies: "#ffffff",
      activities: "#f1f5f9",
      downloads: "#ffffff",
      newsletter: "var(--primary-color)",
    };
    return sectionBg[item] || "#ffffff";
  };

  // Render a divider between two sections based on their backgrounds
  const renderDivider = (fromBg: string, toBg: string, key: string) => {
    // Primary → White: wave
    if (fromBg.includes("primary") && toBg === "#ffffff") {
      return (
        <div key={key} style={{ background: fromBg, lineHeight: 0, overflow: "hidden" }}>
          <svg viewBox="0 0 1440 90" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" style={{ display: "block", width: "100%", height: 90 }}>
            <path d="M0,45 C240,90 480,0 720,45 C960,90 1200,10 1440,45 L1440,90 L0,90 Z" fill="#ffffff" />
          </svg>
        </div>
      );
    }
    // White → Slate: diagonal
    if (toBg === "#f1f5f9" && fromBg === "#ffffff") {
      return (
        <div key={key} style={{ background: "#ffffff", lineHeight: 0, overflow: "hidden" }}>
          <svg viewBox="0 0 1440 70" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" style={{ display: "block", width: "100%", height: 70 }}>
            <path d="M0,0 L1440,70 L1440,70 L0,70 Z" fill="#f1f5f9" />
          </svg>
        </div>
      );
    }
    // Slate → White: arc
    if (fromBg === "#f1f5f9" && toBg === "#ffffff") {
      return (
        <div key={key} style={{ background: "#f1f5f9", lineHeight: 0, overflow: "hidden" }}>
          <svg viewBox="0 0 1440 80" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" style={{ display: "block", width: "100%", height: 80 }}>
            <path d="M0,80 C360,0 1080,0 1440,80 L1440,80 L0,80 Z" fill="#ffffff" />
          </svg>
        </div>
      );
    }
    // White/Slate → Primary: multi-layer wave
    if (toBg.includes("primary")) {
      return (
        <div key={key} style={{ background: fromBg, lineHeight: 0, overflow: "hidden" }}>
          <svg viewBox="0 0 1440 100" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" style={{ display: "block", width: "100%", height: 100 }}>
            <path d="M0,55 C360,100 720,20 1080,60 C1260,80 1380,45 1440,55 L1440,100 L0,100 Z" fill="var(--primary-color)" opacity="0.35" />
            <path d="M0,68 C300,28 600,95 900,52 C1100,20 1300,72 1440,68 L1440,100 L0,100 Z" fill="var(--primary-color)" opacity="0.65" />
            <path d="M0,80 C200,58 500,100 800,75 C1060,52 1260,84 1440,80 L1440,100 L0,100 Z" fill="var(--primary-color)" />
          </svg>
        </div>
      );
    }
    // Primary → Slate
    if (fromBg.includes("primary") && toBg === "#f1f5f9") {
      return (
        <div key={key} style={{ background: fromBg, lineHeight: 0, overflow: "hidden" }}>
          <svg viewBox="0 0 1440 90" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" style={{ display: "block", width: "100%", height: 90 }}>
            <path d="M0,45 C240,90 480,0 720,45 C960,90 1200,10 1440,45 L1440,90 L0,90 Z" fill="#f1f5f9" />
          </svg>
        </div>
      );
    }
    return null; // Same bg — no divider
  };

  // Render section content by key
  const renderSection = (item: any) => {
    if (typeof item !== "string") {
      return <CustomBlock data={item} />;
    }
    switch (item) {
      case "hero":
        return (
          <Hero
            headline={siteConfig?.heroHeadline}
            subHeadline={siteConfig?.heroSubheadline}
            heroStats={siteConfig?.heroStats}
            slides={slides}
          />
        );
      case "policies":
        return <PolicySection domain={domain} />;
      case "activities":
        return (
          <div style={{ background: "#f1f5f9" }}>
            <ActivitiesSection domain={domain} initialActivities={activities} />
          </div>
        );
      case "downloads":
        return <DownloadsSection domain={domain} />;
      case "newsletter":
        return <NewsletterSection domain={domain} />;
      default:
        return null;
    }
  };

  return (
    <main id="main-content" className="min-h-screen selection:bg-accent/30 relative">
      <div className="noise-overlay" />
      <ScrollProgress />
      <BackToTop />
      <NewsTicker domain={domain} announcement={announcement} notifications={siteConfig?.notifications} />
      <Navbar domain={domain} />

      {/* Dynamic Section Rendering */}
      {visibleSections.map((sectionItem: any, idx: number) => {
        const elements = [];
        const sectionKey = typeof sectionItem === "string" ? sectionItem : sectionItem.id;
        const curBg = getSectionBg(sectionItem);

        // Add divider between previous section and this one
        if (idx > 0) {
          const prevBg = getSectionBg(visibleSections[idx - 1]);
          const divider = renderDivider(prevBg, curBg, `divider-${idx}`);
          if (divider) elements.push(divider);
        }

        // Add section content
        elements.push(
          <div key={`section-${sectionKey}`}>
            {renderSection(sectionItem)}
          </div>
        );

        return elements;
      })}

      <Footer domain={domain} />
    </main>
  );
}
