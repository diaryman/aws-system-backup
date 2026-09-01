import qs from "qs";

export const INTERNAL_STRAPI_URL = process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL || "http://127.0.0.1:1337";
export const PUBLIC_STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || "http://127.0.0.1:1337";

export function getStrapiURL(path = "") {
    const isServer = typeof window === "undefined";
    const strapiUrl = isServer ? INTERNAL_STRAPI_URL : PUBLIC_STRAPI_URL;
    return `${strapiUrl}${path}`;
}

/**
 * Get public Strapi URL for media/images.
 *
 * NOTE: We now proxy /uploads/ through next.config.ts rewrites,
 * so in most cases (for <img> tags), we should just return the relative path.
 * This makes the site "Zero Config" regardless of IP changes.
 */
export function getStrapiMedia(url: string | null) {
    if (url == null) return null;
    if (url.startsWith("http") || url.startsWith("//")) return url;
    // Proxy handles /uploads via next.config.ts rewrites
    return url;
}

/**
 * Get public Strapi full URL if absolutely needed (e.g. for sharing / OG meta)
 */
export function getPublicStrapiURL(): string {
    if (typeof window !== "undefined") {
        const hostname = window.location.hostname;
        // If local dev, keep as-is from env
        if (hostname === "localhost" || hostname === "127.0.0.1") {
            return process.env.NEXT_PUBLIC_STRAPI_URL || "http://localhost:1337";
        }
        // Production: derive from current hostname (IP or domain)
        return `${window.location.protocol}//${hostname}:1337`;
    }
    // Server-side: fallback to env (which might be hardcoded old IP, but it's better than nothing for OG tags)
    // Actually, on server we don't know the public IP/Hostname easily without the request headers.
    return process.env.NEXT_PUBLIC_STRAPI_URL || "http://localhost:1337";
}

export async function fetchAPI(
    path: string,
    urlParamsObject = {},
    options: RequestInit & { revalidate?: number | false } = {}
) {
    const { revalidate, ...restOptions } = options;

    const isServer = typeof window === "undefined";
    const useCache = isServer && revalidate !== false;

    // Build query string
    const queryString = qs.stringify(urlParamsObject, {
        encodeValuesOnly: true,
    });
    const apiPath = `${path}${queryString ? `?${queryString}` : ""}`;

    let requestUrl: string;
    let mergedOptions: RequestInit;

    if (isServer) {
        // SERVER-SIDE: call Strapi directly with the API token
        requestUrl = `${INTERNAL_STRAPI_URL}/api${apiPath}`;
        mergedOptions = {
            headers: {
                "Content-Type": "application/json",
                ...(process.env.STRAPI_API_TOKEN ? { Authorization: `Bearer ${process.env.STRAPI_API_TOKEN}` } : {}),
            },
            ...(useCache ? { cache: 'force-cache' } : { cache: 'no-store' }),
            next: {
                tags: ["strapi-data"],
                ...(typeof revalidate === "number" ? { revalidate } : {})
            },
            ...restOptions,
        };
    } else {
        // CLIENT-SIDE (Browser): route through the Next.js API proxy
        // The proxy at /api/strapi/[...path] will attach the STRAPI_API_TOKEN server-side
        requestUrl = `/api/strapi${apiPath}`;
        mergedOptions = {
            headers: {
                "Content-Type": "application/json",
            },
            cache: 'no-store',
            ...restOptions,
        };
    }

    // Trigger API call
    try {
        const response = await fetch(requestUrl, mergedOptions);

        // Handle response
        if (!response.ok) {
            console.error(`API Error (${response.status}): ${response.statusText} at ${requestUrl}`);
            const errorText = await response.text();
            console.error(`Error details: ${errorText}`);
            throw new Error(`API returned ${response.status}: ${response.statusText}`);
        }
        // Handle 204 No Content (e.g. successful DELETE)
        if (response.status === 204) {
            return { data: null };
        }

        const data = await response.json();
        return data;
    } catch (error: any) {
        console.error(`Fetch failed for URL: ${requestUrl}`);
        console.error(`Error name: ${error.name}, Message: ${error.message}`);
        if (error.message.startsWith("API returned ")) {
            throw error;
        }
        throw new Error(`Fetch failed for ${requestUrl}. Is Strapi running? Details: ${error.message}`);
    }
}
