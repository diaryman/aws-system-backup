import { fetchAPI, getStrapiMedia } from "@/lib/api";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import NewsTicker from "@/components/NewsTicker";
import { notFound } from "next/navigation";
import DocumentViewerClient from "./DocumentViewerClient";

export async function generateMetadata(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    let doc = null;

    try {
        const res = await fetchAPI(`/policy-documents/${params.id}`, {
            populate: ["file"],
        });
        doc = res.data;
    } catch (e) {
        try {
            const res = await fetchAPI(`/policies/${params.id}`, {
                populate: ["file"],
            });
            doc = res.data;
        } catch (e2) {
            // Both failed
        }
    }

    if (!doc) return { title: "ไม่พบเอกสาร" };

    return {
        title: `${doc.title} | ดูเอกสาร`,
        description: doc.description || "เปิดอ่านเอกสารเผยแพร่ออนไลน์",
    };
}

export default async function DocumentViewerPage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    let doc = null;
    let res = null;

    try {
        res = await fetchAPI(`/policy-documents/${params.id}`, {
            populate: ["file"],
        });
        doc = res.data;
    } catch (e) {
        try {
            res = await fetchAPI(`/policies/${params.id}`, {
                populate: ["file"],
            });
            doc = res.data;
        } catch (e2) {
            notFound();
        }
    }

    if (!doc) notFound();

    const domain = doc.domain || "localhost";
    const fileUrl = doc.file?.url ? getStrapiMedia(doc.file.url) : null;
    // Proxy URL for iframe (same-origin avoids X-Frame-Options issues)
    const proxyFileUrl = doc.file?.url ? `/api/files${doc.file.url}` : null;
    const isPdf = doc.file?.mime === "application/pdf";

    // Fetch site config for navbar
    let announcement, notifications;
    try {
        const config = await fetchAPI("/site-configs", { filters: { domain } });
        const siteConfig = config.data?.[0];
        announcement = siteConfig?.announcement;
        notifications = siteConfig?.notifications;
    } catch (e) {
        console.error("Error fetching site config", e);
    }

    return (
        <main className="min-h-screen bg-[#f8fafc]">
            <NewsTicker domain={domain} announcement={announcement} notifications={notifications} />
            <Navbar domain={domain} />

            <div className="pt-[calc(8rem+44px)] pb-16">
                <DocumentViewerClient
                    title={doc.title}
                    description={doc.description}
                    category={doc.category}
                    year={doc.year}
                    fileUrl={fileUrl}
                    proxyFileUrl={proxyFileUrl}
                    isPdf={isPdf}
                    fileName={doc.file?.name || doc.title}
                    fileSize={doc.file?.size}
                    domain={domain}
                />
            </div>

            <Footer domain={domain} />
        </main>
    );
}
