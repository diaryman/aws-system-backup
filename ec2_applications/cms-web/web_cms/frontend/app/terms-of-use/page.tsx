import { headers } from "next/headers";
import { fetchAPI } from "@/lib/api";
import { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Home, FileText } from "lucide-react";
import PrintButton from "@/components/PrintButton";

export async function generateMetadata(): Promise<Metadata> {
    const headersList = await headers();
    const host = headersList.get("host") || "localhost";
    let domain = host.includes(":3004") || host.includes("pdpa") ? "pdpa.localhost" : "localhost";
    try {
        const res = await fetchAPI("/site-configs", { filters: { domain } });
        const title = res.data?.[0]?.legalPages?.termsOfUse?.title || "ข้อตกลงการใช้งาน";
        return { title, description: "ข้อตกลงและเงื่อนไขการใช้งานเว็บไซต์" };
    } catch { return { title: "ข้อตกลงการใช้งาน" }; }
}

export default async function TermsOfUsePage() {
    const headersList = await headers();
    const host = headersList.get("host") || "localhost";
    let domain = host.includes(":3004") || host.includes("pdpa") ? "pdpa.localhost" : "localhost";

    let page = { title: "ข้อตกลงการใช้งาน", content: "" };
    let siteName = "DataGOV";
    try {
        const res = await fetchAPI("/site-configs", { filters: { domain } });
        const config = res.data?.[0];
        siteName = config?.siteName || siteName;
        if (config?.legalPages?.termsOfUse) page = config.legalPages.termsOfUse;
    } catch { /* use defaults */ }

    const homeHref = "/";

    return (
        <main id="main-content" className="min-h-screen" style={{ background: "var(--background)" }}>
            <div className="py-16 px-6" style={{ background: "var(--primary-color)" }}>
                <div className="max-w-4xl mx-auto">
                    <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs font-bold mb-6" style={{ color: "rgba(255,255,255,0.6)" }}>
                        <Link href={homeHref} className="hover:text-white transition-colors flex items-center gap-1">
                            <Home size={12} /> {siteName}
                        </Link>
                        <ChevronRight size={12} />
                        <span className="text-white">{page.title}</span>
                    </nav>
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.1)" }}>
                            <FileText size={28} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black font-heading text-white">{page.title}</h1>
                            <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.7)" }}>
                                ปรับปรุงล่าสุด: {new Date().toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" })}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-6 py-12">
                {page.content ? (
                    <div className="prose prose-lg max-w-none legal-content" dangerouslySetInnerHTML={{ __html: page.content }} />
                ) : (
                    <div className="text-center py-20 text-gray-400">
                        <FileText size={48} className="mx-auto mb-4 opacity-30" />
                        <p className="font-bold">ยังไม่มีเนื้อหา</p>
                        <p className="text-sm mt-1">กรุณาเพิ่มเนื้อหาในหน้า Admin → ตั้งค่าเว็บไซต์ → หน้าข้อมูลกฎหมาย</p>
                    </div>
                )}
                <div className="mt-12 pt-8 border-t border-gray-100 flex flex-wrap items-center justify-between gap-4">
                    <Link href={homeHref} className="inline-flex items-center gap-2 font-bold text-sm hover:opacity-80 transition-opacity" style={{ color: "var(--accent-color)" }}>
                        <Home size={16} /> กลับหน้าแรก
                    </Link>
                    <PrintButton label="พิมพ์/บันทึก PDF" />
                </div>
            </div>
        </main>
    );
}
