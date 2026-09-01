import { fetchAPI } from "@/lib/api";
import NavbarClient from "./NavbarClient";
import { isPDPADomain, getCrossSiteURL } from "@/lib/siteConfig";

export default async function Navbar({ domain = "localhost" }: { domain?: string }) {
    // Fetch site config (Server Side)
    let siteName = isPDPADomain(domain) ? "PDPA Center" : "DataGOV";
    let navItems = undefined;
    let headerStyle = "style-1";
    let navbarMenuStyle = "pill";

    if (isPDPADomain(domain)) {
        navItems = [
            { name: "หน้าแรก", href: "/" },
            { name: "ข่าวกิจกรรม", href: "/news" },
            { name: "DataGOV", href: getCrossSiteURL("main") },
            { name: "นโยบาย/มาตรฐาน", href: "/#principles" },
            { name: "เอกสารเผยแพร่", href: "/documents" },
            { name: "ดาวน์โหลด", href: "/#documents" },
            { name: "ติดต่อเจ้าหน้าที่ DPO", href: isPDPADomain(domain) ? "/contact" : `${getCrossSiteURL("pdpa")}/contact` },
        ];
    }

    try {
        const data = await fetchAPI("/site-configs", {
            filters: {
                domain: domain
            }
        });
        if (data.data?.length > 0) {
            const config = data.data[0];
            siteName = config.siteName;
            if (config.navbarMenu && config.navbarMenu.length > 0) {
                navItems = config.navbarMenu.map((item: any) => ({
                    name: item.label,
                    href: item.href
                }));
            }
            if (config.headerStyle) {
                headerStyle = config.headerStyle;
            }
            if (config.navbarMenuStyle) {
                navbarMenuStyle = config.navbarMenuStyle;
            }
        }
    } catch (e) {
        console.error("Error fetching navbar config", e);
    }

    return <NavbarClient siteName={siteName} navItems={navItems} domain={domain} headerStyle={headerStyle} navbarMenuStyle={navbarMenuStyle} />;
}
