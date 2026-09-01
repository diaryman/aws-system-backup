import { MetadataRoute } from "next";
import { fetchAPI } from "@/lib/api";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";
export const revalidate = 3600; // Re-generate every hour

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const headersList = await headers();
    const host = headersList.get("host") || "localhost:3002";

    // Determine base URL from incoming host
    const isPDPA = host.includes("3004") || host.includes("pdpa");
    const baseUrl = isPDPA
        ? `http://${host}`
        : `http://${host}`;

    const now = new Date();

    // Static core pages
    const staticRoutes: MetadataRoute.Sitemap = [
        {
            url: baseUrl,
            lastModified: now,
            changeFrequency: "daily",
            priority: 1.0
        },
        {
            url: `${baseUrl}/news`,
            lastModified: now,
            changeFrequency: "daily",
            priority: 0.9
        },
        {
            url: `${baseUrl}/documents`,
            lastModified: now,
            changeFrequency: "weekly",
            priority: 0.8
        },
        {
            url: `${baseUrl}/contact`,
            lastModified: now,
            changeFrequency: "monthly",
            priority: 0.5
        },
        {
            url: `${baseUrl}/privacy-policy`,
            lastModified: now,
            changeFrequency: "yearly",
            priority: 0.3
        },
        {
            url: `${baseUrl}/cookie-policy`,
            lastModified: now,
            changeFrequency: "yearly",
            priority: 0.3
        },
        {
            url: `${baseUrl}/terms-of-use`,
            lastModified: now,
            changeFrequency: "yearly",
            priority: 0.3
        },
    ];

    // Dynamic article pages
    let articleRoutes: MetadataRoute.Sitemap = [];
    try {
        const domain = isPDPA ? "pdpa.localhost" : "localhost";
        const res = await fetchAPI("/articles", {
            filters: { domain },
            fields: ["slug", "updatedAt", "publishedAt"],
            pagination: { pageSize: 200 },
            status: "published"
        });

        const articles = res.data || [];
        articleRoutes = articles.map((article: any) => ({
            url: `${baseUrl}/news/${article.slug}`,
            lastModified: new Date(article.updatedAt || article.publishedAt || now),
            changeFrequency: "weekly" as const,
            priority: 0.75
        }));
    } catch (e) {
        // Articles unreachable — don't fail sitemap generation
    }

    // Dynamic document pages (documents use ID-based routes)
    let documentRoutes: MetadataRoute.Sitemap = [];
    try {
        const domain = isPDPA ? "pdpa.localhost" : "localhost";
        const res = await fetchAPI("/policy-documents", {
            filters: { domain },
            fields: ["id", "updatedAt"],
            pagination: { pageSize: 200 },
            status: "published"
        });

        const docs = res.data || [];
        documentRoutes = docs.map((doc: any) => ({
            url: `${baseUrl}/documents/${doc.id}`,
            lastModified: new Date(doc.updatedAt || now),
            changeFrequency: "monthly" as const,
            priority: 0.65
        }));
    } catch (e) {
        // Non-critical
    }

    return [...staticRoutes, ...articleRoutes, ...documentRoutes];
}
