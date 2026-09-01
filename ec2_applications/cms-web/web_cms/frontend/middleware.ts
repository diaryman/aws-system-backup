import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Detect which site a request belongs to.
 * Reads PDPA/DataGOV ports from environment variables so it works
 * identically in local dev and on production servers.
 */
function detectSiteFromHost(host: string): "pdpa" | "datagov" {
    // Derive ports from public env vars (available at build time for middleware)
    const pdpaUrl = process.env.NEXT_PUBLIC_PDPA_URL || "";
    const datagovUrl = process.env.NEXT_PUBLIC_DATAGOV_URL || "";

    const extractPort = (url: string) => {
        try { return new URL(url).port; } catch { return ""; }
    };

    const pdpaPort = extractPort(pdpaUrl) || "3004";
    const datagovPort = extractPort(datagovUrl) || "3002";

    if (host.includes(`:${pdpaPort}`)) return "pdpa";
    if (host.includes(`:${datagovPort}`)) return "datagov";
    if (host.includes("pdpa")) return "pdpa";

    return "datagov";
}

export function middleware(request: NextRequest) {
    const host = request.headers.get('host') || '';
    const url = request.nextUrl.clone();

    const site = detectSiteFromHost(host);
    const isPDPASite = site === "pdpa";
    const isDataGovSite = site === "datagov";

    // 1. If accessing DataGOV and trying to access /pdpa anything → redirect to home
    if (isDataGovSite && url.pathname.startsWith('/pdpa')) {
        url.pathname = '/';
        return NextResponse.redirect(url);
    }

    // 2. If accessing PDPA site
    if (isPDPASite) {
        // Remove redundant /pdpa prefix from URL
        if (url.pathname === '/pdpa') {
            url.pathname = '/';
            return NextResponse.redirect(url);
        }
        if (url.pathname.startsWith('/pdpa/')) {
            url.pathname = url.pathname.replace('/pdpa', '');
            return NextResponse.redirect(url);
        }

        // Root → rewrite to /pdpa
        if (url.pathname === '/') {
            url.pathname = '/pdpa';
            return NextResponse.rewrite(url);
        }

        // /documents → /pdpa/documents
        if (url.pathname.startsWith('/documents')) {
            url.pathname = url.pathname.replace('/documents', '/pdpa/documents');
            return NextResponse.rewrite(url);
        }

        // /contact → /pdpa/contact
        if (url.pathname.startsWith('/contact')) {
            url.pathname = url.pathname.replace('/contact', '/pdpa/contact');
            return NextResponse.rewrite(url);
        }

        // Set ?site=pdpa for shared pages
        if (!url.searchParams.has('site') && !url.pathname.startsWith('/admin') && !url.pathname.match(/\.(.*)$/)) {
            url.searchParams.set('site', 'pdpa');
            return NextResponse.rewrite(url);
        }
    } else if (isDataGovSite) {
        // Set ?site=main for DataGOV pages
        if (!url.searchParams.has('site') && !url.pathname.startsWith('/admin') && !url.pathname.match(/\.(.*)$/)) {
            url.searchParams.set('site', 'main');
            return NextResponse.rewrite(url);
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
    ],
};
