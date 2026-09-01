"use client";

import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { FileText, Download, Search, ChevronRight, FileCheck, Shield, BookOpen, Layers } from "lucide-react";
import { fetchAPI, getStrapiMedia } from "@/lib/api";
import SpotlightCard from "@/components/SpotlightCard";

interface DocumentsPageClientProps {
    navbar: React.ReactNode;
    footer: React.ReactNode;
    domain?: string;
}

export default function DocumentsPageClient({ navbar, footer, domain = "localhost" }: DocumentsPageClientProps) {
    const [docs, setDocs] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [filteredDocs, setFilteredDocs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("all");

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                // Fetch Categories
                const catsRes = await fetchAPI("/categories", {
                    filters: { domain, type: "document" }
                });
                setCategories(catsRes.data || []);

                // Fetch Documents
                const { data } = await fetchAPI("/policy-documents", {
                    filters: { domain: domain },
                    sort: ["createdAt:desc"],
                    populate: "*"
                });
                setDocs(data);
                setFilteredDocs(data);
            } catch (error) {
                console.error("Failed to load documents", error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [domain]);

    useEffect(() => {
        let result = docs;

        if (searchQuery) {
            result = result.filter(doc =>
                doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (doc.description && doc.description.toLowerCase().includes(searchQuery.toLowerCase()))
            );
        }

        if (selectedCategory !== "all") {
            result = result.filter(doc => doc.category === selectedCategory);
        }

        setFilteredDocs(result);
    }, [searchQuery, selectedCategory, docs]);

    // All categories use the active theme accent colour — keeps it template-responsive
    const getColor = (_cat: string) => {
        return "";
    };

    const getIcon = (cat: string) => {
        switch (cat) {
            case "Policy": return <Shield size={24} />;
            case "Manual": return <BookOpen size={24} />;
            case "Guideline": return <FileCheck size={24} />;
            case "Standard": return <Layers size={24} />;
            default: return <FileText size={24} />;
        }
    };

    return (
        <main className="min-h-screen bg-[#f8fafc]">
            {navbar}

            <div className="pt-[calc(6rem+44px)] pb-12 bg-white relative overflow-hidden border-b border-gray-100">
                <div className="absolute inset-0 bg-cubes opacity-[0.03]"></div>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <div className="max-w-3xl">
                        <motion.h1
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-4xl md:text-6xl font-black font-heading text-slate-900 mb-6 tracking-tight leading-tight"
                        >
                            ศูนย์รวมเอกสาร <br />
                            <span style={{ color: "var(--accent-color)" }}>เผยแพร่และดาวน์โหลด</span>
                        </motion.h1>
                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="text-lg text-slate-500 font-medium leading-relaxed max-w-2xl"
                        >
                            ค้นหาและดาวน์โหลดเอกสารสำคัญ นโยบาย คู่มือการปฏิบัติงาน และแบบฟอร์มต่างๆ
                            เพื่อสนับสนุนการดำเนินงานด้านธรรมาภิบาลข้อมูลอย่างมีประสิทธิภาพ
                        </motion.p>
                    </div>
                </div>
            </div>

            <div className="py-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 -mt-8">
                {/* Filtration Bar */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white p-4 rounded-3xl shadow-xl border border-gray-100 flex flex-col md:flex-row gap-4 items-center justify-between mb-12"
                >
                    <div className="relative w-full md:max-w-md">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="ค้นหาชื่อเอกสาร หรือรายละเอียด..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-gray-50 rounded-2xl border-none focus:ring-2 outline-none font-medium placeholder:text-gray-400 transition-all text-slate-700"
                        />
                    </div>

                    <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 hide-scrollbar">
                        <button
                            onClick={() => setSelectedCategory("all")}
                            className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all`}
                            style={selectedCategory === "all"
                                ? { background: "var(--accent-color)", color: "#fff", boxShadow: "0 8px 20px -4px var(--accent-glow)" }
                                : { background: "#f9fafb", color: "#6b7280" }
                            }
                        >
                            ทั้งหมด
                        </button>
                        {categories.map((cat) => (
                            <button
                                key={cat.id}
                                onClick={() => setSelectedCategory(cat.name)}
                                className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all`}
                                style={selectedCategory === cat.name
                                    ? { background: "var(--accent-color)", color: "#fff", boxShadow: "0 8px 20px -4px var(--accent-glow)" }
                                    : { background: "#f9fafb", color: "#6b7280" }
                                }
                            >
                                {cat.name}
                            </button>
                        ))}
                    </div>
                </motion.div>

                {/* Documents Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {loading ? (
                        Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="h-48 bg-white rounded-3xl animate-pulse shadow-sm border border-gray-100"></div>
                        ))
                    ) : filteredDocs.length > 0 ? (
                        filteredDocs.map((doc, idx) => {
                            const mediaUrl = doc.file?.url ? getStrapiMedia(doc.file.url) : null;
                            const isPdf = doc.file?.mime === "application/pdf";
                            const viewerUrl = `/documents/${doc.documentId}`;

                            return (
                                <motion.div
                                    key={doc.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                >
                                    <a
                                        href={viewerUrl}
                                        className="block h-full"
                                    >
                                        <SpotlightCard className="group bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col h-full relative overflow-hidden cursor-pointer">
                                            <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                                                {mediaUrl && (
                                                    <span
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            const a = document.createElement("a");
                                                            a.href = mediaUrl;
                                                            a.download = doc.title;
                                                            a.click();
                                                        }}
                                                        className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                                                        style={{ color: "var(--accent-color)" }}
                                                        title="ดาวน์โหลด"
                                                    >
                                                        <Download size={18} />
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex items-start gap-4 mb-4">
                                                <div
                                                    className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300 shadow-sm border"
                                                    style={{ background: "var(--accent-subtle)", color: "var(--accent-color)", borderColor: "var(--accent-glow)" }}
                                                >
                                                    {getIcon(doc.category)}
                                                </div>
                                                <div>
                                                    <span
                                                        className="inline-block px-2.5 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg mb-2"
                                                        style={{ background: "var(--accent-subtle)", color: "var(--accent-color)" }}
                                                    >
                                                        {doc.category}
                                                    </span>
                                                    <h3
                                                        className="font-bold text-slate-800 text-lg leading-tight transition-colors line-clamp-2 group-hover:text-accent"
                                                    >
                                                        {doc.title}
                                                    </h3>
                                                </div>
                                            </div>

                                            <p className="text-sm text-slate-500 mb-6 line-clamp-2 min-h-[2.5rem]">
                                                {doc.description || "รายละเอียดเอกสารฉบับนี้พร้อมให้ดาวน์โหลดเพื่อนำไปใช้ประโยชน์..."}
                                            </p>

                                            <div className="mt-auto pt-4 border-t border-gray-50 flex justify-between items-center text-xs font-bold text-slate-400 uppercase tracking-wider">
                                                <span>{doc.year || new Date().getFullYear()} Edition</span>
                                                <span className="flex items-center gap-1 transition-colors" style={{ color: "var(--accent-color)" }}>
                                                    {isPdf ? "ดูเอกสาร" : "Download"} <ChevronRight size={14} />
                                                </span>
                                            </div>
                                        </SpotlightCard>
                                    </a>
                                </motion.div>
                            );
                        })
                    ) : (
                        <div className="col-span-full py-20 text-center bg-white rounded-[3rem] border border-dashed border-gray-200">
                            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-400">
                                <Search size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-400 font-heading">ไม่พบเอกสารที่ค้นหา</h3>
                            <p className="text-slate-400 mt-2">ลองปรับเปลี่ยนคำค้นหาหรือตัวกรองหมวดหมู่</p>
                        </div>
                    )}
                </div>
            </div>

            {footer}
        </main>
    );
}
