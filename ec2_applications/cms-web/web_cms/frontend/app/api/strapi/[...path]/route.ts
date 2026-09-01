import { NextRequest, NextResponse } from "next/server";

/**
 * API Proxy for Strapi – allows client-side admin pages to fetch data
 * through the Next.js server, which has access to the STRAPI_API_TOKEN.
 *
 * Usage from browser: fetch("/api/strapi/articles?status=draft")
 * This proxy forwards:  GET http://backend:1337/api/articles?status=draft
 *                        + Authorization: Bearer <token>
 */

const STRAPI_URL = process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL || "http://127.0.0.1:1337";
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN || "";

async function proxyRequest(req: NextRequest, params: Promise<{ path: string[] }>) {
    const { path } = await params;
    const strapiPath = path.join("/");

    // Forward query string as-is
    const { searchParams } = new URL(req.url);
    const qs = searchParams.toString();
    const targetUrl = `${STRAPI_URL}/api/${strapiPath}${qs ? `?${qs}` : ""}`;

    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    };
    if (STRAPI_API_TOKEN) {
        headers["Authorization"] = `Bearer ${STRAPI_API_TOKEN}`;
    }

    const fetchOptions: RequestInit = {
        method: req.method,
        headers,
        cache: "no-store",
    };

    // Forward body for POST/PUT/PATCH
    if (req.method !== "GET" && req.method !== "HEAD") {
        try {
            const body = await req.text();
            if (body) fetchOptions.body = body;
        } catch {
            // no body
        }
    }

    try {
        const response = await fetch(targetUrl, fetchOptions);

        // Clear cache if this was a mutation (POST, PUT, DELETE, PATCH)
        if (req.method !== "GET" && req.method !== "HEAD" && response.ok) {
            try {
                const { revalidateTag, revalidatePath } = require("next/cache");
                revalidateTag("strapi-data");
                revalidatePath("/", "layout");
            } catch (e) {
                console.error("Failed to revalidate:", e);
            }
        }

        // Handle 204 No Content (e.g. successful DELETE) — must not have a body
        if (response.status === 204) {
            return new NextResponse(null, { status: 204 });
        }

        const data = await response.text();

        return new NextResponse(data || null, {
            status: response.status,
            headers: {
                "Content-Type": response.headers.get("Content-Type") || "application/json",
            },
        });
    } catch (error: any) {
        console.error("[Strapi Proxy] Error:", error?.message);
        return NextResponse.json(
            { error: "Failed to connect to Strapi backend", details: error?.message },
            { status: 502 }
        );
    }
}

export async function GET(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
    return proxyRequest(req, context.params);
}

export async function POST(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
    return proxyRequest(req, context.params);
}

export async function PUT(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
    return proxyRequest(req, context.params);
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
    return proxyRequest(req, context.params);
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
    return proxyRequest(req, context.params);
}
