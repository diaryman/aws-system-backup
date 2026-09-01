"use client";

import Swal from "sweetalert2";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { fetchAPI, getStrapiMedia } from "@/lib/api";
import { Shield, File, Trash2, Plus, Search, Download, Edit } from "lucide-react";
import Link from "next/link";

// Types
interface Document {
    id: number;
    documentId: string;
    title: string;
    description: string;
    publishedAt: string;
    domain: string;
    category: string;
    file?: {
        url: string;
        mime: string;
        size: number;
        name: string;
    };
    coverImage?: {
        url: string;
        name: string;
    };
}

export default function AdminDocumentsPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <DocumentsContent />
        </Suspense>
    );
}

function DocumentsContent() {
    const searchParams = useSearchParams();
    const siteParam = searchParams.get("site") || "main";
    const siteName = siteParam === "pdpa" ? "PDPA Center" : "DataGOV";
    const targetDomain = siteParam === "pdpa" ? "pdpa.localhost" : "localhost";

    const [documents, setDocuments] = useState<Document[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("all");

    // Fetch data
    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                // Fetch Policy Documents
                const docsRes = await fetchAPI("/policy-documents", {
                    fields: ["title", "description", "publishedAt", "domain", "category"],
                    populate: ["file", "coverImage"],
                    sort: ["publishedAt:desc"],
                });
                setDocuments(docsRes.data || []);

                // Fetch categories
                const catsRes = await fetchAPI("/categories", {
                    filters: { domain: targetDomain, type: "document" }
                });
                setCategories(catsRes.data || []);
            } catch (error) {
                console.error("Failed to load documents data", error);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [targetDomain]);

    const filteredDocuments = documents.filter(doc => {
        const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategory === "all" || doc.category === selectedCategory;

        // Site filter
        const docDomain = doc.domain || "localhost";
        const matchesSite = docDomain === targetDomain;

        return matchesSearch && matchesSite && matchesCategory;
    });

    const handleDelete = async (documentId: string) => {
        if (!confirm("คุณต้องการลบเอกสารนี้ใช่หรือไม่?")) return;
        try {
            await fetchAPI(`/policy-documents/${documentId}`, {}, { method: "DELETE" });
            setDocuments(documents.filter(d => d.documentId !== documentId));
        } catch (error) {
            console.error("Error deleting document", error);
            Swal.fire({ icon: "error", title: "แจ้งเตือน", text: "ลบเอกสารไม่สำเร็จ" });
        }
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-primary font-heading tracking-tight">จัดการเอกสารและนโยบาย</h1>
                    <p className="text-gray-400 font-medium">ศูนย์กลางเอกสารราชการสำหรับ {siteName}</p>
                </div>
                <Link
                    href={`/admin/documents/new?site=${siteParam}`}
                    className="px-6 py-3 bg-primary text-white rounded-2xl font-bold text-sm flex items-center gap-2 shadow-premium hover:bg-accent transition-all active:scale-95"
                >
                    <Plus size={18} /> เพิ่มเอกสารใหม่
                </Link>
            </div>

            {/* Toolbar */}
            <div className="bg-white p-4 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative flex-1 w-full md:max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={20} />
                    <input
                        type="text"
                        placeholder="ค้นหาเอกสาร..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-primary/20 outline-none font-medium placeholder:text-gray-300 transition-all"
                    />
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                    <button
                        onClick={() => setSelectedCategory("all")}
                        className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${selectedCategory === "all" ? "bg-primary text-white shadow-lg shadow-primary/20" : "bg-gray-50 text-gray-500 hover:bg-gray-100"}`}
                    >
                        ทั้งหมด
                    </button>
                    {categories.map((cat) => (
                        <button
                            key={cat.id}
                            onClick={() => setSelectedCategory(cat.name)}
                            className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${selectedCategory === cat.name ? "bg-primary text-white shadow-lg shadow-primary/20" : "bg-gray-50 text-gray-500 hover:bg-gray-100"}`}
                        >
                            {cat.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="h-64 bg-gray-50 rounded-[2.5rem] animate-pulse"></div>
                    ))
                ) : filteredDocuments.length > 0 ? (
                    filteredDocuments.map((doc) => (
                        <div key={doc.id} className="group bg-white rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col h-full relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl -translate-y-10 translate-x-10 group-hover:bg-primary/10 transition-colors"></div>

                            {/* Cover Image or Icon Header */}
                            {doc.coverImage ? (
                                <div className="w-full h-40 overflow-hidden rounded-t-[2.5rem] flex-shrink-0">
                                    <img
                                        src={getStrapiMedia(doc.coverImage.url) || ""}
                                        alt={doc.title}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                    />
                                </div>
                            ) : (
                                <div className="w-full h-28 bg-gradient-to-br from-blue-50 to-primary/5 rounded-t-[2.5rem] flex items-center justify-center flex-shrink-0">
                                    <div className="w-14 h-14 bg-white text-blue-500 rounded-2xl flex items-center justify-center shadow-sm group-hover:bg-primary group-hover:text-white transition-all duration-500">
                                        <File size={28} />
                                    </div>
                                </div>
                            )}

                            <div className="p-6 flex flex-col flex-1 gap-4">
                                <div className="flex-1 w-full z-10">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">
                                        {doc.category || "เอกสารทั่วไป"}
                                    </span>
                                    <h3 className="text-lg font-bold text-primary font-heading leading-tight mb-2 line-clamp-2 group-hover:text-accent transition-colors">
                                        {doc.title}
                                    </h3>
                                    <p className="text-xs text-gray-400 line-clamp-3 leading-relaxed">
                                        {doc.description || "ไม่มีรายละเอียดเพิ่มเติมสำหรับเอกสารฉบับนี้"}
                                    </p>
                                </div>

                                <div className="w-full pt-4 border-t border-gray-50 flex justify-between items-center mt-auto z-10">
                                    <span className="text-[10px] font-bold text-gray-300">
                                        {new Date(doc.publishedAt).toLocaleDateString("th-TH", { day: 'numeric', month: 'short', year: '2-digit' })}
                                    </span>
                                    <div className="flex gap-2">
                                        {doc.file ? (
                                            <a
                                                href={getStrapiMedia(doc.file.url) || "#"}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                download
                                                className="p-2 text-primary bg-primary/5 hover:bg-primary hover:text-white rounded-xl transition-all"
                                                title="ดาวน์โหลดเอกสาร"
                                            >
                                                <Download size={16} />
                                            </a>
                                        ) : (
                                            <span className="p-2 text-gray-200 rounded-xl cursor-not-allowed" title="ไม่มีไฟล์แนบ">
                                                <Download size={16} />
                                            </span>
                                        )}
                                        <Link
                                            href={`/admin/documents/edit/${doc.documentId}?site=${siteParam}`}
                                            className="p-2 text-gray-400 bg-gray-50 hover:bg-amber-500 hover:text-white rounded-xl transition-all"
                                            title="แก้ไข"
                                        >
                                            <Edit size={16} />
                                        </Link>
                                        <button
                                            onClick={() => handleDelete(doc.documentId)}
                                            className="p-2 text-gray-400 bg-gray-50 hover:bg-red-500 hover:text-white rounded-xl transition-all"
                                            title="ลบ"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="col-span-full py-20 text-center">
                        <div className="w-20 h-20 bg-gray-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6 text-gray-300">
                            <Shield size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-gray-400 font-heading">ไม่พบเอกสารในระบบ</h3>
                        <p className="text-sm text-gray-300 mt-2">ยังไม่มีเอกสารสำหรับ {siteName}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
