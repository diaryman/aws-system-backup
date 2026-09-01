"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { PUBLIC_STRAPI_URL as STRAPI_URL } from "@/lib/api";

export default function AnalyticsProvider({ domain }: { domain: string }) {
    const pathname = usePathname();

    useEffect(() => {
        // Send page view analytics to Strapi
        const logPageView = async () => {
            try {
                // Avoid logging in dev locally if necessary, but we'll log logic here
                await fetch(`${STRAPI_URL}/api/page-views`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        data: {
                            path: pathname,
                            domain: domain,
                            user_agent: navigator.userAgent,
                            viewed_at: new Date().toISOString()
                        }
                    })
                });
            } catch (error) {
                // Silently fail if analytics service is down
            }
        };

        logPageView();
    }, [pathname, domain]);

    return null;
}
