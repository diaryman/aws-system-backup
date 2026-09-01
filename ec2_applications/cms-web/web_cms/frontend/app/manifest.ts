import { MetadataRoute } from "next";
import { headers } from "next/headers";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
    const headersList = await headers();
    const host = headersList.get("host") || "localhost";
    const isPDPA = host.includes("3004") || host.includes("pdpa");

    if (isPDPA) {
        return {
            name: "PDPA ศาลปกครอง",
            short_name: "PDPA",
            description: "การคุ้มครองข้อมูลส่วนบุคคล สำนักงานศาลปกครอง",
            start_url: "/",
            display: "standalone",
            background_color: "#064e3b",
            theme_color: "#10b981",
            lang: "th",
            icons: [
                { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
                { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
            ],
            categories: ["government", "legal"],
        };
    }

    return {
        name: "DataGOV ศาลปกครอง",
        short_name: "DataGOV",
        description: "ศูนย์กลางธรรมาภิบาลข้อมูล สำนักงานศาลปกครอง",
        start_url: "/",
        display: "standalone",
        background_color: "#0c1222",
        theme_color: "#2563eb",
        lang: "th",
        icons: [
            { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
            { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
        ],
        categories: ["government", "productivity"],
    };
}
