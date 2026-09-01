"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";
import { useMemo } from "react";

// Maps path segments to Thai display labels
const PATH_LABELS: Record<string, string> = {
    "news": "ข่าวสาร",
    "documents": "เอกสาร",
    "contact": "ติดต่อเรา",
    "privacy-policy": "นโยบายความเป็นส่วนตัว",
    "cookie-policy": "นโยบายคุกกี้",
    "terms-of-use": "ข้อตกลงการใช้งาน",
    "pdpa": "PDPA Center",
    "search": "ค้นหา",
    "sitemap": "แผนผังเว็บไซต์",
};

interface BreadcrumbItem {
    label: string;
    href: string;
    current: boolean;
}

interface BreadcrumbProps {
    /** Optional override for the last segment label (e.g., article title) */
    currentLabel?: string;
    /** Site home href, e.g. "/" or "/pdpa" */
    homeHref?: string;
    /** Site name e.g. "DataGOV" or "PDPA Center" */
    homeName?: string;
    className?: string;
}

export default function Breadcrumb({
    currentLabel,
    homeHref = "/",
    homeName = "DataGOV",
    className = ""
}: BreadcrumbProps) {
    const pathname = usePathname();

    const crumbs = useMemo<BreadcrumbItem[]>(() => {
        const segments = pathname.replace(/^\//, "").split("/").filter(Boolean);

        const items: BreadcrumbItem[] = [
            { label: homeName, href: homeHref, current: false }
        ];

        let accumulated = "";
        segments.forEach((seg, idx) => {
            accumulated += `/${seg}`;
            const isLast = idx === segments.length - 1;
            const label = isLast && currentLabel
                ? currentLabel
                : (PATH_LABELS[seg] || decodeURIComponent(seg).replace(/-/g, " "));

            items.push({
                label,
                href: accumulated,
                current: isLast
            });
        });

        return items;
    }, [pathname, currentLabel, homeHref, homeName]);

    if (crumbs.length <= 1) return null;

    return (
        <nav aria-label="Breadcrumb" className={`flex items-center flex-wrap gap-1 text-sm ${className}`}>
            {/* JSON-LD structured data for SEO */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        "@context": "https://schema.org",
                        "@type": "BreadcrumbList",
                        "itemListElement": crumbs.map((crumb, idx) => ({
                            "@type": "ListItem",
                            "position": idx + 1,
                            "name": crumb.label,
                            "item": crumb.href
                        }))
                    })
                }}
            />

            {crumbs.map((crumb, idx) => (
                <span key={crumb.href} className="flex items-center gap-1">
                    {idx === 0 ? (
                        <Link
                            href={crumb.href}
                            className="flex items-center gap-1 font-semibold transition-opacity hover:opacity-80"
                            style={{ color: "var(--accent-color)" }}
                            aria-label={`กลับ${crumb.label}`}
                        >
                            <Home size={13} />
                            <span className="hidden sm:inline">{crumb.label}</span>
                        </Link>
                    ) : crumb.current ? (
                        <span
                            className="font-bold truncate max-w-[200px] sm:max-w-xs"
                            style={{ color: "var(--foreground)" }}
                            aria-current="page"
                        >
                            {crumb.label}
                        </span>
                    ) : (
                        <Link
                            href={crumb.href}
                            className="font-semibold transition-opacity hover:opacity-80"
                            style={{ color: "var(--accent-color)" }}
                        >
                            {crumb.label}
                        </Link>
                    )}

                    {idx < crumbs.length - 1 && (
                        <ChevronRight size={13} className="text-gray-400 flex-shrink-0" />
                    )}
                </span>
            ))}
        </nav>
    );
}
