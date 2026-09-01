"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/* ── Helpers ────────────────────────────────────────────────────────────── */

import { hexToRGB, lighten, darken } from "@/lib/themeUtils";
import { getDomainFromWindow, PDPA_DOMAIN, DATAGOV_DOMAIN } from "@/lib/siteConfig";

export function applyThemeFont(font: string) {
    const getFontSet = (f: string) => {
        if (f === 'sarabun') return 'var(--font-sarabun), "Sarabun"';
        if (f === 'kanit') return 'var(--font-kanit), "Kanit"';
        if (f === 'notoSansThai') return 'var(--font-noto-sans-thai), "Noto Sans Thai"';
        return 'var(--font-prompt), "Prompt"';
    };
    const fontFam = getFontSet(font || "prompt");
    document.documentElement.style.setProperty("--font-sans", `${fontFam}, ui-sans-serif, system-ui, sans-serif`);
    document.documentElement.style.setProperty("--font-heading", `${fontFam}, ui-sans-serif, system-ui, sans-serif`);
}

export function applyThemeColors(primary: string, accent: string) {
    const root = document.documentElement;
    const accentRGB = hexToRGB(accent);
    const primaryRGB = hexToRGB(primary);

    root.style.setProperty("--primary-color", primary);
    root.style.setProperty("--accent-color", accent);

    root.style.setProperty("--accent-dark", darken(accent, 0.2));
    root.style.setProperty("--accent-light", lighten(accent, 0.3));
    root.style.setProperty("--accent-subtle", `rgba(${accentRGB}, 0.06)`);
    root.style.setProperty("--accent-glow", `rgba(${accentRGB}, 0.14)`);

    root.style.setProperty("--hero-gradient-from", darken(primary, 0.1));
    root.style.setProperty("--hero-gradient-to", lighten(primary, 0.08));

    root.style.setProperty("--badge-bg", `rgba(${accentRGB}, 0.08)`);
    root.style.setProperty("--badge-text", accent);

    root.style.setProperty("--glass-border", `rgba(${primaryRGB}, 0.08)`);

    root.style.setProperty(
        "--premium-shadow",
        `0 25px 60px -12px rgba(${primaryRGB}, 0.18), 0 0 40px -10px rgba(${accentRGB}, 0.08)`
    );

    root.style.setProperty("--shadow-glow", `0 0 40px -10px rgba(${accentRGB}, 0.5)`);
}

/* ── Component ──────────────────────────────────────────────────────────── */

export default function SiteThemeProvider({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const searchParams = useSearchParams();

    useEffect(() => {
        const port = window.location.port;
        const siteParam = searchParams.get("site");
        const isAdminPage = pathname.startsWith("/admin");

        const isPDPA =
            pathname.startsWith("/pdpa") ||
            getDomainFromWindow() === PDPA_DOMAIN ||
            (isAdminPage && siteParam === "pdpa");

        // Update data-theme attribute for CSS layer
        document.documentElement.setAttribute("data-theme", isPDPA ? "pdpa" : "datagov");

        const targetDomain = isPDPA ? PDPA_DOMAIN : DATAGOV_DOMAIN;

        /** Fetch and apply theme colours from the API */
        const fetchTheme = async () => {
            try {
                const { fetchAPI } = await import("@/lib/api");
                const res = await fetchAPI("/site-configs", {
                    filters: { domain: targetDomain }
                });

                if (res.data && res.data.length > 0) {
                    const config = res.data[0];
                    const colors = config.themeColors;

                    if (colors?.primary && colors?.accent) {
                        applyThemeColors(colors.primary, colors.accent);
                    }
                    if (config.fontFamily) {
                        applyThemeFont(config.fontFamily);
                    }
                }
            } catch (err) {
                console.error("Theme fetch failed:", err);
            }
        };

        // Initial load
        fetchTheme();

        // ── Re-fetch when user switches back to this tab ──────────────────
        // This covers the case where admin saved a new theme in another tab.
        const handleVisibilityChange = () => {
            if (document.visibilityState === "visible") {
                fetchTheme();
            }
        };
        document.addEventListener("visibilitychange", handleVisibilityChange);

        // ── Re-fetch on same-page theme-updated custom event ─────────────
        // Admin page dispatches this after a successful save when both tabs
        // are on the same origin.
        const handleThemeUpdated = (e: Event) => {
            const detail = (e as CustomEvent<{ primary: string; accent: string; fontFamily?: string }>).detail;
            if (detail?.primary && detail?.accent) {
                applyThemeColors(detail.primary, detail.accent);
            }
            if (detail?.fontFamily) {
                applyThemeFont(detail.fontFamily);
            }
            if (!detail?.primary) {
                fetchTheme();
            }
        };
        window.addEventListener("theme-updated", handleThemeUpdated);

        // ── Real-time iframe live preview sync ───────────────────────────
        const handleLivePreview = (e: MessageEvent) => {
            // Only respond to actual live preview sync events
            if (e.data?.type === 'LIVE_PREVIEW_SYNC' && e.data?.payload) {
                const { themeColors, fontFamily } = e.data.payload;
                if (themeColors?.primary && themeColors?.accent) {
                    applyThemeColors(themeColors.primary, themeColors.accent);
                }
                if (fontFamily) {
                    applyThemeFont(fontFamily);
                }
            }
        };
        window.addEventListener('message', handleLivePreview);

        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            window.removeEventListener("theme-updated", handleThemeUpdated);
            window.removeEventListener('message', handleLivePreview);
        };
        // Re-run when site param changes (admin switching DataGOV ↔ PDPA)
    }, [pathname, searchParams]);

    return <>{children}</>;
}
