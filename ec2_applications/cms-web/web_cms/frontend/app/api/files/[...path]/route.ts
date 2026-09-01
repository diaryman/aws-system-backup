import { NextRequest, NextResponse } from "next/server";

/**
 * File Proxy – streams files from Strapi through Next.js
 * so that PDF iframes can load from the same origin (avoiding X-Frame-Options: SAMEORIGIN).
 *
 * Usage: /api/files/uploads/my-document.pdf
 *   →  proxies from http://backend:1337/uploads/my-document.pdf
 */

const STRAPI_URL = process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL || "http://127.0.0.1:1337";

export async function GET(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
    const { path } = await context.params;
    const filePath = path.join("/");
    const targetUrl = `${STRAPI_URL}/${filePath}`;

    try {
        const response = await fetch(targetUrl, { cache: "no-store" });

        if (!response.ok) {
            return new NextResponse("File not found", { status: response.status });
        }

        const contentType = response.headers.get("Content-Type") || "application/octet-stream";
        const contentLength = response.headers.get("Content-Length");
        const body = response.body;

        const headers: Record<string, string> = {
            "Content-Type": contentType,
            "Cache-Control": "public, max-age=31536000, immutable",
        };
        if (contentLength) {
            headers["Content-Length"] = contentLength;
        }

        return new NextResponse(body, { status: 200, headers });
    } catch (error: any) {
        console.error("[File Proxy] Error:", error?.message);
        return new NextResponse("Failed to fetch file", { status: 502 });
    }
}
