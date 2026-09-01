"use client";

import Link from "next/link";
import Image from "next/image";
import { Calendar, ChevronRight, User } from "lucide-react";
import { fetchAPI, getStrapiMedia } from "@/lib/api";
import React, { useState, useEffect } from "react";
import SpotlightCard from "./SpotlightCard";

export default function ActivitiesSection({ domain = "localhost", initialActivities }: { domain?: string, initialActivities?: any[] }) {
    const [activities, setActivities] = useState<any[]>(initialActivities || []);
    const [loading, setLoading] = useState(!initialActivities || initialActivities.length === 0);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        // If initialActivities is provided, skip fetching
        if (initialActivities && initialActivities.length > 0) {
            setLoading(false);
            return;
        }

        const load = async () => {
            try {
                // Fetch articles specifically for target domain
                const queryParams = {
                    filters: {
                        domain: domain
                    },
                    sort: ["publishedAt:desc"],
                    pagination: { limit: 3 },
                    populate: "*"
                };
                const { data } = await fetchAPI("/articles", queryParams);
                setActivities(data || []);
            } catch (error) {
                console.error("Failed to fetch activities:", error);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [domain, initialActivities]);

    const placeholders = ["from-blue-600 to-indigo-600", "from-indigo-600 to-purple-600", "from-cyan-600 to-blue-600"];

    return (
        <section id="news" className="py-24 section-mixed overflow-hidden scroll-mt-premium">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-16">
                    <div>
                        <span
                            className="font-black tracking-[0.25em] uppercase text-xs mb-3 block"
                            style={{ color: 'var(--accent-color)' }}
                        >
                            Updates & News
                        </span>
                        <h2
                            className="text-4xl md:text-5xl font-black font-heading text-slate-900 dark:text-white tracking-tight"
                        >
                            ข่าวกิจกรรมและประกาศล่าสุด
                        </h2>
                    </div>
                    <div>
                        <Link href="/news?site=main" className="flex items-center gap-2 px-6 py-3 glass border border-gray-200 rounded-2xl text-primary font-bold hover:bg-white transition-all">
                            ดูบทความทั้งหมด <ChevronRight size={18} />
                        </Link>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                    {loading ? (
                        [1, 2, 3].map((i) => (
                            <div key={i} className="bg-white rounded-[2.5rem] h-[400px] animate-pulse border border-gray-100 shadow-sm"></div>
                        ))
                    ) : activities.length > 0 ? (
                        activities.map((item: any, index: number) => {
                            const date = new Date(item.publishedAt).toLocaleDateString('th-TH', {
                                year: 'numeric', month: 'long', day: 'numeric'
                            });

                            const coverImageUrl = item.coverImage?.url
                                ? getStrapiMedia(item.coverImage.url)
                                : null;

                            return (
                                <Link href={`/news/${item.slug}`} key={item.id} className="block">
                                    <SpotlightCard
                                        className="group flex flex-col glass rounded-[2.5rem] border border-white p-4 shadow-premium hover:shadow-accent/10 transition-all duration-500 hover:-translate-y-2 h-full"
                                    >
                                        <div className="relative aspect-[16/10] rounded-[2rem] overflow-hidden mb-6">
                                            {coverImageUrl ? (
                                                <img
                                                    src={coverImageUrl}
                                                    alt={item.title}
                                                    loading="lazy"
                                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                                />
                                            ) : (
                                                <div className={`w-full h-full bg-linear-to-br ${placeholders[index % 3]} flex flex-col items-center justify-center p-8 text-center`}>
                                                    <div className="text-white/20 text-6xl font-black mb-4">DATA</div>
                                                    <div className="text-white font-bold text-lg leading-tight line-clamp-3">{item.title}</div>
                                                </div>
                                            )}
                                            <div className="absolute top-4 left-4">
                                                <span className="px-4 py-1.5 glass-dark text-white rounded-full text-[10px] font-black uppercase tracking-widest backdrop-blur-md border border-white/20">
                                                    {item.category?.name || "Governance"}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="px-4 pb-4 flex flex-col flex-1">
                                            <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest mb-4" style={{ color: 'var(--text-muted)' }}>
                                                <span className="flex items-center gap-1.5" suppressHydrationWarning>
                                                    <Calendar size={14} className="text-accent" /> {date}
                                                </span>
                                                <span className="flex items-center gap-1.5"><User size={14} className="text-accent" style={{ opacity: 0.6 }} /> Admin</span>
                                            </div>

                                            <h3 className="text-xl font-bold font-heading mb-4 group-hover:text-accent transition-colors line-clamp-2 min-h-[3.5rem] leading-tight" style={{ color: 'var(--foreground)' }}>
                                                {item.title}
                                            </h3>

                                            <div className="mt-auto">
                                                <div
                                                    className="inline-flex items-center gap-2 text-accent font-bold text-sm group/btn"
                                                >
                                                    อ่านรายละเอียด
                                                    <div className="w-8 h-8 rounded-full glass border flex items-center justify-center group-hover/btn:bg-accent group-hover/btn:text-white transition-all duration-300" style={{ borderColor: 'var(--accent-subtle)' }}>
                                                        <ChevronRight size={14} />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </SpotlightCard>
                                </Link>
                            );
                        })
                    ) : (
                        <div className="col-span-full py-20 text-center glass rounded-[3rem] border-dashed border-2" style={{ borderColor: 'var(--glass-border)' }}>
                            <p className="font-bold text-xl" style={{ color: 'var(--text-muted)' }}>ไม่พบข้อมูลใหม่ในฐานระบบ</p>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}
