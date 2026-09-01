import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import NewsTicker from "@/components/NewsTicker";
import PDPAPageClient from "./PDPAPageClient";
import { fetchAPI } from "@/lib/api";
import { Metadata } from "next";

import { PDPA_URL as SITE_PDPA_URL, PDPA_DOMAIN, getDomainFromHost } from "@/lib/siteConfig";

const PDPA_URL = SITE_PDPA_URL;

export const metadata: Metadata = {
    title: "PDPA | การคุ้มครองข้อมูลส่วนบุคคล - ศาลปกครอง",
    description: "การดำเนินงานด้านการคุ้มครองข้อมูลส่วนบุคคล สำนักงานศาลปกครอง ตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562",
    keywords: ["PDPA", "คุ้มครองข้อมูลส่วนบุคคล", "DPO", "ศาลปกครอง", "กฎหมายคุ้มครองข้อมูล", "Privacy Policy"],
    alternates: {
        canonical: `${PDPA_URL}/pdpa`,
    },
    openGraph: {
        title: "PDPA | การคุ้มครองข้อมูลส่วนบุคคล - ศาลปกครอง",
        description: "การดำเนินงานด้านการคุ้มครองข้อมูลส่วนบุคคล สำนักงานศาลปกครอง ตาม พ.ร.บ. PDPA พ.ศ. 2562",
        url: `${PDPA_URL}/pdpa`,
        siteName: "PDPA ศาลปกครอง",
        locale: "th_TH",
        type: "website",
    },
    twitter: {
        card: "summary_large_image",
        title: "PDPA | คุ้มครองข้อมูลส่วนบุคคล ศาลปกครอง",
        description: "การดำเนินงานด้านการคุ้มครองข้อมูลส่วนบุคคล ຕาม พ.ร.บ. PDPA พ.ศ. 2562",
    },
    robots: { index: true, follow: true },
};

import { headers } from "next/headers";

export const revalidate = 60; // Revalidate every 60 seconds (ISR) to pull fresh data from Strapi

export default async function PDPAPage() {
    const headersList = await headers();
    const host = headersList.get("host") || "localhost";

    // Normalize domain — always PDPA_DOMAIN for this page
    // but respect host-based detection for shared deployments
    let domain = getDomainFromHost(host);
    if (!domain.includes("pdpa")) domain = PDPA_DOMAIN; // Force PDPA domain for this page

    let announcement = undefined;
    let siteConfig = undefined;
    let features: any[] = [];
    let articles: any[] = [];
    let documents: any[] = [];
    let timelineItems: any[] = [];

    try {
        // Parallel fetch everything for maximum TTFB performance
        const [configRes, featuresRes, articlesRes, docsRes, timelineRes] = await Promise.allSettled([
            fetchAPI("/site-configs", { filters: { domain } }),
            fetchAPI("/features", { filters: { domain, section: "PDPA Principles" }, sort: ["order:asc"] }),
            fetchAPI("/articles", {
                filters: { domain },
                sort: ["publishedAt:desc"],
                pagination: { limit: 3 },
                populate: ["coverImage", "category"]
            }),
            fetchAPI("/policy-documents", { filters: { domain }, sort: ["createdAt:desc"], populate: "*" }),
            fetchAPI("/timelines", { filters: { domain }, sort: ["order:asc"] }),
        ]);

        if (configRes.status === "fulfilled") {
            siteConfig = configRes.value.data?.[0];
            announcement = siteConfig?.announcement;
        }
        if (featuresRes.status === "fulfilled") features = featuresRes.value.data || [];
        if (articlesRes.status === "fulfilled") articles = articlesRes.value.data || [];
        if (docsRes.status === "fulfilled") documents = docsRes.value.data || [];
        if (timelineRes.status === "fulfilled") timelineItems = timelineRes.value.data || [];
    } catch (e) {
        console.error("Error fetching PDPA data", e);
    }

    return (
        <>
            <NewsTicker domain={domain} announcement={announcement} notifications={siteConfig?.notifications} />
            <PDPAPageClient
                navbar={<Navbar domain={domain} />}
                footer={<Footer domain={domain} />}
                siteConfig={siteConfig}
                features={features}
                initialArticles={articles}
                initialDocuments={documents}
                initialTimeline={timelineItems}
            />
        </>
    );
}

