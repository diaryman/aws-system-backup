import ContactPageClient from "./ContactPageClient";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ContactForm from "@/components/ContactForm";
import NewsTicker from "@/components/NewsTicker";
import { fetchAPI } from "@/lib/api";
import { Metadata } from "next";
import { headers } from "next/headers";

export async function generateMetadata(): Promise<Metadata> {
    const headersList = await headers();
    const host = headersList.get("host") || "localhost";
    const isPDPA = host.includes("3004") || host.includes("pdpa");

    return isPDPA
        ? {
            title: "ติดต่อสอบถาม PDPA Center | ศาลปกครอง",
            description: "ช่องทางติดต่อเจ้าหน้าที่คุ้มครองข้อมูลส่วนบุคคล (DPO) และแจ้งเรื่องร้องเรียนด้าน PDPA สำนักงานศาลปกครอง",
        }
        : {
            title: "ติดต่อเรา | DataGOV Admin Court",
            description: "ช่องทางติดต่อสอบถาม ขอใช้ข้อมูล หรือแจ้งเรื่องร้องเรียน ศูนย์กลางธรรมาภิบาลข้อมูล สำนักงานศาลปกครอง",
        };
}

export default async function ContactPage() {
    const headersList = await headers();
    const host = headersList.get("host") || "localhost";
    const isPDPA = host.includes("3004") || host.includes("pdpa");
    const domain = isPDPA ? "pdpa.localhost" : "localhost";

    let announcement = undefined;
    let siteConfig = undefined;

    try {
        const configRes = await fetchAPI("/site-configs", {
            filters: { domain }
        });
        siteConfig = configRes.data?.[0];
        announcement = siteConfig?.announcement;
    } catch (e) {
        console.error("Error fetching announcement", e);
    }

    return (
        <>
            <NewsTicker domain={domain} announcement={announcement} notifications={siteConfig?.notifications} />
            <ContactPageClient
                domain={domain}
                navbar={<Navbar domain={domain} />}
                footer={<Footer domain={domain} />}
                contactForm={<ContactForm domain={domain} />}
                siteConfig={siteConfig}
            />
        </>
    );
}
