"use server";

import { revalidatePath, revalidateTag } from "next/cache";

const STRAPI_URL = process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL || "http://127.0.0.1:1337";
const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN;

export async function updateArticle(documentId: string, data: any) {
    if (!STRAPI_TOKEN) {
        throw new Error("STRAPI_API_TOKEN is not configured on the server");
    }

    try {
        const response = await fetch(`${STRAPI_URL}/api/articles/${documentId}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${STRAPI_TOKEN}`,
            },
            body: JSON.stringify({ data }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Update Article failed:", errorText);
            let errorMessage = `Failed to update article: ${response.status} ${response.statusText}`;
            try {
                const errorJson = JSON.parse(errorText);
                console.error("Detailed Strapi Error:", JSON.stringify(errorJson, null, 2));
                if (errorJson.error && errorJson.error.message) {
                    errorMessage += ` - ${errorJson.error.message}`;
                    if (errorJson.error.details && errorJson.error.details.errors) {
                        const details = errorJson.error.details.errors.map((e: any) => `${e.path}: ${e.message}`).join(", ");
                        errorMessage += ` (${details})`;
                    }
                }
            } catch (e) {
                // Not JSON
            }
            throw new Error(errorMessage);
        }

        const result = await response.json();

        // Revalidate the articles list and the specific article page if needed
        revalidatePath("/admin/news");
        revalidatePath(`/admin/news/edit/${documentId}`);
        // @ts-ignore
        revalidateTag("strapi-data");

        return result;
    } catch (error: any) {
        console.error("Server Action updateArticle error:", error);
        throw error;
    }
}

export async function createArticle(data: any) {
    if (!STRAPI_TOKEN) {
        throw new Error("STRAPI_API_TOKEN is not configured on the server");
    }

    try {
        const response = await fetch(`${STRAPI_URL}/api/articles`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${STRAPI_TOKEN}`,
            },
            body: JSON.stringify({ data }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Create Article failed:", errorText);
            let errorMessage = `Failed to create article: ${response.status} ${response.statusText}`;
            try {
                const errorJson = JSON.parse(errorText);
                console.error("Detailed Strapi Error:", JSON.stringify(errorJson, null, 2));
                if (errorJson.error && errorJson.error.message) {
                    errorMessage += ` - ${errorJson.error.message}`;
                    if (errorJson.error.details && errorJson.error.details.errors) {
                        const details = errorJson.error.details.errors.map((e: any) => `${e.path}: ${e.message}`).join(", ");
                        errorMessage += ` (${details})`;
                    }
                }
            } catch (e) {
                // Not JSON
            }
            throw new Error(errorMessage);
        }

        const result = await response.json();
        revalidatePath("/admin/news");
        // @ts-ignore
        revalidateTag("strapi-data");
        return result;
    } catch (error: any) {
        console.error("Server Action createArticle error:", error);
        throw error;
    }
}

/**
 * trackArticleView — fire-and-forget (never throws).
 * Called from article page's Server Component on each request.
 * Increments viewCount on the Strapi article via the custom POST /view route.
 */
export async function trackArticleView(documentId: string): Promise<void> {
    if (!documentId) return;
    try {
        await fetch(`${STRAPI_URL}/api/articles/${documentId}/view`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            cache: "no-store",
        });
    } catch (err) {
        // Tracking failure must never break page rendering
        console.warn("[trackArticleView] Failed silently:", err);
    }
}
