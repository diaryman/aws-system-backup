import ContactPageClient from "@/app/contact/ContactPageClient";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ContactForm from "@/components/ContactForm";
import NewsTicker from "@/components/NewsTicker";
import { fetchAPI } from "@/lib/api";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "ติดต่อสอบถาม PDPA Center | PDPA Admin Court",
    description: "ช่องทางติดต่อเจ้าหน้าที่คุ้มครองข้อมูลส่วนบุคคล (DPO) และแจ้งเรื่องร้องเรียนด้าน PDPA สำนักงานศาลปกครอง",
};

export default async function PDPAContactPage() {
    const domain = "pdpa.localhost";
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
