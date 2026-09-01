import type { Metadata } from "next";
import { Sarabun, Prompt, Kanit, Noto_Sans_Thai } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

const sarabun = Sarabun({
  weight: ['300', '400', '500', '600', '700'],
  subsets: ["thai", "latin"],
  variable: "--font-sarabun",
  display: 'swap',
});

const prompt = Prompt({
  weight: ['300', '400', '500', '600', '700'],
  subsets: ["thai", "latin"],
  variable: "--font-prompt",
  display: 'swap',
});

const kanit = Kanit({
  weight: ['300', '400', '500', '600', '700'],
  subsets: ["thai", "latin"],
  variable: "--font-kanit",
  display: 'swap',
});

const notoSansThai = Noto_Sans_Thai({
  weight: ['300', '400', '500', '600', '700'],
  subsets: ["thai", "latin"],
  variable: "--font-noto-sans-thai",
  display: 'swap',
});

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers();
  const host = headersList.get("host") || "localhost";
  const isPDPA = host.includes("3004") || host.includes("pdpa");

  return isPDPA
    ? {
      title: {
        default: "PDPA | การคุ้มครองข้อมูลส่วนบุคคล - ศาลปกครอง",
        template: "%s | PDPA ศาลปกครอง",
      },
      description: "การดำเนินงานด้านการคุ้มครองข้อมูลส่วนบุคคล สำนักงานศาลปกครอง ตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562",
      manifest: "/manifest.json",
      appleWebApp: {
        capable: true,
        statusBarStyle: "default",
        title: "PDPA",
      },
      robots: { index: true, follow: true },
    }
    : {
      title: {
        default: "DataGOV | ศูนย์กลางธรรมาภิบาลข้อมูล ศาลปกครอง",
        template: "%s | DataGOV ศาลปกครอง",
      },
      description: "ระบบบริหารจัดการและกำกับดูแลข้อมูลอิเล็กทรอนิกส์ สำนักงานศาลปกครอง ภายใต้มาตรฐานธรรมาภิบาลข้อมูลภาครัฐ",
      manifest: "/manifest.json",
      appleWebApp: {
        capable: true,
        statusBarStyle: "default",
        title: "DataGOV",
      },
      robots: { index: true, follow: true },
    };
}

