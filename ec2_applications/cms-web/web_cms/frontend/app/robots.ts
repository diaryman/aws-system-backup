import { MetadataRoute } from "next";
import { headers } from "next/headers";
import { detectSite, DATAGOV_URL, PDPA_URL } from "@/lib/siteConfig";

export const dynamic = "force-dynamic";

export default async function robots(): Promise<MetadataRoute.Robots> {
    const headersList = await headers();
    const host = headersList.get("host") || "";
    const isPDPA = detectSite(host) === "pdpa";
    const baseUrl = host ? `http://${host}` : (isPDPA ? PDPA_URL : DATAGOV_URL);

    return {
        rules: [
            {
                userAgent: "*",
                allow: [
                    "/",
                    "/news/",
                    "/documents/",
                    "/contact",
                    "/privacy-policy",
                    "/cookie-policy",
                    "/terms-of-use",
                ],
                disallow: [
                    "/admin/",
                    "/api/",
                    "/_next/",
                    "/action/",
                ],
            },
            {
                // Block AI training crawlers (becoming best practice)
                userAgent: ["GPTBot", "ChatGPT-User", "CCBot", "anthropic-ai", "ClaudeBot"],
                disallow: ["/"],
            },
        ],
        sitemap: `${baseUrl}/sitemap.xml`,
        host: baseUrl,
    };
}
