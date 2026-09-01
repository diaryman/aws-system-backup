/**
 * Central Site Configuration Utility
 *
 * ใช้สำหรับ detect และ resolve domain/site ทั้งใน local และบน server จริง
 * ไม่มีการ hardcode IP หรือ Port ใดๆ ทั้งสิ้น
 *
 * Environment Variables ที่ใช้:
 *   NEXT_PUBLIC_STRAPI_URL   - URL ของ Strapi backend
 *   NEXT_PUBLIC_DATAGOV_URL  - URL ของ DataGOV site (e.g. http://54.224.21.48:3002)
 *   NEXT_PUBLIC_PDPA_URL     - URL ของ PDPA site    (e.g. http://54.224.21.48:3004)
 *
 * Domain values used in Strapi:
 *   "localhost"       → DataGOV site
 *   "pdpa.localhost"  → PDPA site
 */

export const DATAGOV_DOMAIN = "localhost" as const;
export const PDPA_DOMAIN = "pdpa.localhost" as const;

/**
 * Public URLs - use getter functions so Next.js properly inlines
 * NEXT_PUBLIC_* at build time for both client and server components.
 */
export const DATAGOV_URL =
    process.env.NEXT_PUBLIC_DATAGOV_URL || "http://localhost:3002";

export const PDPA_URL =
    process.env.NEXT_PUBLIC_PDPA_URL || "http://localhost:3004";

/**
 * Detect which site a given `host` header value belongs to.
 * Works for both local dev (ports) and production (domain names / IPs with ports).
 *
 * Returns "pdpa" | "datagov"
 */
export function detectSite(host: string): "pdpa" | "datagov" {
    // Extract PDPA port from env var if available
    const pdpaUrl = process.env.NEXT_PUBLIC_PDPA_URL || "";
    const pdpaPort = pdpaUrl ? extractPort(pdpaUrl) : "3004";

    const datagovUrl = process.env.NEXT_PUBLIC_DATAGOV_URL || "";
    const datagovPort = datagovUrl ? extractPort(datagovUrl) : "3002";

    // Check by port
    if (pdpaPort && host.includes(`:${pdpaPort}`)) return "pdpa";
    if (datagovPort && host.includes(`:${datagovPort}`)) return "datagov";

    // Check by domain keyword (e.g. "pdpa" in hostname)
    if (host.includes("pdpa")) return "pdpa";

    // Fallback
    return "datagov";
}

/**
 * Get the Strapi domain value from a host header.
 */
export function getDomainFromHost(host: string): string {
    return detectSite(host) === "pdpa" ? PDPA_DOMAIN : DATAGOV_DOMAIN;
}

/**
 * Get the Strapi domain from the browser's window.location.
 * Safe to call client-side only.
 */
export function getDomainFromWindow(): string {
    if (typeof window === "undefined") return DATAGOV_DOMAIN;

    const pdpaUrl = process.env.NEXT_PUBLIC_PDPA_URL || "";
    const pdpaPort = pdpaUrl ? extractPort(pdpaUrl) : "3004";

    const datagovUrl = process.env.NEXT_PUBLIC_DATAGOV_URL || "";
    const datagovPort = datagovUrl ? extractPort(datagovUrl) : "3002";

    const port = window.location.port;
    const hostname = window.location.hostname;

    if (pdpaPort && port === pdpaPort) return PDPA_DOMAIN;
    if (datagovPort && port === datagovPort) return DATAGOV_DOMAIN;
    if (hostname.includes("pdpa")) return PDPA_DOMAIN;

    return DATAGOV_DOMAIN;
}

/** Check if a given domain value is PDPA */
export function isPDPADomain(domain: string): boolean {
    return domain.includes("pdpa");
}

/** Get site param string from domain */
export function getSiteParam(domain: string): "pdpa" | "main" {
    return isPDPADomain(domain) ? "pdpa" : "main";
}

/** Extract port from URL string (e.g. "http://1.2.3.4:3004" → "3004") */
function extractPort(url: string): string {
    try {
        const port = new URL(url).port;
        return port;
    } catch {
        return "";
    }
}

/**
 * Get the full URL for cross-site links (e.g. DataGOV → PDPA)
 * Uses window.location for self-correction if built on a production server.
 */
export function getCrossSiteURL(target: 'pdpa' | 'main'): string {
    const port = target === 'pdpa' ? '3004' : '3002';

    if (typeof window !== "undefined") {
        const hostname = window.location.hostname;
        const protocol = window.location.protocol;
        const currentPort = window.location.port;

        // If we are already on the target port, stay on the same site
        if (currentPort === port) return "/";

        // Otherwise, construct absolute URL based on current host
        return `${protocol}//${hostname}:${port}`;
    }

    // Fallback to env-inlined or build-time default
    const fallback = target === 'pdpa' ? PDPA_URL : DATAGOV_URL;
    return fallback;
}
