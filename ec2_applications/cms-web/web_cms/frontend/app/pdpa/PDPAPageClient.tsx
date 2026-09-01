"use client";

import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Shield, Download, ArrowRight, CheckCircle2, Users, Database, FileText, Lock, Calendar, ChevronRight, FileCheck, AlertCircle, Clock } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import SpotlightCard from "@/components/SpotlightCard";
import { fetchAPI, getStrapiMedia } from "@/lib/api";
import NewsletterSection from "@/components/NewsletterSection";
import CustomBlock from "@/components/CustomBlock";

interface PDPAPageClientProps {
    navbar: React.ReactNode;
    footer: React.ReactNode;
    siteConfig?: any;
    features?: any[];
    initialArticles?: any[];
    initialDocuments?: any[];
    initialTimeline?: any[];
}

export default function PDPAPageClient({ navbar, footer, siteConfig, features = [], initialArticles = [], initialDocuments = [], initialTimeline = [] }: PDPAPageClientProps) {
    const [articles, setArticles] = useState<any[]>(initialArticles);
    const [documents, setDocuments] = useState<any[]>(initialDocuments);
    const [timelineItems, setTimelineItems] = useState<any[]>(initialTimeline);
    const [loading, setLoading] = useState(false);
    // Defer animations until after hydration to prevent SSR/client mismatch
    const [isMounted, setIsMounted] = useState(false);

    // Only fetch client-side if no initial data was provided (e.g. direct client navigation)
    useEffect(() => {
        setIsMounted(true);
        if (initialArticles.length > 0 || initialDocuments.length > 0 || initialTimeline.length > 0) {
            return; // Data already provided by SSR
        }
        const loadData = async () => {
            setLoading(true);
            try {
                const articlesRes = await fetchAPI("/articles", {
                    filters: { domain: "pdpa.localhost" },
                    sort: ["publishedAt:desc"],
                    pagination: { limit: 3 },
                    populate: ["coverImage", "category"]
                });
                const docsRes = await fetchAPI("/policy-documents", {
                    filters: { domain: "pdpa.localhost" },
                    sort: ["createdAt:desc"],
                    populate: "*"
                });
                const timelineRes = await fetchAPI("/timelines", {
                    filters: { domain: "pdpa.localhost" },
                    sort: ["order:asc"]
                });
                setArticles(articlesRes.data || []);
                setDocuments(docsRes.data || []);
                setTimelineItems(timelineRes.data || []);
            } catch (error) {
                console.error("Failed to fetch PDPA data:", error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [initialArticles.length, initialDocuments.length, initialTimeline.length]);

    // Icons — use CSS variable colour so they follow the active template
    const accentIcon = (Icon: React.ElementType) => (
        <Icon style={{ color: "var(--accent-color)" }} />
    );

    const iconMap: any = {
        Lock: accentIcon(Lock),
        Users: accentIcon(Users),
        Database: accentIcon(Database),
        Shield: accentIcon(Shield),
        FileText: accentIcon(FileText),
        CheckCircle: accentIcon(CheckCircle2),
    };

    const principles = features.length > 0 ? features.map(f => ({
        icon: iconMap[f.icon] || accentIcon(Shield),
        title: f.title,
        text: f.description
    })) : [
        { icon: accentIcon(Lock), title: "Data Security", text: "รักษาความลับและความปลอดภัยของข้อมูลตามมาตรฐานสากล ISO/IEC 27001" },
        { icon: accentIcon(Users), title: "Data Subject Rights", text: "รับรองและคุ้มครองสิทธิของเจ้าของข้อมูลส่วนบุคคลอย่างเคร่งครัดทั้ง 8 ประการ" },
        { icon: accentIcon(Database), title: "Purpose Limitation", text: "เก็บรวบรวมและใช้ข้อมูลเฉพาะตามวัตถุประสงค์ที่แจ้งไว้และจำเป็นต่อการปฏิบัติหน้าที่" },
    ];

    const timeline = timelineItems.length > 0 ? timelineItems.map(t => ({
        year: t.year, title: t.title, desc: t.description
    })) : [
        { year: "2565", title: "เริ่มประกาศใช้นโยบาย", desc: "จัดทำร่างนโยบายคุ้มครองข้อมูลส่วนบุคคลฉบับแรก" },
        { year: "2566", title: "แต่งตั้งเจ้าหน้าที่ DPO", desc: "จัดตั้งทีมงานเฉพาะกิจเพื่อดูแลด้านความเป็นส่วนตัว" },
        { year: "2567", title: "ระบบ ROPA สมบูรณ์", desc: "บันทึกกิจกรรมการประมวลผลข้อมูลครบทุกส่วนงาน" },
        { year: "2568", title: "ยกระดับสู่มาตรฐานสากล", desc: "ผ่านการประเมินความมั่นคงปลอดภัยไซเบอร์ระดับดีเยี่ยม" },
    ];

    /* ─── Section Order ───────────────────────────────────────────────── */
    const DEFAULT_PDPA_ORDER = ["hero", "principles", "timeline", "news", "documents", "dpo_contact", "newsletter"];
    const sectionOrder: any[] = siteConfig?.sectionOrder || DEFAULT_PDPA_ORDER;
    const toggles = siteConfig?.sectionToggles || {};
    const visibleSections = sectionOrder.filter((item: any) => {
        const key = typeof item === "string" ? item : item.id;
        return toggles[key] !== false;
    });

    /* ─── Section Background Map ──────────────────────────────────────── */
    const getSectionBg = (item: any) => {
        if (typeof item !== "string") {
            return item.bgColor || "transparent";
        }
        const sectionBg: Record<string, string> = {
            hero: "#f8fafc",
            principles: "#ffffff",
            timeline: "#f8fafc",
            news: "#ffffff",
            documents: "#f8fafc",
            dpo_contact: "#0f172a",
            newsletter: "var(--primary-color)",
        };
        return sectionBg[item] || "#ffffff";
    };

    /* ─── Divider Renderer ────────────────────────────────────────────── */
    const renderDivider = (fromBg: string, toBg: string, key: string) => {
        // Light → White (wave)
        if (fromBg === "#f8fafc" && toBg === "#ffffff") {
            return (
                <div key={key} style={{ background: fromBg, lineHeight: 0, overflow: "hidden" }}>
                    <svg viewBox="0 0 1440 80" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" style={{ display: "block", width: "100%", height: 80 }}>
                        <path d="M0,40 C240,80 480,0 720,40 C960,80 1200,10 1440,40 L1440,80 L0,80 Z" fill="#ffffff" />
                    </svg>
                </div>
            );
        }
        // White → Light (diagonal)
        if (fromBg === "#ffffff" && toBg === "#f8fafc") {
            return (
                <div key={key} style={{ background: "#ffffff", lineHeight: 0, overflow: "hidden" }}>
                    <svg viewBox="0 0 1440 70" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" style={{ display: "block", width: "100%", height: 70 }}>
                        <polygon points="0,0 1440,70 1440,70 0,70" fill="#f8fafc" />
                    </svg>
                </div>
            );
        }
        // Light → Light (arc)
        if (fromBg === "#f8fafc" && toBg === "#f8fafc") {
            return null; // Same bg, no divider needed
        }
        // Any → Dark (#0f172a) — multi-layer wave
        if (toBg === "#0f172a") {
            return (
                <div key={key} style={{ background: fromBg, lineHeight: 0, overflow: "hidden" }}>
                    <svg viewBox="0 0 1440 100" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" style={{ display: "block", width: "100%", height: 100 }}>
                        <path d="M0,60 C360,100 720,20 1080,60 C1260,80 1380,50 1440,60 L1440,100 L0,100 Z" fill="#0f172a" opacity="0.4" />
                        <path d="M0,70 C300,30 600,90 900,50 C1100,20 1300,70 1440,70 L1440,100 L0,100 Z" fill="#0f172a" opacity="0.65" />
                        <path d="M0,80 C200,60 500,100 800,75 C1050,55 1250,85 1440,80 L1440,100 L0,100 Z" fill="#0f172a" />
                    </svg>
                </div>
            );
        }
        // Dark → Any (wave out)
        if (fromBg === "#0f172a") {
            return null; // Newsletter follows CTA, no need
        }
        // Any → Primary (multi-layer)
        if (toBg.includes("primary")) {
            return (
                <div key={key} style={{ background: fromBg, lineHeight: 0, overflow: "hidden" }}>
                    <svg viewBox="0 0 1440 100" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" style={{ display: "block", width: "100%", height: 100 }}>
                        <path d="M0,55 C360,100 720,20 1080,60 C1260,80 1380,45 1440,55 L1440,100 L0,100 Z" fill="var(--primary-color)" opacity="0.35" />
                        <path d="M0,68 C300,28 600,95 900,52 C1100,20 1300,72 1440,68 L1440,100 L0,100 Z" fill="var(--primary-color)" opacity="0.65" />
                        <path d="M0,80 C200,58 500,100 800,75 C1060,52 1260,84 1440,80 L1440,100 L0,100 Z" fill="var(--primary-color)" />
                    </svg>
                </div>
            );
        }
        // White → White
        if (fromBg === "#ffffff" && toBg === "#ffffff") {
            return null;
        }
        // Fallback: light arc
        return (
            <div key={key} style={{ background: fromBg, lineHeight: 0, overflow: "hidden" }}>
                <svg viewBox="0 0 1440 80" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" style={{ display: "block", width: "100%", height: 80 }}>
                    <path d="M0,80 C480,0 960,0 1440,80 L1440,80 L0,80 Z" fill={toBg} />
                </svg>
            </div>
        );
    };

    /* ─── Individual Section Renderers ─────────────────────────────── */
    const renderHero = () => (
        <section className="relative pt-[calc(10rem+44px)] pb-24 overflow-hidden" style={{ background: "#f8fafc" }}>
            <div className="absolute inset-0 z-0">
                {/* Ambient glow blobs — use accent colour */}
                <motion.div
                    animate={{ x: [0, 50, 0], y: [0, 30, 0] }}
                    transition={{ duration: 15, repeat: Infinity }}
                    className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full blur-[100px]"
                    style={{ background: "var(--accent-glow)" }}
                />
                <motion.div
                    animate={{ x: [0, -50, 0], y: [0, -30, 0] }}
                    transition={{ duration: 18, repeat: Infinity }}
                    className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full blur-[120px]"
                    style={{ background: "var(--accent-subtle)" }}
                />
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                    <motion.div initial={isMounted ? { opacity: 0, x: -30 } : false} animate={isMounted ? { opacity: 1, x: 0 } : {}} transition={{ duration: 0.8 }}>
                        {/* Hero badge */}
                        <span
                            className="px-4 py-1 rounded-full text-[10px] font-black tracking-widest uppercase mb-6 inline-block"
                            style={{ background: "var(--accent-subtle)", color: "var(--accent-color)" }}
                        >
                            Administrative Court Privacy Center
                        </span>

                        {/* Hero headline */}
                        <h1 className="text-5xl md:text-7xl font-black font-heading text-slate-900 leading-tight mb-8 tracking-tighter whitespace-pre-line">
                            {siteConfig?.heroHeadline || (
                                <>การคุ้มครอง <br /><span style={{ color: "var(--accent-color)" }}>ข้อมูลส่วนบุคคล</span> <br />เป็นหน้าที่ของเรา</>
                            )}
                        </h1>

                        <p className="text-xl text-slate-500 mb-10 leading-relaxed font-medium whitespace-pre-line">
                            {siteConfig?.heroSubheadline || "สำนักงานศาลปกครองมุ่งมั่นรักษาความปลอดภัยของข้อมูลเจ้าหน้าที่และประชาชน ตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 เพื่อสร้างความเชื่อมั่นในการใช้บริการยุติธรรมทางปกครอง"}
                        </p>

                        <div className="flex flex-wrap gap-4">
                            <Link
                                href="#documents"
                                className="px-8 py-4 text-white font-bold rounded-2xl shadow-xl transition-all active:scale-95 flex items-center gap-2"
                                style={{ background: "var(--accent-color)" }}
                            >
                                ดาวน์โหลดเอกสาร <Download size={20} />
                            </Link>
                            <Link
                                href="/#contact"
                                className="px-8 py-4 glass font-bold rounded-2xl transition-all flex items-center gap-2 border"
                                style={{ borderColor: "var(--accent-subtle)", color: "var(--primary-color)" }}
                            >
                                ติดต่อเจ้าหน้าที่ DPO
                            </Link>
                        </div>
                    </motion.div>

                    {/* Feature cards grid */}
                    <motion.div
                        initial={isMounted ? { opacity: 0, scale: 0.9 } : false}
                        animate={isMounted ? { opacity: 1, scale: 1 } : {}}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="grid grid-cols-2 gap-4"
                    >
                        <div className="space-y-4 pt-12">
                            <SpotlightCard className="p-8 bg-white rounded-[2.5rem] shadow-premium border" style={{ borderColor: "var(--accent-subtle)" } as any}>
                                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4" style={{ background: "var(--accent-subtle)", color: "var(--accent-color)" }}>
                                    <FileCheck size={28} />
                                </div>
                                <h4 className="font-bold text-slate-800 text-lg mb-1">ROPA</h4>
                                <p className="text-sm text-slate-400">บันทึกกิจกรรมครบ 100%</p>
                            </SpotlightCard>
                            <SpotlightCard className="p-8 text-white rounded-[2.5rem] shadow-premium" style={{ background: "var(--accent-color)" } as any}>
                                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-4 text-white">
                                    <Shield size={28} />
                                </div>
                                <h4 className="font-bold text-lg mb-1 text-white">Secured</h4>
                                <p className="text-sm opacity-80 text-white">ปกป้องข้อมูลอย่างดีเยี่ยม</p>
                            </SpotlightCard>
                        </div>
                        <div className="space-y-4">
                            <SpotlightCard className="p-8 bg-white rounded-[2.5rem] shadow-premium border" style={{ borderColor: "var(--accent-subtle)" } as any}>
                                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4" style={{ background: "var(--accent-subtle)", color: "var(--accent-color)" }}>
                                    <Users size={28} />
                                </div>
                                <h4 className="font-bold text-slate-800 text-lg mb-1">Training</h4>
                                <p className="text-sm text-slate-400">บุคลากรผ่านการอบรมทุกคน</p>
                            </SpotlightCard>
                            <SpotlightCard className="p-8 bg-white rounded-[2.5rem] shadow-premium border" style={{ borderColor: "var(--accent-subtle)" } as any}>
                                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4" style={{ background: "var(--accent-subtle)", color: "var(--accent-color)" }}>
                                    <AlertCircle size={28} />
                                </div>
                                <h4 className="font-bold text-slate-800 text-lg mb-1">Audit</h4>
                                <p className="text-sm text-slate-400">ประเมินผลภายในรายไตรมาส</p>
                            </SpotlightCard>
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    );

    const renderPrinciples = () => (
        <section id="principles" className="py-24 bg-white relative overflow-hidden scroll-mt-32">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-20">
                    <h2 className="text-3xl md:text-5xl font-black font-heading text-slate-900 mb-6 tracking-tight">หลักการปฏิบัติงาน 3 ด้าน</h2>
                    <div className="h-1.5 w-24 mx-auto rounded-full" style={{ background: "var(--accent-color)" }} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {principles.map((p, i) => (
                        <motion.div
                            key={i}
                            initial={isMounted ? { opacity: 0, y: 30 } : false}
                            whileInView={isMounted ? { opacity: 1, y: 0 } : {}}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.2, duration: 0.5 }}
                        >
                            <SpotlightCard
                                className="p-10 rounded-[2.5rem] flex flex-col h-full border"
                                style={{ background: "var(--accent-subtle)", borderColor: "var(--accent-glow)" } as any}
                            >
                                <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-lg mb-6 border" style={{ borderColor: "var(--accent-glow)" }}>
                                    {p.icon}
                                </div>
                                <h4 className="text-xl font-bold text-slate-900 mb-4 font-heading">{p.title}</h4>
                                <p className="text-slate-500 leading-relaxed font-medium">{p.text}</p>
                            </SpotlightCard>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );

    const renderTimeline = () => (
        <section className="py-24" style={{ background: "#f8fafc" }}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-20">
                    <h2 className="text-3xl md:text-5xl font-black font-heading text-slate-900 mb-6 tracking-tight">Roadmap การคุ้มครองข้อมูล</h2>
                    <p className="text-slate-500 font-medium">ความมุ่งมั่นพัฒนาระบบอย่างต่อเนื่องตั้งแต่อดีตจนถึงปัจจุบัน</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
                    {/* Connector line */}
                    <div className="absolute top-1/2 left-0 w-full h-0.5 hidden md:block" style={{ background: "var(--accent-subtle)" }} />

                    {timeline.map((step, i) => (
                        <motion.div
                            key={i}
                            initial={isMounted ? { opacity: 0, y: 20 } : false}
                            whileInView={isMounted ? { opacity: 1, y: 0 } : {}}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.2 }}
                            className="relative z-10 flex flex-col items-center md:items-start"
                        >
                            <div
                                className="w-12 h-12 rounded-full flex items-center justify-center mb-6 shadow-xl text-white"
                                style={{ background: "var(--accent-color)", boxShadow: "0 20px 30px -8px var(--accent-glow)" }}
                            >
                                <Clock size={20} />
                            </div>
                            <div className="font-black text-2xl mb-1" style={{ color: "var(--accent-dark)" }}>{step.year}</div>
                            <h4 className="font-bold text-slate-900 mb-2">{step.title}</h4>
                            <p className="text-sm text-slate-500 text-center md:text-left leading-relaxed">{step.desc}</p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );

    const renderNews = () => (
        <section id="news" className="py-24 bg-white scroll-mt-32">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-16">
                    <div>
                        <span
                            className="font-black tracking-[0.25em] uppercase text-xs mb-3 block"
                            style={{ color: "var(--accent-color)" }}
                        >
                            Updates &amp; Activities
                        </span>
                        <h2 className="text-4xl md:text-5xl font-black font-heading text-slate-900 tracking-tight">กิจกรรมด้านการคุ้มครองข้อมูล</h2>
                    </div>
                    <Link
                        href="/news?site=pdpa"
                        className="flex items-center gap-2 px-6 py-3 glass rounded-2xl font-bold transition-all border"
                        style={{ borderColor: "var(--accent-subtle)", color: "var(--accent-dark)" }}
                    >
                        ดูบทความทั้งหมด <ChevronRight size={18} />
                    </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {loading ? (
                        [1, 2, 3].map(i => <div key={i} className="h-64 bg-gray-50 rounded-[2.5rem] animate-pulse" />)
                    ) : articles.length > 0 ? (
                        articles.map((item, i) => {
                            const coverImageUrl = item.coverImage?.url ? getStrapiMedia(item.coverImage.url) : null;
                            return (
                                <motion.div
                                    key={item.id}
                                    initial={isMounted ? { opacity: 0, y: 20 } : false}
                                    whileInView={isMounted ? { opacity: 1, y: 0 } : {}}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.1 }}
                                >
                                    <Link href={`/news/${item.slug}`} className="block h-full">
                                        <SpotlightCard className="group flex flex-col glass rounded-[2.5rem] border border-white p-6 shadow-premium transition-all duration-500 hover:-translate-y-2 cursor-pointer h-full">
                                            <div className="relative aspect-[16/10] rounded-[2rem] overflow-hidden mb-6" style={{ background: "var(--accent-subtle)" }}>
                                                {coverImageUrl ? (
                                                    <img
                                                        src={coverImageUrl}
                                                        alt={item.title}
                                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                                        loading="lazy"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center" style={{ background: `linear-gradient(135deg, var(--primary-color), var(--accent-dark))` }}>
                                                        <div className="text-white/20 text-4xl font-black mb-4 uppercase">PDPA</div>
                                                        <div className="text-white font-bold text-sm leading-tight line-clamp-2">{item.title}</div>
                                                    </div>
                                                )}
                                                <div className="absolute top-4 left-4">
                                                    <div className="inline-block px-4 py-1.5 glass-dark text-white rounded-full text-[10px] font-black uppercase tracking-wider backdrop-blur-md border border-white/20">
                                                        {item.category?.name || "News"}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4" suppressHydrationWarning>
                                                <Calendar size={14} style={{ color: "var(--accent-color)" }} />
                                                {new Date(item.publishedAt).toLocaleDateString('th-TH')}
                                            </div>
                                            <h3
                                                className="text-xl font-bold text-slate-900 transition-colors mb-6 flex-1 line-clamp-2"
                                                style={{ ["--hover-color" as any]: "var(--accent-color)" }}
                                            >
                                                {item.title}
                                            </h3>
                                            <div className="flex items-center gap-2 font-bold text-sm" style={{ color: "var(--accent-color)" }}>
                                                อ่านรายละเอียด <ChevronRight size={14} />
                                            </div>
                                        </SpotlightCard>
                                    </Link>
                                </motion.div>
                            );
                        })
                    ) : (
                        <div className="col-span-full py-10 text-center opacity-50">ไม่พบกิจกรรมในระบบ</div>
                    )}
                </div>
            </div>
        </section>
    );

    const renderDocuments = () => (
        <section id="documents" className="py-24 scroll-mt-32" style={{ background: "#f8fafc" }}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-16">
                    <div className="max-w-xl">
                        <h2 className="text-4xl font-black font-heading text-slate-900 mb-6 tracking-tight">ศูนย์รวมเอกสาร PDPA</h2>
                        <p className="text-slate-500 leading-relaxed font-medium">ดาวน์โหลดเอกสารประกาศ นโยบาย และแบบฟอร์มเพื่อการใช้สิทธิสำหรับบุคลากรและประชาชนทั่วไป</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {loading ? (
                        [1, 2].map(i => <div key={i} className="h-24 bg-white rounded-2xl animate-pulse" />)
                    ) : documents.length > 0 ? (
                        documents.map((doc, i) => (
                            <motion.div
                                key={doc.id}
                                initial={isMounted ? { opacity: 0, y: 15 } : false}
                                whileInView={isMounted ? { opacity: 1, y: 0 } : {}}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.05 }}
                            >
                                <a
                                    href={(doc.file?.url ? getStrapiMedia(doc.file.url) : undefined) ?? "#"}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block"
                                >
                                    <motion.div
                                        whileHover={{ x: 10 }}
                                        className="flex items-center justify-between p-6 bg-white rounded-2xl border border-slate-100 shadow-sm group transition-all cursor-pointer"
                                        style={{ ["--hover-border" as any]: "var(--accent-subtle)" }}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div
                                                className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-all"
                                                style={{ background: "var(--accent-subtle)", color: "var(--accent-color)" }}
                                            >
                                                <FileText size={20} />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-800 transition-colors uppercase text-sm tracking-tight group-hover:text-accent"
                                                    style={{ ["--accent" as any]: "var(--accent-color)" }}>
                                                    {doc.title}
                                                </h4>
                                                <p className="text-[10px] text-slate-400 font-black uppercase mt-1 tracking-widest">{doc.category} • {doc.year}</p>
                                            </div>
                                        </div>
                                        <div
                                            className="p-2 rounded-lg text-slate-400 transition-all"
                                            style={{ background: "var(--accent-subtle)" }}
                                        >
                                            <Download size={18} style={{ color: "var(--accent-color)" }} />
                                        </div>
                                    </motion.div>
                                </a>
                            </motion.div>
                        ))
                    ) : (
                        <div className="col-span-full py-10 text-center opacity-50">ไม่พบเอกสารในระบบ</div>
                    )}
                </div>
            </div>
        </section>
    );

    const renderDPOContact = () => (
        <section className="py-24 bg-slate-900 overflow-hidden relative">
            <div className="absolute top-0 right-0 p-20 opacity-10" style={{ color: "var(--accent-color)" }}>
                <Shield size={300} />
            </div>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div
                    className="rounded-[4rem] p-12 md:p-20 flex flex-col md:flex-row items-center justify-between gap-12 text-center md:text-left shadow-2xl"
                    style={{ background: "var(--accent-color)", boxShadow: "0 40px 80px -20px var(--accent-glow)" }}
                >
                    <div className="max-w-2xl">
                        <h2 className="text-4xl md:text-6xl font-black font-heading text-white mb-6 tracking-tighter">มีข้อสงสัยด้านข้อมูล?</h2>
                        <p className="text-white/80 text-xl font-medium leading-relaxed">
                            คุณสามารถติดต่อเจ้าหน้าที่คุ้มครองข้อมูลส่วนบุคคล (DPO)
                            ของสำนักงานศาลปกครองได้โดยตรงผ่านช่องทางเจ้าหน้าทีเฉพาะกิจ{siteConfig?.dpoPhone ? ` หรือโทร ${siteConfig.dpoPhone}` : ""}
                        </p>
                    </div>
                    <Link
                        href="/#contact"
                        className="px-12 py-5 bg-white font-black rounded-3xl shadow-2xl shadow-black/20 hover:bg-slate-50 transition-all active:scale-95 whitespace-nowrap"
                        style={{ color: "var(--accent-color)" }}
                    >
                        ติดต่อเจ้าหน้าที่ DPO
                    </Link>
                </div>
            </div>
        </section>
    );

    const renderNewsletter = () => (
        <NewsletterSection domain="pdpa.localhost" siteName="PDPA Center" />
    );

    /* ─── Section Renderer ──────────────────────────────────────────── */
    const renderSection = (item: any) => {
        if (typeof item !== "string") {
            return <CustomBlock data={item} />;
        }
        switch (item) {
            case "hero": return renderHero();
            case "principles": return renderPrinciples();
            case "timeline": return renderTimeline();
            case "news": return renderNews();
            case "documents": return renderDocuments();
            case "dpo_contact": return renderDPOContact();
            case "newsletter": return renderNewsletter();
            default: return null;
        }
    };

    return (
        <main className="min-h-screen bg-[#f8fafc]" style={{ "--selection-bg": "var(--accent-subtle)" } as React.CSSProperties}>
            {navbar}

            {/* Dynamic Section Rendering based on sectionOrder */}
            {visibleSections.map((sectionItem: any, idx: number) => {
                const elements = [];
                const sectionKey = typeof sectionItem === "string" ? sectionItem : sectionItem.id;
                const curBg = getSectionBg(sectionItem);

                // Add divider between previous section and this one
                if (idx > 0) {
                    const prevBg = getSectionBg(visibleSections[idx - 1]);
                    const divider = renderDivider(prevBg, curBg, `divider-${idx}`);
                    if (divider) elements.push(divider);
                }

                // Add section content
                elements.push(
                    <div key={`section-${sectionKey}`}>
                        {renderSection(sectionItem)}
                    </div>
                );

                return elements;
            })}

            {footer}
        </main>
    );
}
