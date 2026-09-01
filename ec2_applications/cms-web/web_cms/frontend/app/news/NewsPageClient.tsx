"use client";

import Link from "next/link";
import { fetchAPI, getStrapiMedia } from "@/lib/api";
import { Calendar, ChevronRight, ChevronLeft, Search, User, Filter } from "lucide-react";
import { motion } from "motion/react";
import React, { useState, useEffect } from "react";
import Breadcrumb from "@/components/Breadcrumb";

export default function NewsPageClient({
    header,
    footer,
    searchParams,
    domain = "localhost",
    initialArticles = [],
    initialCategories = [],
    initialMeta = null
}: {
    header: React.ReactNode;
    footer: React.ReactNode;
    searchParams: { page?: string; q?: string; site?: string };
    domain?: string;
    initialArticles?: any[];
    initialCategories?: any[];
    initialMeta?: any;
}) {
    const [articles, setArticles] = useState<any[]>(initialArticles);
    const [categories, setCategories] = useState<any[]>(initialCategories);
    const [meta, setMeta] = useState<any>(initialMeta);
    const [loading, setLoading] = useState(false);

    const [params, setParams] = useState<{ page: number; q: string }>({ page: Number(searchParams.page) || 1, q: searchParams.q || "" });
    const [selectedCategory, setSelectedCategory] = useState("ทั้งหมด");
    const prevInitialArticles = React.useRef(initialArticles);

    // Sync state when props strictly change from SSR navigation
    if (initialArticles !== prevInitialArticles.current) {
        prevInitialArticles.current = initialArticles;
        // Only accept SSR articles if we aren't filtering purely on the client
        if (selectedCategory === "ทั้งหมด") {
            setArticles(initialArticles);
            setMeta(initialMeta);
        }
    }

    useEffect(() => {
        const load = async () => {
            const page = Number(searchParams.page) || 1;
            const q = searchParams.q || "";
            setParams({ page, q });

            // If we are showing ALL categories, the Server Component already fetched exactly what we need
            // So we don't need to re-fetch on the client unless category changed to something else.
            if (selectedCategory === "ทั้งหมด" && initialArticles === prevInitialArticles.current) {
                // Return if articles list is already populated accurately from Server
                if (articles.length > 0 || initialArticles.length === 0) {
                    // Note: We already set articles from props above. No need to fetch.
                    setLoading(false);
                    return;
                }
            }

            setLoading(true);
            try {
                // Fetch Articles
                const filters: any = { domain };
                if (q) filters.title = { $containsi: q };
                if (selectedCategory !== "ทั้งหมด") {
                    filters.category = { name: selectedCategory };
                }

                const { data, meta } = await fetchAPI("/articles", {
                    sort: ["publishedAt:desc"],
                    pagination: { page, pageSize: 9 },
                    populate: "*",
                    filters: filters
                });
                setArticles(data || []);
                setMeta(meta);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [searchParams, selectedCategory, domain]);

    // Placeholder gradients using accent colour — rendered as style
    const placeholderStyle = (index: number) => {
        const opacities = [0.08, 0.12, 0.06];
        return { background: `linear-gradient(135deg, var(--accent-subtle), var(--accent-glow))`, opacity: opacities[index % 3] + 0.5 };
    };

    return (
        <main id="main-content" className="min-h-screen bg-[#fcfdfe]">
            {header}

            {/* Premium Header */}
            <div className="relative pt-[calc(8rem+44px)] pb-24 overflow-hidden">
                {/* Breadcrumb (above header blob) */}
                <div className="absolute top-[calc(8rem+52px)] left-0 right-0 z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <Breadcrumb
                        homeHref="/"
                        homeName={domain === "pdpa.localhost" ? "PDPA Center" : "DataGOV"}
                    />
                </div>
                <div className="absolute inset-0 bg-primary/2 flex items-center justify-center opacity-30 pointer-events-none">
                    <div className="w-[1000px] h-[1000px] bg-accent/10 rounded-full blur-[120px]"></div>
                </div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
                    <motion.span
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-accent font-black tracking-[0.3em] uppercase text-xs mb-4 block"
                    >
                        Public Relations
                    </motion.span>
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-4xl md:text-6xl font-black font-heading text-primary mb-8 tracking-tighter"
                    >
                        ข่าวสารและกิจกรรม
                    </motion.h1>

                    {/* Glass Search bar */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="max-w-2xl mx-auto"
                    >
                        <form className="relative group">
                            <input
                                type="text"
                                name="q"
                                defaultValue={params.q}
                                placeholder="ค้นหาบทความหรือประกาศ..."
                                className="w-full bg-white/70 backdrop-blur-xl border-2 border-transparent focus:border-accent shadow-premium pl-14 pr-32 py-5 rounded-[2.5rem] text-lg font-bold outline-none transition-all placeholder:text-gray-400"
                            />
                            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-accent transition-colors" size={24} />
                            <button className="absolute right-3 top-1/2 -translate-y-1/2 bg-primary text-white px-8 py-3 rounded-full font-bold shadow-lg hover:bg-accent transition-all active:scale-95">
                                ค้นหา
                            </button>
                        </form>
                    </motion.div>
                </div>
            </div>

            {/* Filters / Labels */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 pb-8">
                    <div className="flex flex-wrap items-center gap-6">
                        <button
                            onClick={() => setSelectedCategory("ทั้งหมด")}
                            className={`text-sm font-bold uppercase tracking-widest transition-all ${selectedCategory === "ทั้งหมด" ? 'text-accent border-b-2 border-accent pb-2' : 'text-gray-400 hover:text-primary'}`}
                        >
                            ทั้งหมด
                        </button>
                        {categories.map((cat) => (
                            <button
                                key={cat.id}
                                onClick={() => setSelectedCategory(cat.name)}
                                className={`text-sm font-bold uppercase tracking-widest transition-all ${selectedCategory === cat.name ? 'text-accent border-b-2 border-accent pb-2' : 'text-gray-400 hover:text-primary'}`}
                            >
                                {cat.name}
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-400 bg-gray-100 px-4 py-2 rounded-xl">
                        <Filter size={14} /> FILTER BY DATE
                    </div>
                </div>
            </div>

            {/* News Grid */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-32">
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <div key={i} className="bg-white rounded-[2.5rem] h-[450px] animate-pulse border border-gray-100 shadow-sm"></div>
                        ))}
                    </div>
                ) : articles.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                        {articles.map((item: any, index: number) => {
                            const date = new Date(item.publishedAt).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
                            const coverImageUrl = item.coverImage?.url ? getStrapiMedia(item.coverImage.url) : null;

                            return (
                                <Link href={`/news/${item.slug}?site=${domain === "pdpa.localhost" ? "pdpa" : "main"}`} key={item.id} className="block">
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ delay: index * 0.05 }}
                                        className="group flex flex-col glass rounded-[2.5rem] border border-white p-4 shadow-premium transition-all duration-500 hover:-translate-y-2 h-full"
                                    >
                                        <div className="relative aspect-[16/10] rounded-[2rem] overflow-hidden mb-6">
                                            {coverImageUrl ? (
                                                <img
                                                    src={coverImageUrl}
                                                    alt={item.title}
                                                    loading="lazy"
                                                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                                />
                                            ) : (
                                                <div
                                                    className="w-full h-full flex items-center justify-center font-bold text-white/30 text-4xl"
                                                    style={placeholderStyle(index)}
                                                >
                                                    {domain === "pdpa.localhost" ? "PDPA" : "DataGOV"}
                                                </div>
                                            )}
                                            <div className="absolute top-4 left-4">
                                                <span className="px-4 py-1.5 glass-dark text-white rounded-full text-xs font-bold backdrop-blur-md border border-white/20">
                                                    {item.category?.name || "ข่าวทั่วไป"}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="px-4 pb-4 flex flex-col flex-grow">
                                            <div className="flex items-center gap-4 text-gray-400 text-xs font-bold uppercase tracking-wider mb-4">
                                                <span className="flex items-center gap-1.5" suppressHydrationWarning><Calendar size={14} className="text-accent" /> {date}</span>
                                                <span className="flex items-center gap-1.5"><User size={14} className="text-accent" style={{ opacity: 0.6 }} /> Admin</span>
                                            </div>
                                            <h3 className="text-xl font-bold font-heading text-primary mb-4 group-hover:text-accent transition-colors line-clamp-2 min-h-[3.5rem] leading-tight">
                                                {item.title}
                                            </h3>
                                            <div className="mt-auto">
                                                <div className="inline-flex items-center gap-2 text-accent font-bold text-sm group/btn">
                                                    อ่านรายละเอียด
                                                    <div className="w-8 h-8 rounded-full glass border flex items-center justify-center group-hover/btn:bg-accent group-hover/btn:text-white transition-all duration-300" style={{ borderColor: 'var(--accent-subtle)' }}>
                                                        <ChevronRight size={14} />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                </Link>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-32 bg-white rounded-[3rem] border border-gray-100 shadow-xl">
                        <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-8 border border-gray-100">
                            <Search size={40} className="text-gray-300" />
                        </div>
                        <h3 className="text-2xl font-black text-primary mb-2">ไม่พบรายการที่คุณต้องการ</h3>
                        <p className="text-gray-400 mb-8">ลองเปลี่ยนคำค้นหา หรือใช้คำที่สั้นลง</p>
                        <Link href="/news" className="inline-block bg-primary text-white px-10 py-4 rounded-full font-bold shadow-lg hover:bg-accent transition-all">
                            ล้างข้อมูลการค้นหา
                        </Link>
                    </div>
                )}

                {/* Modern Pagination */}
                {meta?.pagination?.pageCount > 1 && (
                    <div className="mt-20 flex justify-center items-center gap-4">
                        <Link
                            href={`/news?page=${params.page - 1}${params.q ? `&q=${params.q}` : ''}`}
                            className={`w-12 h-12 flex items-center justify-center rounded-2xl glass border border-gray-100 text-primary transition-all ${params.page <= 1 ? 'opacity-30 pointer-events-none' : 'hover:bg-primary hover:text-white'}`}
                        >
                            <ChevronLeft size={20} />
                        </Link>

                        <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-primary">หน้า {params.page} จาก {meta.pagination.pageCount}</span>
                        </div>

                        <Link
                            href={`/news?page=${params.page + 1}${params.q ? `&q=${params.q}` : ''}`}
                            className={`w-12 h-12 flex items-center justify-center rounded-2xl glass border border-gray-100 text-primary transition-all ${params.page >= meta.pagination.pageCount ? 'opacity-30 pointer-events-none' : 'hover:bg-primary hover:text-white'}`}
                        >
                            <ChevronRight size={20} />
                        </Link>
                    </div>
                )}
            </div>

            {footer}
        </main>
    );
}
