"use client";

import Swal from "sweetalert2";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { fetchAPI } from "@/lib/api";
import { FileText, Edit, Trash2, Plus, Filter, Search, MoreHorizontal, Calendar, Eye } from "lucide-react";
import Link from "next/link";
import { motion } from "motion/react";

// Types
interface Article {
    id: number;
    documentId: string;
    title: string;
    description: string;
    slug: string;
    publishedAt: string;
    domain: string;
    category?: {
        name: string;
    };
}

export default function AdminNewsPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <NewsContent />
        </Suspense>
    );
}

function NewsContent() {
    const searchParams = useSearchParams();
    const siteParam = searchParams.get("site") || "main";
    const siteName = siteParam === "pdpa" ? "PDPA Center" : "DataGOV";
    const targetDomain = siteParam === "pdpa" ? "pdpa.localhost" : "localhost";

    // State
    const [articles, setArticles] = useState<Article[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("all");

    // Fetch data
    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                // Fetch articles with status draft to see latest edits
                const articlesRes = await fetchAPI("/articles", {
                    fields: ["title", "slug", "description", "publishedAt", "domain"],
                    populate: ["category"],
                    sort: ["updatedAt:desc"],
                    status: "draft",
                    _t: Date.now()
                });
                setArticles(articlesRes.data || []);

                // Fetch categories
                const catsRes = await fetchAPI("/categories", {
                    filters: { domain: targetDomain, type: "news" }
                });
                setCategories(catsRes.data || []);
            } catch (error) {
                console.error("Failed to load news data", error);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [targetDomain]);

    // Filter logic
    const filteredArticles = articles.filter(article => {
        const matchesSearch = article.title.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategory === "all" || article.category?.name === selectedCategory;

        // Site filter
        const articleDomain = article.domain || "localhost";
        // PDPA site shows PDPA domain articles. Main site shows localhost (DataGOV) articles.
        const matchesSite = articleDomain === targetDomain;

        return matchesSearch && matchesCategory && matchesSite;
    });

    const handleDelete = async (id: string) => {
        if (!confirm("คุณต้องการลบข่าวนี้ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้")) return;
        try {
            await fetchAPI(`/articles/${id}`, {}, { method: "DELETE" });
            setArticles(articles.filter((a) => a.documentId !== id));
        } catch (error) {
            console.error("Failed to delete article", error);
            Swal.fire({ icon: "error", title: "แจ้งเตือน", text: "ลบข่าวไม่สำเร็จ" });
        }
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-primary font-heading tracking-tight">จัดการข่าวสารและกิจกรรม</h1>
                    <p className="text-gray-400 font-medium">จัดการเนื้อหาข่าวสารสำหรับ {siteName}</p>
                </div>
                <Link
                    href={`/admin/news/new?site=${siteParam}`}
                    className="px-6 py-3 bg-primary text-white rounded-2xl font-bold text-sm flex items-center gap-2 shadow-premium hover:bg-accent transition-all active:scale-95"
                >
                    <Plus size={18} /> สร้างข่าวใหม่
                </Link>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative flex-1 w-full md:max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={20} />
                    <input
                        type="text"
                        placeholder="ค้นหาข่าว..."
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

            {/* Content Table */}
            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gray-50/50 text-left">
                                <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest min-w-[300px]">หัวข้อข่าว</th>
                                <th className="px-6 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest hidden md:table-cell">หมวดหมู่</th>
                                <th className="px-6 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest hidden md:table-cell">ผู้เขียน</th>
                                <th className="px-6 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">วันที่เผยแพร่</th>
                                <th className="px-6 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                // Loading Skeletons
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i}>
                                        <td className="px-8 py-6"><div className="h-4 bg-gray-100 rounded w-3/4 animate-pulse"></div></td>
                                        <td className="px-6 py-6 hidden md:table-cell"><div className="h-4 bg-gray-100 rounded w-1/2 animate-pulse"></div></td>
                                        <td className="px-6 py-6 hidden md:table-cell"><div className="h-4 bg-gray-100 rounded w-1/2 animate-pulse"></div></td>
                                        <td className="px-6 py-6"><div className="h-4 bg-gray-100 rounded w-1/2 animate-pulse"></div></td>
                                        <td className="px-6 py-6"><div className="h-4 bg-gray-100 rounded w-full animate-pulse"></div></td>
                                    </tr>
                                ))
                            ) : filteredArticles.length > 0 ? (
                                filteredArticles.map((article) => (
                                    <tr key={article.id} className="group hover:bg-accent-subtle/30 transition-colors">
                                        <td className="px-8 py-5">
                                            <div className="flex items-start gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-gray-100 flex-shrink-0 flex items-center justify-center text-gray-400 group-hover:bg-white group-hover:text-primary group-hover:shadow-md transition-all">
                                                    <FileText size={20} />
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-gray-800 group-hover:text-primary transition-colors line-clamp-1">{article.title}</h3>
                                                    <p className="text-xs text-gray-400 mt-1 line-clamp-1">{article.description || "ไม่มีรายละเอียด"}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 hidden md:table-cell">
                                            <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-lg text-[10px] font-bold group-hover:bg-white group-hover:shadow-sm transition-all whitespace-nowrap">
                                                {article.category?.name || "ไม่ระบุหมวดหมู่"}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5 hidden md:table-cell">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">
                                                    A
                                                </div>
                                                <span className="text-xs font-medium text-gray-500">Admin</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
                                                <Calendar size={14} className="text-gray-300" />
                                                {new Date(article.publishedAt).toLocaleDateString("th-TH", { day: 'numeric', month: 'short', year: '2-digit' })}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                                <button className="p-2 text-gray-400 hover:text-primary hover:bg-white hover:shadow-sm rounded-xl transition-all" title="ดูตัวอย่าง">
                                                    <Eye size={18} />
                                                </button>
                                                <Link
                                                    href={`/admin/news/edit/${article.documentId}?site=${siteParam}`}
                                                    className="p-2 text-gray-400 hover:text-amber-500 hover:bg-white hover:shadow-sm rounded-xl transition-all"
                                                    title="แก้ไข"
                                                >
                                                    <Edit size={18} />
                                                </Link>
                                                <button
                                                    onClick={() => handleDelete(article.documentId)}
                                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-white hover:shadow-sm rounded-xl transition-all"
                                                    title="ลบ"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="text-center py-20">
                                        <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
                                            <FileText size={40} />
                                        </div>
                                        <h3 className="text-lg font-bold text-gray-400">ไม่พบข้อมูลข่าวสาร</h3>
                                        <p className="text-sm text-gray-300 mt-2">ยังไม่มีข่าวสารในระบบสำหรับ {siteName}</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination (Mock) */}
                <div className="px-8 py-5 border-t border-gray-50 flex justify-between items-center bg-gray-50/30">
                    <p className="text-xs font-bold text-gray-400">แสดง 1-{filteredArticles.length} จาก {filteredArticles.length} รายการ</p>
                    <div className="flex gap-2">
                        <button className="px-3 py-1 rounded-lg bg-white border border-gray-200 text-xs font-bold text-gray-400 hover:bg-primary hover:text-white hover:border-primary transition-all disabled:opacity-50" disabled>ก่อนหน้า</button>
                        <button className="px-3 py-1 rounded-lg bg-white border border-gray-200 text-xs font-bold text-gray-400 hover:bg-primary hover:text-white hover:border-primary transition-all disabled:opacity-50" disabled>ถัดไป</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
