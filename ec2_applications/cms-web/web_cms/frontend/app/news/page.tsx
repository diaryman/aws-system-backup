import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import NewsPageClient from "./NewsPageClient";
import NewsTicker from "@/components/NewsTicker";
import { Metadata } from "next";
import { fetchAPI } from "@/lib/api";
import { getCrossSiteURL } from "@/lib/siteConfig";

export async function generateMetadata(props: { searchParams: Promise<{ site?: string }> }): Promise<Metadata> {
    const searchParams = await props.searchParams;
    const isPDPA = searchParams.site === 'pdpa';
    const siteUrl = isPDPA ? getCrossSiteURL("pdpa") : getCrossSiteURL("main");

    const title = isPDPA ? "กิจกรรมและประกาศ - PDPA Center" : "ข่าวสารและกิจกรรมล่าสุด - DataGOV";
    const description = isPDPA
        ? "ติดตามข่าวสารและกิจกรรมล่าสุดด้านการคุ้มครองข้อมูลส่วนบุคคล"
        : "ติดตามข่าวสาร กิจกรรม และประกาศล่าสุดจากศูนย์กลางธรรมาภิบาลข้อมูล";
    const canonicalUrl = `${siteUrl}/news`;

    return {
        title,
        description,
        keywords: isPDPA
            ? ["PDPA", "ข่าว PDPA", "กิจกรรม PDPA", "คุ้มครองข้อมูล"]
            : ["ข่าวสาร", "องค์กร", "ติดตามข่าว", "DataGOV", "ศาลปกครอง"],
        alternates: { canonical: canonicalUrl },
        openGraph: {
            title,
            description,
            url: canonicalUrl,
            siteName: isPDPA ? "PDPA ศาลปกครอง" : "DataGOV ศาลปกครอง",
            locale: "th_TH",
            type: "website",
        },
        twitter: { card: "summary", title, description },
    };
}

export default async function NewsPage(props: { searchParams: Promise<{ page?: string; q?: string; site?: string }> }) {
    const searchParams = await props.searchParams;
    let domain = "localhost";
    if (searchParams.site === "pdpa") {
        domain = "pdpa.localhost";
    }

    let announcement = undefined;
    let notifications = undefined;
    let initialCategories = [];
    let initialArticles = [];
    let initialMeta = null;

    try {
        const config = await fetchAPI("/site-configs", {
            filters: { domain }
        });
        const siteConfig = config.data?.[0];
        announcement = siteConfig?.announcement;
        notifications = siteConfig?.notifications;

        // Pre-fetch categories
        const catsRes = await fetchAPI("/categories", {
            filters: { domain, type: "news" }
        });
        initialCategories = catsRes.data || [];

        // Pre-fetch articles
        const page = Number(searchParams.page) || 1;
        const q = searchParams.q || "";
        const filters: any = { domain };
        if (q) filters.title = { $containsi: q };
        // For category filter, we'd need it in searchParams, but let's just pass initial

        const articlesRes = await fetchAPI("/articles", {
            sort: ["publishedAt:desc"],
            pagination: { page, pageSize: 9 },
            populate: "*",
            filters: filters
        });
        initialArticles = articlesRes.data || [];
        initialMeta = articlesRes.meta || null;

    } catch (e) {
        console.error("Error fetching news data", e);
    }

    return (
        <>
            <NewsTicker domain={domain} announcement={announcement} notifications={notifications} />
            <NewsPageClient
                header={<Navbar domain={domain} />}
                footer={<Footer domain={domain} />}
                searchParams={searchParams}
                domain={domain}
                initialArticles={initialArticles}
                initialCategories={initialCategories}
                initialMeta={initialMeta}
            />
        </>
    );
}