import CustomCursor from "@/components/CustomCursor";
import BackToTop from "@/components/BackToTop";
import ChatWidget from "@/components/ChatWidget";
import SiteThemeProvider from "@/components/SiteThemeProvider";
import CookieBanner from "@/components/CookieBanner";
import AccessibilityToolbar from "@/components/AccessibilityToolbar";
import AnalyticsProvider from "@/components/AnalyticsProvider";
import SmoothScrollProvider from "@/components/SmoothScrollProvider";
import { fetchAPI } from "@/lib/api";
import { generateThemeCssVariables } from "@/lib/themeUtils";
import { getDomainFromHost, DATAGOV_URL, PDPA_URL } from "@/lib/siteConfig";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers();
  const host = headersList.get("host") || "localhost";

  let domain = getDomainFromHost(host);
  const theme = domain.includes("pdpa") ? "pdpa" : "datagov";
  const isPDPA = domain.includes("pdpa");

  let cookieConsentConfig = undefined;
  let themeCssVars = "";
  let fontFamilyConfig = "prompt"; // Default to Prompt (Modern Sans-Serif)

  try {
    const res = await fetchAPI("/site-configs", { filters: { domain } });
    const config = res.data?.[0];
    if (config?.cookieConsent) cookieConsentConfig = config.cookieConsent;
    if (config?.themeColors?.primary && config?.themeColors?.accent) {
      themeCssVars = generateThemeCssVariables(config.themeColors.primary, config.themeColors.accent);
    }
    if (config?.fontFamily) fontFamilyConfig = config.fontFamily;
  } catch (e) {
    // Non-critical
  }

  let fontVars = "";
  if (fontFamilyConfig === "sarabun") {
    fontVars = `--font-sans: var(--font-sarabun), 'Sarabun', ui-sans-serif, system-ui, sans-serif; --font-heading: var(--font-sarabun), 'Sarabun', ui-sans-serif, system-ui, sans-serif;`;
  } else if (fontFamilyConfig === "kanit") {
    fontVars = `--font-sans: var(--font-kanit), 'Kanit', ui-sans-serif, system-ui, sans-serif; --font-heading: var(--font-kanit), 'Kanit', ui-sans-serif, system-ui, sans-serif;`;
  } else if (fontFamilyConfig === "notoSansThai") {
    fontVars = `--font-sans: var(--font-noto-sans-thai), 'Noto Sans Thai', ui-sans-serif, system-ui, sans-serif; --font-heading: var(--font-noto-sans-thai), 'Noto Sans Thai', ui-sans-serif, system-ui, sans-serif;`;
  } else {
    fontVars = `--font-sans: var(--font-prompt), 'Prompt', ui-sans-serif, system-ui, sans-serif; --font-heading: var(--font-prompt), 'Prompt', ui-sans-serif, system-ui, sans-serif;`;
  }

  const finalCss = themeCssVars ? `${themeCssVars} html:root, body { ${fontVars} }` : `html:root, body { ${fontVars} }`;

  return (
    <html lang="th" data-theme={theme} suppressHydrationWarning>
      <head>
        <style id="server-theme" dangerouslySetInnerHTML={{ __html: finalCss }} />
        {/*
          P8 + DGA: Theme, Font Size & High Contrast FOUC Prevention
          Inline blocking script runs before first paint.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=localStorage.getItem('theme'),p=window.matchMedia('(prefers-color-scheme: dark)').matches;if(s==='dark'||(s===null&&p)){document.documentElement.classList.add('dark');}else{document.documentElement.classList.remove('dark');}window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change',function(e){if(!localStorage.getItem('theme')){e.matches?document.documentElement.classList.add('dark'):document.documentElement.classList.remove('dark');}});var fs=localStorage.getItem('dga-font-size');if(fs){var scale=100;if(fs==='-1')scale=90;if(fs==='1')scale=110;if(fs==='2')scale=120;document.documentElement.style.fontSize=scale+'%';}var hc=localStorage.getItem('dga-high-contrast');if(hc==='true'){document.documentElement.classList.add('high-contrast');}}catch(e){}})();`,
          }}
        />
      </head>
      <body className={`${sarabun.variable} ${prompt.variable} ${kanit.variable} ${notoSansThai.variable} antialiased font-sans flex flex-col min-h-screen`}>
        {/* Skip to main (WCAG 2.1) */}
        <a href="#main-content" className="skip-link" aria-label="ข้ามไปยังเนื้อหาหลัก">
          ข้ามไปยังเนื้อหาหลัก
        </a>

        {/* JSON-LD Structured Data (Schema.org) — SEO Rich Snippets */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(isPDPA ? {
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "Organization",
                  "@id": `${PDPA_URL}/#organization`,
                  "name": "ศูนย์ PDPA สำนักงานศาลปกครอง",
                  "url": PDPA_URL,
                  "description": "การคุ้มครองข้อมูลส่วนบุคคล สำนักงานศาลปกครอง ตาม พ.ร.บ. PDPA พ.ศ. 2562",
                  "sameAs": ["https://www.admincourt.go.th"],
                  "contactPoint": {
                    "@type": "ContactPoint",
                    "contactType": "customer service",
                    "areaServed": "TH",
                    "availableLanguage": "Thai"
                  }
                },
                {
                  "@type": "WebSite",
                  "@id": `${PDPA_URL}/#website`,
                  "url": PDPA_URL,
                  "name": "PDPA ศาลปกครอง",
                  "inLanguage": "th",
                  "publisher": { "@id": `${PDPA_URL}/#organization` }
                }
              ]
            } : {
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "Organization",
                  "@id": `${DATAGOV_URL}/#organization`,
                  "name": "สำนักงานศาลปกครอง — DataGOV",
                  "url": DATAGOV_URL,
                  "description": "ศูนย์กลางธรรมาภิบาลข้อมูล สำนักงานศาลปกครอง มาตรฐานธรรมาภิบาลข้อมูลภาครัฐ",
                  "sameAs": ["https://www.admincourt.go.th"],
                  "contactPoint": {
                    "@type": "ContactPoint",
                    "telephone": "+66-2141-1111",
                    "contactType": "customer service",
                    "areaServed": "TH",
                    "availableLanguage": "Thai"
                  }
                },
                {
                  "@type": "WebSite",
                  "@id": `${DATAGOV_URL}/#website`,
                  "url": DATAGOV_URL,
                  "name": "DataGOV ศาลปกครอง",
                  "inLanguage": "th",
                  "publisher": { "@id": `${DATAGOV_URL}/#organization` },
                  "potentialAction": {
                    "@type": "SearchAction",
                    "target": {
                      "@type": "EntryPoint",
                      "urlTemplate": `${DATAGOV_URL}/news?q={search_term_string}`
                    },
                    "query-input": "required name=search_term_string"
                  }
                }
              ]
            })
          }}
        />

        <SiteThemeProvider>
          <SmoothScrollProvider>
            <AnalyticsProvider domain={domain} />
            <CustomCursor />
            <AccessibilityToolbar />
            {children}
            <BackToTop />
            <ChatWidget domainOverride={domain} />
            <CookieBanner config={cookieConsentConfig} domain={domain} />
          </SmoothScrollProvider>
        </SiteThemeProvider>
      </body>
    </html>
  );
}
